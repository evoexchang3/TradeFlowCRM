import { storage } from '../storage';
import { twelveDataService } from './twelve-data';
import type { InsertOrder, InsertPosition, Order, Position } from '@shared/schema';
import { getInstrumentConfig, roundToQtyStep, roundToTickSize } from '../config/instruments';

interface PlaceOrderRequest {
  accountId: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity?: string;  // Direct quantity input (legacy)
  margin?: string;    // Margin amount in USD (NEW - preferred)
  price?: string;
  stopLoss?: string;
  takeProfit?: string;
  leverage?: string;
  spread?: string;
  fees?: string;
  initiatorType?: 'client' | 'agent' | 'team_leader' | 'crm_manager' | 'admin' | 'robot' | 'system';
  initiatorId?: string;
}

class TradingEngine {
  async placeOrder(request: PlaceOrderRequest): Promise<Order> {
    const { accountId, symbol, type, side, quantity, margin, price, stopLoss, takeProfit, leverage, spread, fees, initiatorType, initiatorId } = request;

    // Validate order parameters based on type
    if (type === 'limit' && !price) {
      throw new Error('Limit orders require a price');
    }
    if (type === 'stop' && !price) {
      throw new Error('Stop orders require a stop price');
    }
    if (type === 'stop_limit' && !price) {
      throw new Error('Stop-limit orders require both stop and limit prices');
    }

    // Get instrument configuration
    const instrumentConfig = getInstrumentConfig(symbol);
    
    // Validate leverage against instrument max
    const leverageValue = parseFloat(leverage || '1');
    if (leverageValue > instrumentConfig.maxLeverage) {
      throw new Error(`Leverage ${leverageValue} exceeds maximum ${instrumentConfig.maxLeverage} for ${symbol}`);
    }

    // LIVE-ONLY GATE: Check if market is live before accepting orders
    // This prevents trading on stale quotes
    try {
      await twelveDataService.getLiveQuoteOrThrow(symbol);
    } catch (error: any) {
      throw new Error(`Cannot place order: ${error.message}`);
    }

    // Calculate quantity based on input method
    let calculatedQuantity: string;
    let marginUsed: number;
    
    if (margin) {
      // PREFERRED METHOD: Calculate quantity from margin
      // Formula: quantity = (margin × leverage) / (entryPrice × contractMultiplier)
      
      const marginValue = parseFloat(margin);
      const entryPrice = type === 'market' 
        ? (await twelveDataService.getLiveQuoteOrThrow(symbol)).price
        : parseFloat(price || '0');
      
      if (entryPrice === 0) {
        throw new Error('Cannot calculate quantity: entry price is zero');
      }
      
      // Position size = margin × leverage
      const positionSize = marginValue * leverageValue;
      
      // Quantity = positionSize / (entryPrice × contractMultiplier)
      const rawQuantity = positionSize / (entryPrice * instrumentConfig.contractMultiplier);
      
      // Round to instrument's quantity step
      const roundedQuantity = roundToQtyStep(rawQuantity, symbol);
      
      if (roundedQuantity <= 0) {
        throw new Error(`Calculated quantity rounds to zero. Increase margin or check instrument config.`);
      }
      
      calculatedQuantity = roundedQuantity.toString();
      marginUsed = marginValue;
      
      console.log('[TRADING ENGINE] Position sizing from margin:', {
        margin: marginValue,
        leverage: leverageValue,
        positionSize,
        entryPrice,
        contractMultiplier: instrumentConfig.contractMultiplier,
        rawQuantity,
        roundedQuantity: calculatedQuantity,
      });
    } else if (quantity) {
      // LEGACY METHOD: Direct quantity input
      calculatedQuantity = quantity;
      
      // Calculate margin used (reverse calculation)
      const entryPrice = type === 'market' 
        ? (await twelveDataService.getQuote(symbol)).price
        : parseFloat(price || '0');
      
      const positionSize = parseFloat(quantity) * entryPrice * instrumentConfig.contractMultiplier;
      marginUsed = positionSize / leverageValue;
      
      console.log('[TRADING ENGINE] Legacy quantity input - calculated margin:', marginUsed);
    } else {
      throw new Error('Either margin or quantity must be provided');
    }

    // Round price to tick size for limit/stop orders
    const roundedPrice = price ? roundToTickSize(parseFloat(price), symbol).toString() : undefined;

    // Create the order
    const order: InsertOrder = {
      accountId,
      symbol,
      type,
      side,
      quantity: calculatedQuantity,
      price: roundedPrice,
      stopLoss,
      takeProfit,
      leverage: leverage || '1',
      spread: spread || '0',
      fees: fees || '0',
      initiatorType: initiatorType || 'client',
      initiatorId,
      status: type === 'market' ? 'filled' : 'pending',
    };

    console.log('[TRADING ENGINE] Creating order with data:', JSON.stringify(order, null, 2));
    const createdOrder = await storage.createOrder(order);
    console.log('[TRADING ENGINE] Order created successfully:', createdOrder.id);

    // If market order, execute immediately
    if (type === 'market') {
      await this.executeOrder(createdOrder);
    } else {
      // For pending orders, check if they can be executed immediately
      // Re-fetch order to ensure we have the persisted state with correct data types
      const persistedOrder = await storage.getOrder(createdOrder.id);
      if (persistedOrder) {
        await this.checkPendingOrder(persistedOrder);
      }
    }

    // Return fresh order state after potential execution
    return await storage.getOrder(createdOrder.id) || createdOrder;
  }

  async executeOrder(order: Order): Promise<void> {
    // Get current market price
    const quote = await twelveDataService.getQuote(order.symbol);
    const fillPrice = order.side === 'buy' ? (quote.ask || quote.price) : (quote.bid || quote.price);

    // Update order as filled
    await storage.updateOrder(order.id, {
      status: 'filled',
      filledQuantity: order.quantity,
      avgFillPrice: fillPrice.toString(),
      filledAt: new Date(),
    });

    // Get instrument config for contract multiplier
    const instrumentConfig = getInstrumentConfig(order.symbol);
    
    // Calculate margin used for this position
    const quantity = parseFloat(order.quantity);
    const leverage = parseFloat(order.leverage || '1');
    const positionNotional = quantity * fillPrice * instrumentConfig.contractMultiplier;
    const marginUsed = positionNotional / leverage;

    // Create position
    const position: InsertPosition = {
      accountId: order.accountId,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      openPrice: fillPrice.toString(),
      currentPrice: fillPrice.toString(),
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      leverage: order.leverage || '1',
      spread: order.spread || '0',
      fees: order.fees || '0',
      contractMultiplier: instrumentConfig.contractMultiplier.toString(),
      marginMode: 'isolated', // Default to isolated margin
      marginUsed: marginUsed.toString(),
      initiatorType: order.initiatorType || 'client',
      initiatorId: order.initiatorId,
      status: 'open',
    };

    console.log('[TRADING ENGINE] Creating position with data:', JSON.stringify(position, null, 2));
    await storage.createPosition(position);
    console.log('[TRADING ENGINE] Position created successfully');

    // Update account equity and margin
    await this.updateAccountMetrics(order.accountId);
  }

  async updatePositionPnL(position: Position): Promise<Position> {
    // LIVE-ONLY GATE: Check if market is live before updating P/L
    // If not live, return position unchanged (freeze P/L display)
    if (!twelveDataService.isMarketLive(position.symbol)) {
      console.log(`[P/L DEBUG] Market not live for ${position.symbol}, skipping P/L update`);
      return position;
    }

    const quote = await twelveDataService.getQuote(position.symbol);
    
    console.log(`[P/L DEBUG] Position ${position.id} (${position.symbol}):`, {
      quote: { price: quote.price, bid: quote.bid, ask: quote.ask },
      openPrice: position.openPrice,
      quantity: position.quantity,
      side: position.side
    });
    
    // Use bid/ask if available, otherwise use mid price with simulated spread
    let currentPrice: number;
    if (quote.bid && quote.ask) {
      // Use actual bid/ask
      currentPrice = position.side === 'buy' ? quote.bid : quote.ask;
    } else {
      // Simulate spread when bid/ask not available (±0.0001 from mid price)
      const spread = parseFloat(position.spread || '0.0001');
      currentPrice = position.side === 'buy' 
        ? quote.price - (spread / 2)  // For BUY positions, use bid (mid - half spread)
        : quote.price + (spread / 2); // For SELL positions, use ask (mid + half spread)
    }

    const openPrice = parseFloat(position.openPrice);
    const quantity = parseFloat(position.quantity);
    const contractMultiplier = parseFloat(position.contractMultiplier || '1');
    const priceChange = position.side === 'buy' 
      ? currentPrice - openPrice
      : openPrice - currentPrice;

    // Gross P/L with contract multiplier
    const grossPnl = priceChange * quantity * contractMultiplier;
    
    // Deduct fees (open fees are paid, close fees will be paid on close)
    const feesPaid = parseFloat(position.fees || '0');
    const unrealizedPnl = grossPnl - feesPaid;

    console.log(`[P/L DEBUG] Calculated:`, {
      currentPrice,
      openPrice,
      quantity,
      contractMultiplier,
      priceChange,
      grossPnl,
      feesPaid,
      netUnrealizedPnl: unrealizedPnl
    });

    const updated = await storage.updatePosition(position.id, {
      currentPrice: currentPrice.toString(),
      unrealizedPnl: unrealizedPnl.toString(),
    });

    return updated;
  }

  async closePosition(positionId: string, quantity?: string): Promise<Position> {
    const position = await storage.getPosition(positionId);
    if (!position) {
      throw new Error('Position not found');
    }

    const quote = await twelveDataService.getQuote(position.symbol);
    const closePrice = position.side === 'buy' ? (quote.bid || quote.price) : (quote.ask || quote.price);

    const closingQuantity = quantity ? parseFloat(quantity) : parseFloat(position.quantity);
    const openPrice = parseFloat(position.openPrice);
    const contractMultiplier = parseFloat(position.contractMultiplier || '1');
    const priceChange = position.side === 'buy'
      ? closePrice - openPrice
      : openPrice - closePrice;

    // Calculate gross realized P/L with contract multiplier
    const grossRealizedPnl = priceChange * closingQuantity * contractMultiplier;
    
    // Calculate fees: open fees were already paid, now add estimated close fees
    const openFees = parseFloat(position.fees || '0');
    const closeFeeRate = 0.0005; // 0.05% close fee (configurable per instrument later)
    const positionValue = closingQuantity * closePrice * contractMultiplier;
    const closeFees = positionValue * closeFeeRate;
    const totalFees = openFees + closeFees;
    
    // Net realized P/L after all fees
    const realizedPnl = grossRealizedPnl - totalFees;

    console.log('[CLOSE POSITION] P/L Calculation:', {
      symbol: position.symbol,
      openPrice,
      closePrice,
      closingQuantity,
      contractMultiplier,
      grossRealizedPnl,
      openFees,
      closeFees,
      totalFees,
      netRealizedPnl: realizedPnl
    });

    // Get account to update balance
    const account = await storage.getAccount(position.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Update account real balance with realized P/L (trades use real funds)
    const newRealBalance = parseFloat(account.realBalance || '0') + realizedPnl;
    const newTotalBalance = newRealBalance + parseFloat(account.demoBalance || '0') + parseFloat(account.bonusBalance || '0');
    
    await storage.updateAccount(position.accountId, {
      realBalance: newRealBalance.toString(),
      balance: newTotalBalance.toString(),
    });

    // Create transaction record for the realized P/L
    await storage.createTransaction({
      accountId: position.accountId,
      type: realizedPnl >= 0 ? 'profit' : 'loss',
      amount: Math.abs(realizedPnl).toString(),
      fundType: 'real', // Trades use real funds
      status: 'completed',
      reference: `Position ${position.symbol} closed (Gross: $${grossRealizedPnl.toFixed(2)}, Fees: $${totalFees.toFixed(2)})`,
    });

    if (closingQuantity >= parseFloat(position.quantity)) {
      // Close entire position
      const updated = await storage.updatePosition(positionId, {
        status: 'closed',
        currentPrice: closePrice.toString(),
        closePrice: closePrice.toString(),
        realizedPnl: realizedPnl.toString(),
        closedAt: new Date(),
      });

      await this.updateAccountMetrics(position.accountId);
      return updated;
    } else {
      // Partial close - reduce quantity
      const remainingQuantity = parseFloat(position.quantity) - closingQuantity;
      const updated = await storage.updatePosition(positionId, {
        quantity: remainingQuantity.toString(),
        realizedPnl: (parseFloat(position.realizedPnl || '0') + realizedPnl).toString(),
      });

      await this.updateAccountMetrics(position.accountId);
      return updated;
    }
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const order = await storage.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error('Only pending orders can be cancelled');
    }

    return await storage.updateOrder(orderId, { status: 'cancelled' });
  }

  async modifyPosition(positionId: string, updates: { 
    stopLoss?: string; 
    takeProfit?: string;
    openPrice?: string;
    closePrice?: string;
    quantity?: string;
    side?: 'buy' | 'sell';
    unrealizedPnl?: string;
    realizedPnl?: string;
    openedAt?: Date | string;
    closedAt?: Date | string;
  }): Promise<Position> {
    const position = await storage.getPosition(positionId);
    if (!position) {
      throw new Error('Position not found');
    }

    // Get contract multiplier for accurate P/L calculations
    const contractMultiplier = parseFloat(position.contractMultiplier || '1');
    const closeFeeRate = 0.0005; // 0.05% close fee

    // Validation: Prevent manual P/L override when prices are ACTUALLY changed
    // Compare against existing values to avoid false positives when forms submit unchanged values
    const priceFieldsChanged = !!(
      (updates.openPrice && updates.openPrice !== position.openPrice) ||
      (updates.closePrice && updates.closePrice !== position.closePrice) ||
      (updates.quantity && updates.quantity !== position.quantity) ||
      (updates.side && updates.side !== position.side)
    );
    const manualPnlProvided = position.status === 'closed' 
      ? (updates.realizedPnl !== undefined && updates.realizedPnl !== null)
      : (updates.unrealizedPnl !== undefined && updates.unrealizedPnl !== null);
    
    if (priceFieldsChanged && manualPnlProvided) {
      throw new Error('Cannot manually override P/L when also changing prices or quantity. Please use either automatic calculation (change prices) or manual P/L entry, not both.');
    }
    
    // Track if we're doing a manual P/L override (to skip auto-recalculation later)
    let manualPnlOverrideApplied = false;

    // For CLOSED positions: recalculate realized P/L if critical fields change
    if (position.status === 'closed') {
      const shouldRecalculateClosedPnl = priceFieldsChanged;
      
      if (shouldRecalculateClosedPnl) {
        const openPrice = parseFloat(updates.openPrice || position.openPrice);
        const closePrice = parseFloat(updates.closePrice || position.closePrice || position.currentPrice || '0');
        const quantity = parseFloat(updates.quantity || position.quantity);
        const side = updates.side || position.side;
        
        // Calculate price change based on side
        const priceChange = side === 'buy' 
          ? closePrice - openPrice
          : openPrice - closePrice;
        
        // Calculate gross P/L with contract multiplier
        const grossPnl = priceChange * quantity * contractMultiplier;
        
        // Calculate fees from first principles to avoid compounding on repeated edits
        // Open fees: calculated based on opening the position
        const openPositionValue = quantity * openPrice * contractMultiplier;
        const openFees = openPositionValue * closeFeeRate; // 0.05% of open position value
        
        // Close fees: calculated based on closing the position
        const closePositionValue = quantity * closePrice * contractMultiplier;
        const closeFees = closePositionValue * closeFeeRate; // 0.05% of close position value
        
        const totalFees = openFees + closeFees;
        
        // Calculate net realized P/L (gross P/L minus all fees)
        const newRealizedPnl = grossPnl - totalFees;
        const oldRealizedPnl = parseFloat(position.realizedPnl || '0');
        const pnlDifference = newRealizedPnl - oldRealizedPnl;
        
        console.log('[TRADING ENGINE] Closed position P/L recalculation:', {
          positionId,
          symbol: position.symbol,
          side,
          openPrice,
          closePrice,
          quantity,
          contractMultiplier,
          priceChange,
          grossPnl,
          openFees,
          closeFees,
          totalFees,
          oldRealizedPnl,
          newRealizedPnl,
          pnlDifference
        });
        
        // Update the realized P/L (FIXED: use realizedPnl field, not unrealizedPnl)
        updates.realizedPnl = newRealizedPnl.toFixed(8);
        updates.fees = totalFees.toFixed(8);
        
        // Adjust account balance for the P/L difference
        if (pnlDifference !== 0) {
          const account = await storage.getAccount(position.accountId);
          if (account) {
            const currentRealBalance = parseFloat(account.realBalance || '0');
            const newRealBalance = currentRealBalance + pnlDifference;
            
            console.log('[TRADING ENGINE] Adjusting balance for position edit:', {
              accountId: position.accountId,
              oldBalance: currentRealBalance,
              pnlDifference,
              newBalance: newRealBalance
            });
            
            await storage.updateAccount(position.accountId, {
              realBalance: newRealBalance.toFixed(8),
              balance: (
                newRealBalance + 
                parseFloat(account.demoBalance || '0') + 
                parseFloat(account.bonusBalance || '0')
              ).toFixed(8),
            });
            
            // Create transaction record for the balance adjustment
            const transactionType = pnlDifference >= 0 ? 'profit' : 'loss';
            const transactionReference = pnlDifference >= 0
              ? `Position ${position.symbol} edited - P/L increased by $${pnlDifference.toFixed(2)} (Old: $${oldRealizedPnl.toFixed(2)} → New: $${newRealizedPnl.toFixed(2)})`
              : `Position ${position.symbol} edited - P/L decreased by $${Math.abs(pnlDifference).toFixed(2)} (Old: $${oldRealizedPnl.toFixed(2)} → New: $${newRealizedPnl.toFixed(2)})`;
            
            await storage.createTransaction({
              accountId: position.accountId,
              type: transactionType,
              amount: Math.abs(pnlDifference).toFixed(8),
              fundType: 'real',
              status: 'completed',
              reference: transactionReference,
            });
          }
        }
      }
      // Handle manual P/L override for closed positions
      else if (updates.realizedPnl !== undefined && updates.realizedPnl !== null) {
        const oldRealizedPnl = parseFloat(position.realizedPnl || '0');
        const newRealizedPnl = parseFloat(updates.realizedPnl);
        const pnlDifference = newRealizedPnl - oldRealizedPnl;
        
        console.log('[TRADING ENGINE] Manual realized P/L override:', {
          positionId,
          symbol: position.symbol,
          oldRealizedPnl,
          newRealizedPnl,
          pnlDifference,
          status: 'manual_override'
        });
        
        // Adjust account balance for the P/L difference
        if (pnlDifference !== 0) {
          const account = await storage.getAccount(position.accountId);
          if (account) {
            const currentRealBalance = parseFloat(account.realBalance || '0');
            const newRealBalance = currentRealBalance + pnlDifference;
            
            console.log('[TRADING ENGINE] Adjusting balance for manual P/L edit:', {
              accountId: position.accountId,
              oldBalance: currentRealBalance,
              pnlDifference,
              newBalance: newRealBalance,
              type: 'manual_override'
            });
            
            await storage.updateAccount(position.accountId, {
              realBalance: newRealBalance.toFixed(8),
              balance: (
                newRealBalance + 
                parseFloat(account.demoBalance || '0') + 
                parseFloat(account.bonusBalance || '0')
              ).toFixed(8),
            });
            
            // Create transaction record for the manual P/L adjustment
            const transactionType = pnlDifference >= 0 ? 'profit' : 'loss';
            const transactionReference = pnlDifference >= 0
              ? `Position ${position.symbol} P/L manually adjusted +$${pnlDifference.toFixed(2)} (Old: $${oldRealizedPnl.toFixed(2)} → New: $${newRealizedPnl.toFixed(2)})`
              : `Position ${position.symbol} P/L manually adjusted -$${Math.abs(pnlDifference).toFixed(2)} (Old: $${oldRealizedPnl.toFixed(2)} → New: $${newRealizedPnl.toFixed(2)})`;
            
            await storage.createTransaction({
              accountId: position.accountId,
              type: transactionType,
              amount: Math.abs(pnlDifference).toFixed(8),
              fundType: 'real',
              status: 'completed',
              reference: transactionReference,
            });
          }
        }
      }
    }
    // For OPEN positions: recalculate unrealized P/L or handle manual override
    else {
      const shouldRecalculatePnl = priceFieldsChanged;
      
      if (shouldRecalculatePnl) {
        const quote = await twelveDataService.getQuote(position.symbol);
        const openPrice = parseFloat(updates.openPrice || position.openPrice);
        const quantity = parseFloat(updates.quantity || position.quantity);
        const side = updates.side || position.side;
        
        // Use the updated side value to select correct price (bid for buy, ask for sell)
        const currentPrice = side === 'buy' ? (quote.bid || quote.price) : (quote.ask || quote.price);
        const priceChange = side === 'buy' 
          ? currentPrice - openPrice
          : openPrice - currentPrice;
        
        // Calculate gross P/L with contract multiplier
        const grossPnl = priceChange * quantity * contractMultiplier;
        
        // Deduct fees already paid (open fees) from unrealized P/L
        const openFees = parseFloat(position.fees || '0');
        const netUnrealizedPnl = grossPnl - openFees;
        
        console.log('[TRADING ENGINE] Open position P/L recalculation:', {
          positionId,
          symbol: position.symbol,
          side,
          openPrice,
          currentPrice,
          quantity,
          contractMultiplier,
          priceChange,
          grossPnl,
          openFees,
          netUnrealizedPnl
        });
        
        updates.unrealizedPnl = netUnrealizedPnl.toFixed(8);
        updates.currentPrice = currentPrice.toString();
      }
      // Handle manual unrealized P/L override for open positions
      else if (updates.unrealizedPnl !== undefined && updates.unrealizedPnl !== null) {
        console.log('[TRADING ENGINE] Manual unrealized P/L override:', {
          positionId,
          symbol: position.symbol,
          oldUnrealizedPnl: position.unrealizedPnl,
          newUnrealizedPnl: updates.unrealizedPnl,
          status: 'manual_override',
          note: 'Open positions: unrealized P/L affects equity, not balance'
        });
        
        // Set flag to skip automatic recalculation
        manualPnlOverrideApplied = true;
        
        // Note: For open positions, unrealized P/L only affects equity calculation,
        // not the actual balance. Balance is only adjusted when position closes.
      }
    }
    
    const modifiedPosition = await storage.updatePosition(positionId, updates);
    
    // Update account metrics immediately after position modification
    // Skip if manual P/L override was applied to prevent overwriting the manual value
    if (!manualPnlOverrideApplied) {
      await this.updateAccountMetrics(position.accountId);
    } else {
      console.log('[TRADING ENGINE] Skipping automatic metric update to preserve manual P/L override');
      
      // For manual overrides on open positions, we still need to update account equity
      // but without recalculating this position's P/L
      const account = await storage.getAccount(position.accountId);
      if (account) {
        const positions = await storage.getPositions({ accountId: position.accountId, status: 'open' });
        let totalUnrealizedPnl = 0;
        
        for (const pos of positions) {
          // Use the value from database (which now has our manual override)
          const currentPosition = pos.id === positionId ? modifiedPosition : pos;
          totalUnrealizedPnl += parseFloat(currentPosition.unrealizedPnl || '0');
        }
        
        const balance = parseFloat(account.balance);
        const equity = balance + totalUnrealizedPnl;
        
        await storage.updateAccount(position.accountId, {
          equity: equity.toString(),
        });
      }
    }
    
    return modifiedPosition;
  }

  async updateAccountMetrics(accountId: string): Promise<void> {
    const account = await storage.getAccount(accountId);
    if (!account) return;

    const positions = await storage.getPositions({ accountId, status: 'open' });

    let totalUnrealizedPnl = 0;
    let totalMargin = 0;

    for (const position of positions) {
      const updated = await this.updatePositionPnL(position);
      totalUnrealizedPnl += parseFloat(updated.unrealizedPnl || '0');
      
      // Calculate margin required (simplified)
      const positionValue = parseFloat(updated.openPrice) * parseFloat(updated.quantity);
      const leverage = account.leverage;
      totalMargin += positionValue / leverage;
    }

    const balance = parseFloat(account.balance);
    const equity = balance + totalUnrealizedPnl;
    const freeMargin = equity - totalMargin;
    const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : 0;
    
    // Cap margin level at 999999.99 to prevent numeric overflow (database column is numeric(8,2))
    const cappedMarginLevel = Math.min(marginLevel, 999999.99);

    console.log('[TRADING ENGINE] Account metrics:', {
      equity,
      margin: totalMargin,
      freeMargin,
      marginLevel,
      cappedMarginLevel
    });

    await storage.updateAccount(accountId, {
      equity: equity.toString(),
      margin: totalMargin.toString(),
      freeMargin: freeMargin.toString(),
      marginLevel: cappedMarginLevel.toString(),
    });
  }

  async checkPendingOrder(order: Order): Promise<void> {
    if (order.status !== 'pending') return;

    const quote = await twelveDataService.getQuote(order.symbol);
    const orderPrice = parseFloat(order.price || '0');

    // Use bid/ask if available, otherwise simulate with spread
    const spread = parseFloat(order.spread || '0.0001');
    const bid = quote.bid || (quote.price - spread / 2);
    const ask = quote.ask || (quote.price + spread / 2);

    let shouldExecute = false;

    switch (order.type) {
      case 'limit':
        // Limit Buy: Execute when ask price <= limit price (can buy at or below limit)
        // Limit Sell: Execute when bid price >= limit price (can sell at or above limit)
        if (order.side === 'buy') {
          shouldExecute = ask <= orderPrice;
        } else {
          shouldExecute = bid >= orderPrice;
        }
        break;

      case 'stop':
        // Stop Buy: Execute when ask price >= stop price (market is going up, ready to buy at ask)
        // Stop Sell: Execute when bid price <= stop price (market is going down, ready to sell at bid)
        if (order.side === 'buy') {
          shouldExecute = ask >= orderPrice;
        } else {
          shouldExecute = bid <= orderPrice;
        }
        break;

      case 'stop_limit':
        // Stop-Limit: First check if stop is triggered (same as stop order)
        // For simplicity, we'll treat stop_limit similar to stop for now
        // In a full implementation, this would transition to a limit order after stop triggers
        if (order.side === 'buy') {
          shouldExecute = ask >= orderPrice;
        } else {
          shouldExecute = bid <= orderPrice;
        }
        break;
    }

    if (shouldExecute) {
      await this.executeOrder(order);
    }
  }

  async checkAllPendingOrders(): Promise<void> {
    const pendingOrders = await storage.getOrders({ status: 'pending' });

    for (const order of pendingOrders) {
      try {
        await this.checkPendingOrder(order);
      } catch (error) {
        console.error(`Error checking pending order ${order.id}:`, error);
      }
    }
  }

  async checkStopLossTakeProfit(): Promise<void> {
    const positions = await storage.getPositions({ status: 'open' });

    for (const position of positions) {
      if (position.stopLoss || position.takeProfit) {
        const quote = await twelveDataService.getQuote(position.symbol);
        const currentPrice = position.side === 'buy' ? (quote.bid || quote.price) : (quote.ask || quote.price);

        // Check stop loss
        if (position.stopLoss) {
          const stopLossPrice = parseFloat(position.stopLoss);
          const shouldTriggerStopLoss = position.side === 'buy'
            ? currentPrice <= stopLossPrice
            : currentPrice >= stopLossPrice;

          if (shouldTriggerStopLoss) {
            await this.closePosition(position.id);
            continue;
          }
        }

        // Check take profit
        if (position.takeProfit) {
          const takeProfitPrice = parseFloat(position.takeProfit);
          const shouldTriggerTakeProfit = position.side === 'buy'
            ? currentPrice >= takeProfitPrice
            : currentPrice <= takeProfitPrice;

          if (shouldTriggerTakeProfit) {
            await this.closePosition(position.id);
          }
        }
      }
    }
  }
}

export const tradingEngine = new TradingEngine();

// Run order/position checkers every 5 seconds
setInterval(() => {
  Promise.all([
    tradingEngine.checkAllPendingOrders(),
    tradingEngine.checkStopLossTakeProfit(),
  ]).catch(console.error);
}, 5000);

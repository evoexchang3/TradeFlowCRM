import { storage } from '../storage';
import { twelveDataService } from './twelve-data';
import type { InsertOrder, InsertPosition, Order, Position } from '@shared/schema';

interface PlaceOrderRequest {
  accountId: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: string;
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
    const { accountId, symbol, type, side, quantity, price, stopLoss, takeProfit, leverage, spread, fees, initiatorType, initiatorId } = request;

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

    // Create the order
    const order: InsertOrder = {
      accountId,
      symbol,
      type,
      side,
      quantity,
      price,
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
    const priceChange = position.side === 'buy' 
      ? currentPrice - openPrice
      : openPrice - currentPrice;

    const unrealizedPnl = priceChange * quantity;

    console.log(`[P/L DEBUG] Calculated:`, {
      currentPrice,
      openPrice,
      quantity,
      priceChange,
      unrealizedPnl
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
    const priceChange = position.side === 'buy'
      ? closePrice - openPrice
      : openPrice - closePrice;

    const realizedPnl = priceChange * closingQuantity;

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
      reference: `Position ${position.symbol} closed`,
    });

    if (closingQuantity >= parseFloat(position.quantity)) {
      // Close entire position
      const updated = await storage.updatePosition(positionId, {
        status: 'closed',
        currentPrice: closePrice.toString(),
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
    openedAt?: Date | string;
  }): Promise<Position> {
    const position = await storage.getPosition(positionId);
    if (!position) {
      throw new Error('Position not found');
    }

    // If key values changed, recalculate P/L (unless P/L was manually overridden with a value)
    const shouldRecalculatePnl = (updates.openPrice || updates.quantity || updates.side) && 
                                  (!updates.unrealizedPnl || updates.unrealizedPnl === '');
    
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
      
      updates.unrealizedPnl = (priceChange * quantity).toFixed(8);
      updates.currentPrice = currentPrice.toString();
    }
    
    const modifiedPosition = await storage.updatePosition(positionId, updates);
    
    // Update account metrics immediately after position modification
    await this.updateAccountMetrics(position.accountId);
    
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

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
}

class TradingEngine {
  async placeOrder(request: PlaceOrderRequest): Promise<Order> {
    const { accountId, symbol, type, side, quantity, price, stopLoss, takeProfit } = request;

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
      status: type === 'market' ? 'filled' : 'pending',
    };

    const createdOrder = await storage.createOrder(order);

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
      status: 'open',
    };

    await storage.createPosition(position);

    // Update account equity and margin
    await this.updateAccountMetrics(order.accountId);
  }

  async updatePositionPnL(position: Position): Promise<Position> {
    const quote = await twelveDataService.getQuote(position.symbol);
    const currentPrice = position.side === 'buy' ? (quote.bid || quote.price) : (quote.ask || quote.price);

    const openPrice = parseFloat(position.openPrice);
    const quantity = parseFloat(position.quantity);
    const priceChange = position.side === 'buy' 
      ? currentPrice - openPrice
      : openPrice - currentPrice;

    const unrealizedPnl = priceChange * quantity;

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

  async modifyPosition(positionId: string, updates: { stopLoss?: string; takeProfit?: string; }): Promise<Position> {
    return await storage.updatePosition(positionId, updates);
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

    await storage.updateAccount(accountId, {
      equity: equity.toString(),
      margin: totalMargin.toString(),
      freeMargin: freeMargin.toString(),
      marginLevel: marginLevel.toString(),
    });
  }

  async checkPendingOrder(order: Order): Promise<void> {
    if (order.status !== 'pending') return;

    const quote = await twelveDataService.getQuote(order.symbol);
    const orderPrice = parseFloat(order.price || '0');

    // Require valid bid/ask for proper execution - skip if missing
    if (!quote.bid || !quote.ask) {
      console.warn(`Missing bid/ask for ${order.symbol}, skipping order check`);
      return;
    }

    let shouldExecute = false;

    switch (order.type) {
      case 'limit':
        // Limit Buy: Execute when ask price <= limit price (can buy at or below limit)
        // Limit Sell: Execute when bid price >= limit price (can sell at or above limit)
        if (order.side === 'buy') {
          shouldExecute = quote.ask <= orderPrice;
        } else {
          shouldExecute = quote.bid >= orderPrice;
        }
        break;

      case 'stop':
        // Stop Buy: Execute when ask price >= stop price (market is going up, ready to buy at ask)
        // Stop Sell: Execute when bid price <= stop price (market is going down, ready to sell at bid)
        if (order.side === 'buy') {
          shouldExecute = quote.ask >= orderPrice;
        } else {
          shouldExecute = quote.bid <= orderPrice;
        }
        break;

      case 'stop_limit':
        // Stop-Limit: First check if stop is triggered (same as stop order)
        // For simplicity, we'll treat stop_limit similar to stop for now
        // In a full implementation, this would transition to a limit order after stop triggers
        if (order.side === 'buy') {
          shouldExecute = quote.ask >= orderPrice;
        } else {
          shouldExecute = quote.bid <= orderPrice;
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

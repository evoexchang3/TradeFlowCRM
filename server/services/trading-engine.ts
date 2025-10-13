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
    }

    return createdOrder;
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

// Run SL/TP checker every 5 seconds
setInterval(() => {
  tradingEngine.checkStopLossTakeProfit().catch(console.error);
}, 5000);

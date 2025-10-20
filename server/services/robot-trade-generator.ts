import { storage } from '../storage';
import { twelveDataService } from './twelve-data';
import type { TradingRobot, Account, InsertPosition } from '@shared/schema';

interface GeneratedTrade {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: string;
  openPrice: string;
  closePrice: string;
  openedAt: Date;
  closedAt: Date;
  realizedPnl: string;
  fees: string;
  isWin: boolean;
}

export class RobotTradeGenerator {
  /**
   * Generate historical trades for a client based on robot configuration
   * This is the main entry point for the robot trade generation algorithm
   */
  async generateTradesForClient(
    robot: TradingRobot,
    account: Account
  ): Promise<GeneratedTrade[]> {
    // 1. Validate account balance sufficiency
    const accountBalance = parseFloat(account.realBalance || '0');
    const minBalance = parseFloat(robot.minAccountBalance || '0');
    
    if (accountBalance < minBalance) {
      console.log(`[ROBOT] Skipping account ${account.id} - insufficient balance ($${accountBalance} < $${minBalance})`);
      return [];
    }

    // 2. Determine trade count (random between min and max)
    // Guard against invalid configuration
    const minTrades = Math.max(1, robot.minTradesPerDay || 5);
    const maxTrades = Math.max(minTrades, robot.maxTradesPerDay || 10);
    const tradeCount = Math.floor(Math.random() * (maxTrades - minTrades + 1)) + minTrades;

    // 3. Calculate target profit for this client
    const profitMin = parseFloat(robot.profitRangeMin || '20');
    const profitMax = parseFloat(robot.profitRangeMax || '25');
    const targetProfit = Math.random() * (profitMax - profitMin) + profitMin;

    // 4. Distribute wins/losses to achieve target win rate
    // CRITICAL: Ensure at least 1 win to meet profit targets
    const winRate = parseFloat(robot.winRate || '70') / 100;
    let winCount = Math.round(tradeCount * winRate);
    
    // Guard against zero wins when profit target is positive
    if (winCount === 0 && targetProfit > 0) {
      winCount = 1;
      console.warn(`[ROBOT] Win count rounded to 0, forcing to 1 to meet profit target of $${targetProfit.toFixed(2)}`);
    }
    
    const lossCount = tradeCount - winCount;

    console.log(`[ROBOT] Generating ${tradeCount} trades for account ${account.id}:`, {
      winCount,
      lossCount,
      targetProfit,
      winRate: `${(winRate * 100).toFixed(1)}%`,
      actualWinRate: `${((winCount / tradeCount) * 100).toFixed(1)}%`,
    });

    // 5. Calculate individual P/L amounts
    const { winAmounts, lossAmounts } = this.distributeProfitAmounts(
      targetProfit,
      winCount,
      lossCount
    );

    // 6. Get historical time window (yesterday 1am-4am by default)
    const { startTime, endTime } = this.getTradeWindow(robot);

    // 7. Generate trades with realistic prices from historical data
    const trades = await this.generateRealisticTrades(
      robot,
      winAmounts,
      lossAmounts,
      startTime,
      endTime
    );

    return trades;
  }

  /**
   * Distribute the target profit across winning and losing trades
   * Winning trades should sum to (targetProfit + totalLosses)
   * Losing trades should sum to totalLosses
   * Net result: targetProfit
   */
  private distributeProfitAmounts(
    targetProfit: number,
    winCount: number,
    lossCount: number
  ): { winAmounts: number[]; lossAmounts: number[] } {
    const winAmounts: number[] = [];
    const lossAmounts: number[] = [];

    // Guard against invalid inputs
    if (winCount === 0 && targetProfit > 0) {
      throw new Error(`Cannot achieve target profit of $${targetProfit.toFixed(2)} with zero winning trades`);
    }

    // Generate loss amounts (between $1 and $10 each)
    let totalLosses = 0;
    for (let i = 0; i < lossCount; i++) {
      const lossAmount = Math.random() * 9 + 1; // $1 to $10
      lossAmounts.push(lossAmount);
      totalLosses += lossAmount;
    }

    // Calculate total wins needed to achieve target profit
    const totalWinsNeeded = targetProfit + totalLosses;

    // Distribute wins with some variation
    let remainingWins = totalWinsNeeded;
    for (let i = 0; i < winCount; i++) {
      if (i === winCount - 1) {
        // Last win takes whatever is remaining (ensure positive)
        winAmounts.push(Math.max(0.01, remainingWins));
      } else {
        // Random win between $2 and $15, but not more than remaining
        const maxWin = Math.min(15, remainingWins - (winCount - i - 1) * 2);
        const minWin = 2;
        const winAmount = Math.random() * (maxWin - minWin) + minWin;
        winAmounts.push(winAmount);
        remainingWins -= winAmount;
      }
    }

    console.log(`[ROBOT] P/L Distribution:`, {
      totalWins: totalWinsNeeded.toFixed(2),
      totalLosses: totalLosses.toFixed(2),
      netProfit: targetProfit.toFixed(2),
      avgWin: winCount > 0 ? (totalWinsNeeded / winCount).toFixed(2) : 'N/A',
      avgLoss: lossCount > 0 ? (totalLosses / lossCount).toFixed(2) : 'N/A',
      winCount,
      lossCount,
    });

    return { winAmounts, lossAmounts };
  }

  /**
   * Get the time window for trade generation
   * Returns yesterday's window between tradeWindowStart and tradeWindowEnd
   */
  private getTradeWindow(robot: TradingRobot): { startTime: Date; endTime: Date } {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Parse trade window times (default: 1am-4am)
    const startHour = parseInt(robot.tradeWindowStart?.split(':')[0] || '1');
    const startMinute = parseInt(robot.tradeWindowStart?.split(':')[1] || '0');
    const endHour = parseInt(robot.tradeWindowEnd?.split(':')[0] || '4');
    const endMinute = parseInt(robot.tradeWindowEnd?.split(':')[1] || '0');

    const startTime = new Date(yesterday);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(yesterday);
    endTime.setHours(endHour, endMinute, 0, 0);

    return { startTime, endTime };
  }

  /**
   * Generate realistic trades using historical market data
   * Each trade gets real entry/exit prices from 1-minute candles
   */
  private async generateRealisticTrades(
    robot: TradingRobot,
    winAmounts: number[],
    lossAmounts: number[],
    startTime: Date,
    endTime: Date
  ): Promise<GeneratedTrade[]> {
    const trades: GeneratedTrade[] = [];
    const symbols = robot.symbols || ['BTC/USD', 'ETH/USD'];

    // Combine wins and losses, shuffle for randomness
    const allPnls: Array<{ amount: number; isWin: boolean }> = [
      ...winAmounts.map(amount => ({ amount, isWin: true })),
      ...lossAmounts.map(amount => ({ amount, isWin: false })),
    ];
    
    // Shuffle using Fisher-Yates algorithm
    for (let i = allPnls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPnls[i], allPnls[j]] = [allPnls[j], allPnls[i]];
    }

    // Generate each trade
    for (let i = 0; i < allPnls.length; i++) {
      const { amount, isWin } = allPnls[i];
      
      // Select random symbol from robot's configured symbols
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      
      // Fetch historical candles for this symbol
      const candles = await twelveDataService.getHistoricalCandlesForWindow(
        symbol,
        startTime,
        endTime
      );

      // Generate a single realistic trade from these candles (throws if insufficient data)
      try {
        const trade = this.generateSingleTrade(
          symbol,
          amount,
          isWin,
          candles,
          startTime,
          endTime
        );
        trades.push(trade);
      } catch (error) {
        // Skip this trade if no suitable real candle found
        console.warn(`[ROBOT] Skipping trade for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue to next trade instead of failing the entire batch
      }
    }

    return trades;
  }

  /**
   * Generate a single trade with realistic entry and exit prices
   * FIXED: Uses ONLY REAL market prices from historical candles, NO simulation
   * FIXED: Robot trades are fee-free
   */
  private generateSingleTrade(
    symbol: string,
    targetPnl: number,
    isWin: boolean,
    candles: Array<{ open: string; high: string; low: string; close: string; timestamp: Date }>,
    windowStart: Date,
    windowEnd: Date
  ): GeneratedTrade {
    // CRITICAL FIX #1: Sort candles chronologically (oldest → newest)
    // TwelveData returns candles in reverse order (newest first)
    const sortedCandles = [...candles].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    if (sortedCandles.length < 10) {
      throw new Error(`Insufficient candles for ${symbol}: ${sortedCandles.length} available`);
    }

    // Determine trade side
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const feeRate = 0; // ROBOT TRADES ARE FEE-FREE

    // MULTI-ENTRY RETRY STRATEGY: Try up to 5 different entry candles
    const maxEntryIndex = Math.floor(sortedCandles.length * 0.7);
    const maxRetries = 5;
    
    let bestExitCandle: typeof sortedCandles[0] | null = null;
    let bestExitPrice: number | null = null;
    let bestEntryCandle: typeof sortedCandles[0] | null = null;
    let bestEntryPrice: number | null = null;
    let bestScore = Infinity;

    for (let retry = 0; retry < maxRetries; retry++) {
      // Try a random entry candle (from first 70% of window to leave room for exit)
      const entryIndex = Math.floor(Math.random() * maxEntryIndex);
      const entryCandle = sortedCandles[entryIndex];
      const entryPrice = parseFloat(entryCandle.close);

      // Search ALL exit candles after this entry
      const minOffset = 5;
      const maxOffset = sortedCandles.length - entryIndex - 1;
      
      if (maxOffset < minOffset) {
        // Not enough candles after this entry, try next retry
        continue;
      }
      
      for (let offset = minOffset; offset <= maxOffset; offset++) {
        const exitIndex = entryIndex + offset;
        if (exitIndex >= sortedCandles.length) break;

        const candidateCandle = sortedCandles[exitIndex];
        const candidatePrice = parseFloat(candidateCandle.close);
        
        // Calculate what P/L this real price movement would give us
        const priceMove = side === 'buy' 
          ? (candidatePrice - entryPrice) 
          : (entryPrice - candidatePrice);
        
        // Check if this movement matches our win/loss requirement
        // With fee-free trades: positive move = win, negative move = loss
        const isWinningMove = priceMove > 0;
        
        if (isWinningMove === isWin) {
          // This candle's price movement matches our requirement!
          // Calculate how close it gets us to target P/L
          const testQuantity = this.calculateQuantityForTarget(
            targetPnl,
            entryPrice,
            candidatePrice,
            side,
            isWin,
            feeRate
          );
          
          // Calculate realized P/L (fee-free, so rawPnl = realizedPnl)
          const rawPnl = priceMove * testQuantity;
          const realizedPnl = rawPnl; // No fees!
          
          // Verify P/L sign still matches (should always be true with fee-free trades)
          const isActualWin = realizedPnl > 0;
          
          if (isActualWin === isWin) {
            // This exit works! Score based on how close we get to target
            const error = Math.abs(Math.abs(realizedPnl) - targetPnl);
            
            if (error < bestScore) {
              bestScore = error;
              bestExitCandle = candidateCandle;
              bestExitPrice = candidatePrice;
              bestEntryCandle = entryCandle;
              bestEntryPrice = entryPrice;
            }
          }
        }
      }
      
      // If we found a match, no need to retry
      if (bestExitCandle !== null) {
        break;
      }
    }

    // CRITICAL: If no suitable exit candle found after all retries, skip this trade
    if (bestExitCandle === null || bestExitPrice === null || bestEntryCandle === null || bestEntryPrice === null) {
      throw new Error(
        `No real exit candle found for ${symbol} ${isWin ? 'WIN' : 'LOSS'} after ${maxRetries} retries. ` +
        `This is extremely rare with fee-free trades - market may not have moved in desired direction.`
      );
    }

    // Use the best entry/exit combination we found (100% REAL PRICES)
    const entryPrice = bestEntryPrice;
    const entryCandle = bestEntryCandle;
    const exitPrice = bestExitPrice;
    const exitCandle = bestExitCandle;

    // Calculate final quantity to achieve target P/L with REAL prices
    const quantity = this.calculateQuantityForTarget(
      targetPnl,
      entryPrice,
      exitPrice,
      side,
      isWin,
      feeRate
    );

    // Calculate actual P/L (fee-free for robot trades)
    const positionValue = quantity * entryPrice;
    const fees = 0; // ROBOT TRADES ARE FEE-FREE
    
    let rawPnl = side === 'buy'
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;
    
    const realizedPnl = rawPnl; // No fees deducted!

    // Use REAL timestamps from candles (now in correct chronological order)
    const openedAt = entryCandle.timestamp;
    const closedAt = exitCandle.timestamp;

    return {
      symbol,
      side,
      quantity: quantity.toFixed(8),
      openPrice: entryPrice.toFixed(8),
      closePrice: exitPrice.toFixed(8),
      openedAt,
      closedAt,
      realizedPnl: realizedPnl.toFixed(8),
      fees: fees.toFixed(8),
      isWin,
    };
  }

  /**
   * Calculate quantity needed to achieve target P/L
   * SIMPLIFIED: Fee-free trades make this straightforward
   */
  private calculateQuantityForTarget(
    targetPnl: number,
    entryPrice: number,
    exitPrice: number,
    side: 'buy' | 'sell',
    isWin: boolean,
    feeRate: number
  ): number {
    // With fee-free trades: Net P/L = Raw P/L
    // Raw P/L = quantity * priceMove
    // quantity = targetPnl / priceMove
    
    const priceMove = Math.abs(exitPrice - entryPrice);
    if (priceMove === 0) {
      return 0.01; // Minimum quantity if no price movement
    }

    // Simple formula: quantity = target / price movement
    const quantity = Math.abs(targetPnl / priceMove);

    return Math.max(0.01, quantity); // Minimum 0.01 quantity
  }

  /**
   * Save generated trades to database as closed positions
   */
  async saveTradesForAccount(
    accountId: string,
    robotId: string,
    trades: GeneratedTrade[]
  ): Promise<void> {
    for (const trade of trades) {
      const position: InsertPosition = {
        accountId,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        openPrice: trade.openPrice,
        closePrice: trade.closePrice,
        currentPrice: trade.closePrice,
        realizedPnl: trade.realizedPnl,
        fees: trade.fees,
        leverage: '1',
        spread: '0',
        contractMultiplier: '1',
        marginMode: 'isolated',
        marginUsed: (parseFloat(trade.quantity) * parseFloat(trade.openPrice)).toFixed(8),
        initiatorType: 'robot',
        initiatorId: robotId,
        status: 'closed',
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
      };

      await storage.createPosition(position);
    }

    // Update account balance with total P/L
    const totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0);
    
    const account = await storage.getAccount(accountId);
    if (account) {
      const newRealBalance = parseFloat(account.realBalance || '0') + totalPnl;
      const newTotalBalance = newRealBalance + parseFloat(account.demoBalance || '0') + parseFloat(account.bonusBalance || '0');
      
      await storage.updateAccount(accountId, {
        realBalance: newRealBalance.toFixed(8),
        balance: newTotalBalance.toFixed(8),
      });

      // Create transaction record
      await storage.createTransaction({
        accountId,
        type: totalPnl >= 0 ? 'profit' : 'loss',
        amount: Math.abs(totalPnl).toFixed(8),
        fundType: 'real',
        status: 'completed',
        notes: `Robot ${robotId} generated ${trades.length} trades (${trades.filter(t => t.isWin).length} wins, ${trades.filter(t => !t.isWin).length} losses)`,
      });
    }

    console.log(`[ROBOT] Saved ${trades.length} trades for account ${accountId}, total P/L: $${totalPnl.toFixed(2)}`);
  }
}

export const robotTradeGenerator = new RobotTradeGenerator();

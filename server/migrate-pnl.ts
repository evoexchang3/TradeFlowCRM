import { db } from './db';
import { positions, accounts, transactions } from '../shared/schema';
import { getPositionUnits, getInstrumentConfig } from './config/instruments';
import { eq } from 'drizzle-orm';

interface MigrationResult {
  positionId: string;
  symbol: string;
  status: 'open' | 'closed';
  oldPnl: string;
  newPnl: string;
  difference: number;
  accountId: string;
  needsBalanceAdjustment: boolean;
}

async function recalculatePnL(dryRun: boolean = true) {
  console.log('\n' + '='.repeat(80));
  console.log(`P/L MIGRATION - ${dryRun ? 'DRY RUN MODE' : 'EXECUTION MODE'}`);
  console.log('='.repeat(80) + '\n');

  const allPositions = await db.select().from(positions);
  console.log(`Found ${allPositions.length} total positions\n`);

  const results: MigrationResult[] = [];
  let openPositionsUpdated = 0;
  let closedPositionsUpdated = 0;
  let totalBalanceAdjustment = 0;

  for (const position of allPositions) {
    const instrumentConfig = getInstrumentConfig(position.symbol);
    const positionUnits = getPositionUnits(position.quantity, position.symbol);
    const contractMultiplier = parseFloat(position.contractMultiplier || '1');
    
    let oldPnl: string;
    let newPnl: number;
    let needsBalanceAdjustment = false;

    if (position.status === 'closed') {
      // Recalculate realized P/L for closed positions
      const openPrice = parseFloat(position.openPrice);
      const closePrice = parseFloat((position.closePrice || position.currentPrice) || '0');
      
      const priceChange = position.side === 'buy'
        ? closePrice - openPrice
        : openPrice - closePrice;
      
      // Calculate gross P/L with correct position units
      const grossPnl = priceChange * positionUnits * contractMultiplier;
      
      // Keep fees as-is (they were paid correctly, even if P/L was wrong)
      const fees = parseFloat(position.fees || '0');
      newPnl = grossPnl - fees;
      
      oldPnl = position.realizedPnl || '0';
      needsBalanceAdjustment = true;
      closedPositionsUpdated++;
      
    } else {
      // Recalculate unrealized P/L for open positions
      const openPrice = parseFloat(position.openPrice);
      const currentPrice = parseFloat(position.currentPrice);
      
      const priceChange = position.side === 'buy'
        ? currentPrice - openPrice
        : openPrice - currentPrice;
      
      // Calculate gross P/L with correct position units
      const grossPnl = priceChange * positionUnits * contractMultiplier;
      
      // Deduct fees already paid
      const fees = parseFloat(position.fees || '0');
      newPnl = grossPnl - fees;
      
      oldPnl = position.unrealizedPnl || '0';
      openPositionsUpdated++;
    }

    const oldPnlNum = parseFloat(oldPnl);
    const difference = newPnl - oldPnlNum;

    // Only record if there's a meaningful difference (> $0.01)
    if (Math.abs(difference) > 0.01) {
      results.push({
        positionId: position.id,
        symbol: position.symbol,
        status: position.status,
        oldPnl: oldPnl,
        newPnl: newPnl.toFixed(8),
        difference,
        accountId: position.accountId,
        needsBalanceAdjustment
      });

      if (needsBalanceAdjustment) {
        totalBalanceAdjustment += difference;
      }

      console.log(`${position.status.toUpperCase()} | ${position.symbol.padEnd(10)} | ID: ${position.id}`);
      console.log(`  Old P/L: $${parseFloat(oldPnl).toFixed(2)}`);
      console.log(`  New P/L: $${newPnl.toFixed(2)}`);
      console.log(`  Difference: $${difference.toFixed(2)} ${difference > 0 ? '📈' : '📉'}`);
      console.log(`  Position Units: ${positionUnits} (quantity: ${position.quantity})`);
      console.log(`  Contract Multiplier: ${contractMultiplier}`);
      if (needsBalanceAdjustment) {
        console.log(`  ⚠️  Will adjust account balance`);
      }
      console.log();
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Positions: ${allPositions.length}`);
  console.log(`Positions with P/L Changes: ${results.length}`);
  console.log(`  - Open Positions: ${results.filter(r => r.status === 'open').length}`);
  console.log(`  - Closed Positions: ${results.filter(r => r.status === 'closed').length}`);
  console.log(`Total Balance Adjustment Needed: $${totalBalanceAdjustment.toFixed(2)}`);
  console.log('='.repeat(80) + '\n');

  if (!dryRun && results.length > 0) {
    console.log('EXECUTING MIGRATION...\n');

    // Group by account for balance adjustments
    const accountAdjustments = new Map<string, number>();
    
    for (const result of results) {
      // Update position P/L
      if (result.status === 'closed') {
        await db.update(positions)
          .set({ realizedPnl: result.newPnl })
          .where(eq(positions.id, result.positionId));
        
        // Track balance adjustment
        const current = accountAdjustments.get(result.accountId) || 0;
        accountAdjustments.set(result.accountId, current + result.difference);
        
      } else {
        await db.update(positions)
          .set({ unrealizedPnl: result.newPnl })
          .where(eq(positions.id, result.positionId));
      }
      
      console.log(`✓ Updated position ${result.positionId} (${result.symbol})`);
    }

    // Apply balance adjustments for closed positions
    for (const [accountId, adjustment] of Array.from(accountAdjustments.entries())) {
      if (Math.abs(adjustment) > 0.01) {
        const account = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
        
        if (account.length > 0) {
          const currentBalance = parseFloat(account[0].realBalance || '0');
          const newBalance = currentBalance + adjustment;
          
          await db.update(accounts)
            .set({
              realBalance: newBalance.toFixed(8),
              balance: (
                newBalance + 
                parseFloat(account[0].demoBalance || '0') + 
                parseFloat(account[0].bonusBalance || '0')
              ).toFixed(8)
            })
            .where(eq(accounts.id, accountId));
          
          // Create transaction record
          await db.insert(transactions).values({
            accountId,
            type: adjustment >= 0 ? 'profit' : 'loss',
            amount: Math.abs(adjustment).toFixed(8),
            fundType: 'real',
            status: 'completed',
            reference: `P/L Migration: Balance adjustment ${adjustment >= 0 ? '+' : ''}$${adjustment.toFixed(2)} (corrected lot-to-unit calculation)`
          });
          
          console.log(`✓ Adjusted account ${accountId} balance by $${adjustment.toFixed(2)} (Old: $${currentBalance.toFixed(2)} → New: $${newBalance.toFixed(2)})`);
        }
      }
    }

    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY\n');
  } else if (dryRun && results.length > 0) {
    console.log('ℹ️  This was a DRY RUN. No changes were made to the database.');
    console.log('ℹ️  Run with dryRun=false to execute the migration.\n');
  } else {
    console.log('✅ All positions already have correct P/L. No migration needed.\n');
  }

  return results;
}

// Run migration
const dryRun = process.argv.includes('--execute') ? false : true;

recalculatePnL(dryRun)
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

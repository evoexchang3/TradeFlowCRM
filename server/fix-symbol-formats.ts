import { db } from './db';
import { positions, accounts, transactions } from '../shared/schema';
import { getPositionUnits, getInstrumentConfig } from './config/instruments';
import { twelveDataService } from './services/twelve-data';
import { eq } from 'drizzle-orm';

interface SymbolMapping {
  incorrect: string;
  correct: string;
  correctMultiplier: string;
}

// Known symbol format fixes
const symbolMappings: SymbolMapping[] = [
  { incorrect: 'EURUSD', correct: 'EUR/USD', correctMultiplier: '1' },
  { incorrect: 'GBPUSD', correct: 'GBP/USD', correctMultiplier: '1' },
  { incorrect: 'USDJPY', correct: 'USD/JPY', correctMultiplier: '1' },
  // Add more as needed
];

async function fixSymbolFormats(dryRun: boolean = true) {
  console.log('\n' + '='.repeat(80));
  console.log(`SYMBOL FORMAT FIX - ${dryRun ? 'DRY RUN MODE' : 'EXECUTION MODE'}`);
  console.log('='.repeat(80) + '\n');

  const accountBalanceAdjustments = new Map<string, number>();

  for (const mapping of symbolMappings) {
    const incorrectPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.symbol, mapping.incorrect));

    if (incorrectPositions.length === 0) {
      console.log(`No positions found with symbol: ${mapping.incorrect}\n`);
      continue;
    }

    console.log(`Found ${incorrectPositions.length} positions with incorrect symbol: ${mapping.incorrect}`);
    console.log(`Will fix to: ${mapping.correct}\n`);

    for (const position of incorrectPositions) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`Position ID: ${position.id}`);
      console.log(`Status: ${position.status.toUpperCase()}`);
      console.log(`\nCURRENT VALUES:`);
      console.log(`  Symbol: ${position.symbol} → ${mapping.correct}`);
      console.log(`  Quantity: ${position.quantity} lots`);
      console.log(`  Open Price: $${parseFloat(position.openPrice).toFixed(5)}`);
      console.log(`  Contract Multiplier: ${position.contractMultiplier} → ${mapping.correctMultiplier}`);

      // Get correct position units
      const positionUnits = getPositionUnits(position.quantity, mapping.correct);
      const correctMultiplier = parseFloat(mapping.correctMultiplier);

      let newPnl: number;
      let newCurrentPrice: string | undefined;
      let oldPnl: string;

      if (position.status === 'open') {
        // Fetch LIVE price from TwelveData API
        console.log(`\nFETCHING LIVE PRICE from TwelveData API...`);
        
        try {
          const quote = await twelveDataService.getQuote(mapping.correct);
          const currentPrice = position.side === 'buy' ? (quote.bid || quote.price) : (quote.ask || quote.price);
          
          console.log(`  Live Price: $${currentPrice.toFixed(5)}`);
          console.log(`  Old Price: $${parseFloat(position.currentPrice).toFixed(5)} ${parseFloat(position.currentPrice) > 90 ? '❌ GARBAGE!' : ''}`);
          
          const openPrice = parseFloat(position.openPrice);
          const priceChange = position.side === 'buy'
            ? currentPrice - openPrice
            : openPrice - currentPrice;

          // Calculate correct P/L
          newPnl = priceChange * positionUnits * correctMultiplier;
          const fees = parseFloat(position.fees || '0');
          newPnl = newPnl - fees;
          
          newCurrentPrice = currentPrice.toString();
          oldPnl = position.unrealizedPnl || '0';

          console.log(`\nCALCULATION:`);
          console.log(`  Position Units: ${positionUnits} (${position.quantity} lots × 100,000)`);
          console.log(`  Price Change: ${priceChange.toFixed(5)} (${(priceChange * 10000).toFixed(1)} pips)`);
          console.log(`  Formula: ${priceChange.toFixed(5)} × ${positionUnits} × ${correctMultiplier}`);
          console.log(`  Fees: $${fees.toFixed(2)}`);
          console.log(`\nP/L COMPARISON:`);
          console.log(`  Old Unrealized P/L: $${parseFloat(oldPnl).toFixed(2)} ❌`);
          console.log(`  New Unrealized P/L: $${newPnl.toFixed(2)} ✓`);
          console.log(`  Difference: $${(newPnl - parseFloat(oldPnl)).toFixed(2)}`);

        } catch (error) {
          console.log(`  ❌ Error fetching live price: ${error}`);
          console.log(`  Skipping this position - manual review needed`);
          continue;
        }

      } else {
        // For closed positions, recalculate with stored prices
        const openPrice = parseFloat(position.openPrice);
        const closePrice = parseFloat((position.closePrice || position.currentPrice) || '0');
        
        console.log(`  Close Price: $${closePrice.toFixed(5)}`);
        
        const priceChange = position.side === 'buy'
          ? closePrice - openPrice
          : openPrice - closePrice;

        // Calculate correct P/L
        newPnl = priceChange * positionUnits * correctMultiplier;
        const fees = parseFloat(position.fees || '0');
        newPnl = newPnl - fees;
        
        oldPnl = position.realizedPnl || '0';
        const pnlDifference = newPnl - parseFloat(oldPnl);

        console.log(`\nCALCULATION:`);
        console.log(`  Position Units: ${positionUnits} (${position.quantity} lots × 100,000)`);
        console.log(`  Price Change: ${priceChange.toFixed(5)} (${(priceChange * 10000).toFixed(1)} pips)`);
        console.log(`  Formula: ${priceChange.toFixed(5)} × ${positionUnits} × ${correctMultiplier}`);
        console.log(`  Fees: $${fees.toFixed(2)}`);
        console.log(`\nP/L COMPARISON:`);
        console.log(`  Old Realized P/L: $${parseFloat(oldPnl).toFixed(2)} ❌`);
        console.log(`  New Realized P/L: $${newPnl.toFixed(2)} ✓`);
        console.log(`  Difference: $${pnlDifference.toFixed(2)}`);
        console.log(`  ⚠️  Will adjust account balance by $${pnlDifference.toFixed(2)}`);

        // Track balance adjustment
        const currentAdjustment = accountBalanceAdjustments.get(position.accountId) || 0;
        accountBalanceAdjustments.set(position.accountId, currentAdjustment + pnlDifference);
      }

      if (!dryRun) {
        // Execute the fix
        const updates: any = {
          symbol: mapping.correct,
          contractMultiplier: mapping.correctMultiplier,
        };

        if (position.status === 'open') {
          updates.currentPrice = newCurrentPrice;
          updates.unrealizedPnl = newPnl.toFixed(8);
        } else {
          updates.realizedPnl = newPnl.toFixed(8);
        }

        await db.update(positions)
          .set(updates)
          .where(eq(positions.id, position.id));

        console.log(`\n✓ Position updated successfully`);
      }
    }
  }

  // Apply balance adjustments for closed positions
  if (!dryRun && accountBalanceAdjustments.size > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('APPLYING ACCOUNT BALANCE ADJUSTMENTS');
    console.log('='.repeat(80) + '\n');

    for (const [accountId, adjustment] of Array.from(accountBalanceAdjustments.entries())) {
      if (Math.abs(adjustment) > 0.01) {
        const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
        
        if (accountList.length > 0) {
          const account = accountList[0];
          const currentBalance = parseFloat(account.realBalance || '0');
          const newBalance = currentBalance + adjustment;
          
          await db.update(accounts)
            .set({
              realBalance: newBalance.toFixed(8),
              balance: (
                newBalance + 
                parseFloat(account.demoBalance || '0') + 
                parseFloat(account.bonusBalance || '0')
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
            reference: `Symbol Format Fix: Balance adjustment ${adjustment >= 0 ? '+' : ''}$${adjustment.toFixed(2)} (corrected symbol format and contract multiplier)`
          });
          
          console.log(`✓ Account ${accountId}`);
          console.log(`  Old Balance: $${currentBalance.toFixed(2)}`);
          console.log(`  Adjustment: ${adjustment >= 0 ? '+' : ''}$${adjustment.toFixed(2)}`);
          console.log(`  New Balance: $${newBalance.toFixed(2)}\n`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  if (dryRun) {
    console.log('ℹ️  This was a DRY RUN. No changes were made to the database.');
    console.log('ℹ️  Run with --execute flag to apply the fixes.\n');
  } else {
    console.log('✅ ALL FIXES APPLIED SUCCESSFULLY\n');
    console.log('Changes made:');
    console.log('  - Symbol formats corrected');
    console.log('  - Contract multipliers fixed');
    console.log('  - Live prices fetched from TwelveData API');
    console.log('  - P/L recalculated correctly');
    console.log('  - Account balances adjusted\n');
  }
}

// Run the fix
const dryRun = process.argv.includes('--execute') ? false : true;

fixSymbolFormats(dryRun)
  .then(() => {
    console.log('Symbol format fix script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });

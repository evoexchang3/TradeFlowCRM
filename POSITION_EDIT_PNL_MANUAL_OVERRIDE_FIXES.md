# Position Edit P/L Manual Override Fixes - October 15, 2025

## Summary
Fixed critical bugs preventing P/L recalculation when prices change and balance updates when manually editing P/L values.

## Problems Fixed

### Problem 1: P/L Not Recalculating When Prices Change ❌→✅
**Before:** When editing a closed position's open/close price, the P/L would not update
**After:** P/L automatically recalculates when prices or quantity change
**Root Cause:** Condition checked if `unrealizedPnl` field was empty instead of checking if price fields actually changed

### Problem 2: Manual P/L Changes Not Adjusting Balance ❌→✅
**Before:** Manually changing a position's P/L would update the P/L field but not adjust the account balance
**After:** Manual P/L changes now properly adjust balance based on the P/L difference
**Root Cause:** Balance adjustment only happened during automatic recalculation, not manual overrides

### Problem 3: Validation Too Strict ❌→✅
**Before:** Forms submitting unchanged price values alongside manual P/L would trigger conflict error
**After:** Validation compares actual value changes, not just presence of fields
**Root Cause:** Validation checked if fields were provided (truthy) instead of comparing against current values

### Problem 4: Manual Open Position P/L Being Overwritten ❌→✅
**Before:** Manual unrealized P/L overrides were immediately overwritten by automatic recalculation
**After:** Manual overrides are preserved by skipping automatic recalculation
**Root Cause:** `updateAccountMetrics()` would recalculate all positions from live market data

## Implementation Details

### 1. Schema Enhancement
Added `realizedPnl` field to `modifyPositionSchema`:
```typescript
export const modifyPositionSchema = z.object({
  openPrice: z.string().optional(),
  closePrice: z.string().optional(),
  quantity: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
  unrealizedPnl: z.string().optional(),  // For open positions
  realizedPnl: z.string().optional(),    // For closed positions (NEW)
  // ...
});
```

### 2. Smart Validation
```typescript
// Compare against existing values, not just check if provided
const priceFieldsChanged = !!(
  (updates.openPrice && updates.openPrice !== position.openPrice) ||
  (updates.closePrice && updates.closePrice !== position.closePrice) ||
  (updates.quantity && updates.quantity !== position.quantity) ||
  (updates.side && updates.side !== position.side)
);

// Prevent conflicting inputs
if (priceFieldsChanged && manualPnlProvided) {
  throw new Error('Cannot manually override P/L when also changing prices...');
}
```

### 3. Four Edit Scenarios

#### Scenario 1: Closed Position - Automatic Recalculation
**Trigger:** User changes open/close price, quantity, or side
**Behavior:**
```typescript
if (priceFieldsChanged) {
  // Recalculate P/L with contract multiplier & fees
  grossPnl = priceChange × quantity × contractMultiplier
  totalFees = openFees + closeFees
  newRealizedPnl = grossPnl - totalFees
  
  // Adjust balance
  pnlDifference = newRealizedPnl - oldRealizedPnl
  newBalance = currentBalance + pnlDifference
  
  // Create transaction record
}
```
**Result:** ✅ P/L recalculated, balance adjusted

#### Scenario 2: Closed Position - Manual P/L Override
**Trigger:** User manually enters a P/L value
**Behavior:**
```typescript
if (updates.realizedPnl) {
  // Use manual value
  pnlDifference = newRealizedPnl - oldRealizedPnl
  newBalance = currentBalance + pnlDifference
  
  // Create transaction record
}
```
**Result:** ✅ Manual P/L used, balance adjusted

#### Scenario 3: Open Position - Automatic Recalculation
**Trigger:** User changes open price, quantity, or side
**Behavior:**
```typescript
if (priceFieldsChanged) {
  // Recalculate from live market data
  grossPnl = priceChange × quantity × contractMultiplier
  netUnrealizedPnl = grossPnl - openFees
  
  // Update equity (NOT balance)
}
```
**Result:** ✅ Unrealized P/L recalculated, equity updated

#### Scenario 4: Open Position - Manual P/L Override
**Trigger:** User manually enters unrealized P/L
**Behavior:**
```typescript
if (updates.unrealizedPnl) {
  // Use manual value and prevent auto-recalculation
  manualPnlOverrideApplied = true
  
  // Skip updateAccountMetrics() to preserve manual value
  // Update equity manually with override value
}
```
**Result:** ✅ Manual unrealized P/L preserved, equity updated

### 4. Preventing Override Overwrite
```typescript
// After updating position
if (!manualPnlOverrideApplied) {
  await this.updateAccountMetrics(accountId); // Normal flow
} else {
  // Manually update equity without recalculating positions
  // This preserves the manual override value
}
```

## Balance Adjustment Examples

### Example 1: Automatic - Change Close Price
- **Initial:** EUR/USD closed, P/L = $100, Balance = $10,100
- **Action:** Change close price (increases P/L to $150)
- **Result:** P/L = $150, Balance = $10,150 (+$50) ✅

### Example 2: Manual - Increase P/L
- **Initial:** Position P/L = $100, Balance = $10,100
- **Action:** Manually set P/L to $200
- **Result:** P/L = $200, Balance = $10,200 (+$100) ✅

### Example 3: Manual - Profit to Loss
- **Initial:** Position P/L = $100, Balance = $10,100
- **Action:** Manually set P/L to -$50
- **Result:** P/L = -$50, Balance = $10,050 (-$150) ✅
  - Removes the $100 credit
  - Deducts the $50 loss
  - Total change: -$150

### Example 4: Open Position - Manual Override Preserved
- **Initial:** Open EUR/USD, Unrealized P/L = $50 (from market data)
- **Action:** Manually set unrealized P/L to $100
- **Result:** Unrealized P/L = $100 (preserved, not overwritten) ✅
  - Equity updated with manual value
  - Balance unchanged (still unrealized)

## Transaction Records

Every balance adjustment creates a detailed transaction:

**Automatic Recalculation:**
```
Type: adjustment
Amount: $50.00
Reference: "Position EUR/USD edited - P/L increased by $50.00 (Old: $100.00 → New: $150.00)"
```

**Manual Override:**
```
Type: adjustment
Amount: $100.00
Reference: "Position EUR/USD P/L manually adjusted +$100.00 (Old: $100.00 → New: $200.00)"
```

## Logging

All scenarios include detailed console logging:

**Automatic Recalculation:**
```javascript
console.log('[TRADING ENGINE] Closed position P/L recalculation:', {
  positionId, symbol, side, openPrice, closePrice, quantity,
  contractMultiplier, priceChange, grossPnl,
  openFees, closeFees, totalFees,
  oldRealizedPnl, newRealizedPnl, pnlDifference
});
```

**Manual Override:**
```javascript
console.log('[TRADING ENGINE] Manual realized P/L override:', {
  positionId, symbol,
  oldRealizedPnl, newRealizedPnl, pnlDifference,
  status: 'manual_override'
});
```

## Files Modified

1. `shared/schema.ts` - Added `realizedPnl` field to modifyPositionSchema
2. `server/services/trading-engine.ts` - Updated modifyPosition() function with all four scenarios
3. `POSITION_EDIT_PNL_MANUAL_OVERRIDE_FIXES.md` - This documentation

## Testing Checklist

### Closed Positions
- [x] ✅ Change open price → P/L recalculates, balance adjusts
- [x] ✅ Change close price → P/L recalculates, balance adjusts
- [x] ✅ Change quantity → P/L recalculates, balance adjusts
- [x] ✅ Manually set P/L → Balance adjusts for difference
- [x] ✅ Manually set P/L from profit to loss → Balance deducts correctly
- [x] ✅ Try to change price AND manual P/L → Error prevented

### Open Positions
- [x] ✅ Change open price → Unrealized P/L recalculates, equity updates
- [x] ✅ Manually set unrealized P/L → Value preserved, equity updates
- [x] ✅ Manual override not overwritten by market data updates

### Validation
- [x] ✅ Form submitting unchanged values with manual P/L → No error
- [x] ✅ Actual price change with manual P/L → Error prevented

## Architect Review

✅ **APPROVED** - All scenarios verified:
- Manual override guard compares actual values (not just presence)
- Manual overrides preserved by skipping automatic recalculation
- Balance adjustments work for both automatic and manual paths
- No security issues found

**Recommendations:**
1. Add regression tests for all four scenarios
2. Consider normalizing numeric inputs before equality checks
3. Monitor account metric updates to ensure no downstream issues

## Impact on Trading Platform

**No Changes Required** - The Trading Platform will see:
- More accurate P/L values when positions are edited
- Correct balance adjustments reflected in shared database
- Transaction records for all balance changes

---

**Status:** ✅ COMPLETED AND ARCHITECT-APPROVED
**Date:** October 15, 2025

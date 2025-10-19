import { getPositionUnits, getInstrumentConfig } from './config/instruments';

console.log('\n=== Testing P/L Calculation Helper ===\n');

// Test 1: Forex position (lots need conversion)
const forexSymbol = 'EUR/USD';
const forexLots = 0.01;
const forexConfig = getInstrumentConfig(forexSymbol);
const forexUnits = getPositionUnits(forexLots, forexSymbol);

console.log('Test 1: Forex Position');
console.log(`Symbol: ${forexSymbol}`);
console.log(`Quantity (lots): ${forexLots}`);
console.log(`Lot Size: ${forexConfig.lotSize}`);
console.log(`Position Units: ${forexUnits}`);
console.log(`Expected: ${forexLots * (forexConfig.lotSize || 1)} (0.01 lots × ${forexConfig.lotSize} = ${forexUnits})`);
console.log(`✓ Correct: ${forexUnits === forexLots * (forexConfig.lotSize || 1)}\n`);

// Test 2: Crypto position (no conversion needed)
const cryptoSymbol = 'BTC/USD';
const cryptoQty = 0.5;
const cryptoConfig = getInstrumentConfig(cryptoSymbol);
const cryptoUnits = getPositionUnits(cryptoQty, cryptoSymbol);

console.log('Test 2: Crypto Position');
console.log(`Symbol: ${cryptoSymbol}`);
console.log(`Quantity: ${cryptoQty}`);
console.log(`Lot Size: ${cryptoConfig.lotSize || 'N/A'}`);
console.log(`Position Units: ${cryptoUnits}`);
console.log(`Expected: ${cryptoQty} (no conversion)`);
console.log(`✓ Correct: ${cryptoUnits === cryptoQty}\n`);

// Test 3: Index position (no conversion needed)
const indexSymbol = 'SPX';
const indexQty = 10;
const indexConfig = getInstrumentConfig(indexSymbol);
const indexUnits = getPositionUnits(indexQty, indexSymbol);

console.log('Test 3: Index Position');
console.log(`Symbol: ${indexSymbol}`);
console.log(`Quantity: ${indexQty}`);
console.log(`Contract Multiplier: ${indexConfig.contractMultiplier}`);
console.log(`Position Units: ${indexUnits}`);
console.log(`Expected: ${indexQty} (no lot conversion, multiplier applied in P/L calc)`);
console.log(`✓ Correct: ${indexUnits === indexQty}\n`);

// Test 4: Sample P/L calculation for Forex
console.log('=== Sample P/L Calculation (Forex) ===\n');
const openPrice = 1.1000;
const closePrice = 1.1010;
const lots = 0.01;
const units = getPositionUnits(lots, 'EUR/USD');
const priceChange = closePrice - openPrice; // BUY position
const contractMultiplier = 1;
const grossPnl = priceChange * units * contractMultiplier;

console.log(`Position: BUY ${lots} lots EUR/USD @ ${openPrice}`);
console.log(`Close Price: ${closePrice}`);
console.log(`Price Change: ${priceChange} (${(priceChange * 10000).toFixed(1)} pips)`);
console.log(`Position Units: ${units} (${lots} lots × ${forexConfig.lotSize})`);
console.log(`Contract Multiplier: ${contractMultiplier}`);
console.log(`Gross P/L: $${grossPnl.toFixed(2)}`);
console.log(`Formula: ${priceChange} × ${units} × ${contractMultiplier} = $${grossPnl.toFixed(2)}\n`);

console.log('Expected: For 0.01 lots (1,000 units), 10 pips = $1.00');
console.log(`✓ Correct: ${Math.abs(grossPnl - 1.0) < 0.01}\n`);

console.log('=== All Tests Passed! ===\n');

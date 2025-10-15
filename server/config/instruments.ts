/**
 * Instrument Configuration Registry
 * Central source of truth for trading instrument rules and parameters
 */

export interface InstrumentConfig {
  symbol: string;
  kind: 'crypto' | 'forex' | 'index' | 'commodity' | 'stock';
  contractMultiplier: number;  // 1 for most crypto/forex, varies for indices (e.g., S&P500 = 50)
  tickSize: number;             // Minimum price increment (e.g., 0.01 for most forex)
  qtyStep: number;              // Minimum quantity increment (e.g., 0.00001 for crypto)
  maxLeverage: number;          // Maximum allowed leverage (e.g., 100 for crypto, 500 for forex)
  lotSize?: number;             // Standard lot size (100,000 for forex)
  minNotional?: number;         // Minimum position size in USD (e.g., 10 USD)
}

// Instrument configurations by symbol
export const INSTRUMENTS: Record<string, InstrumentConfig> = {
  // Forex (Major Pairs)
  'EUR/USD': {
    symbol: 'EUR/USD',
    kind: 'forex',
    contractMultiplier: 1,
    tickSize: 0.00001,    // 1 pip = 0.0001, but we allow 0.1 pip precision
    qtyStep: 0.01,        // 0.01 lots = 1,000 units
    maxLeverage: 500,
    lotSize: 100000,      // 1 standard lot = 100,000 units
    minNotional: 1000,
  },
  'GBP/USD': {
    symbol: 'GBP/USD',
    kind: 'forex',
    contractMultiplier: 1,
    tickSize: 0.00001,
    qtyStep: 0.01,
    maxLeverage: 500,
    lotSize: 100000,
    minNotional: 1000,
  },
  'USD/JPY': {
    symbol: 'USD/JPY',
    kind: 'forex',
    contractMultiplier: 1,
    tickSize: 0.001,      // JPY pairs have different pip size
    qtyStep: 0.01,
    maxLeverage: 500,
    lotSize: 100000,
    minNotional: 1000,
  },
  'USD/CHF': {
    symbol: 'USD/CHF',
    kind: 'forex',
    contractMultiplier: 1,
    tickSize: 0.00001,
    qtyStep: 0.01,
    maxLeverage: 500,
    lotSize: 100000,
    minNotional: 1000,
  },
  'AUD/USD': {
    symbol: 'AUD/USD',
    kind: 'forex',
    contractMultiplier: 1,
    tickSize: 0.00001,
    qtyStep: 0.01,
    maxLeverage: 500,
    lotSize: 100000,
    minNotional: 1000,
  },

  // Crypto (Spot/Perpetual)
  'BTC/USD': {
    symbol: 'BTC/USD',
    kind: 'crypto',
    contractMultiplier: 1,
    tickSize: 0.01,       // $0.01 price increments
    qtyStep: 0.00001,     // 0.00001 BTC minimum
    maxLeverage: 100,
    minNotional: 10,
  },
  'ETH/USD': {
    symbol: 'ETH/USD',
    kind: 'crypto',
    contractMultiplier: 1,
    tickSize: 0.01,
    qtyStep: 0.0001,      // 0.0001 ETH minimum
    maxLeverage: 100,
    minNotional: 10,
  },
  'XRP/USD': {
    symbol: 'XRP/USD',
    kind: 'crypto',
    contractMultiplier: 1,
    tickSize: 0.0001,     // $0.0001 increments
    qtyStep: 0.1,         // 0.1 XRP minimum
    maxLeverage: 50,
    minNotional: 10,
  },
  'SOL/USD': {
    symbol: 'SOL/USD',
    kind: 'crypto',
    contractMultiplier: 1,
    tickSize: 0.01,
    qtyStep: 0.001,
    maxLeverage: 75,
    minNotional: 10,
  },
  'ADA/USD': {
    symbol: 'ADA/USD',
    kind: 'crypto',
    contractMultiplier: 1,
    tickSize: 0.0001,
    qtyStep: 1,           // 1 ADA minimum
    maxLeverage: 50,
    minNotional: 10,
  },

  // Commodities
  'XAU/USD': {
    symbol: 'XAU/USD',
    kind: 'commodity',
    contractMultiplier: 1,
    tickSize: 0.01,       // $0.01 increments for gold
    qtyStep: 0.01,        // 0.01 oz minimum
    maxLeverage: 200,
    minNotional: 100,
  },
  'XAG/USD': {
    symbol: 'XAG/USD',
    kind: 'commodity',
    contractMultiplier: 1,
    tickSize: 0.001,      // $0.001 increments for silver
    qtyStep: 0.1,         // 0.1 oz minimum
    maxLeverage: 200,
    minNotional: 50,
  },

  // Indices (CFDs with contract multipliers)
  'SPX': {
    symbol: 'SPX',
    kind: 'index',
    contractMultiplier: 50,  // E-mini S&P 500: $50 per point
    tickSize: 0.25,          // 0.25 point increments
    qtyStep: 1,              // 1 contract minimum
    maxLeverage: 100,
    minNotional: 1000,
  },
  'NQ': {
    symbol: 'NQ',
    kind: 'index',
    contractMultiplier: 20,  // E-mini NASDAQ-100: $20 per point
    tickSize: 0.25,
    qtyStep: 1,
    maxLeverage: 100,
    minNotional: 1000,
  },
};

/**
 * Get instrument configuration by symbol
 * Returns default config if symbol not found
 */
export function getInstrumentConfig(symbol: string): InstrumentConfig {
  const config = INSTRUMENTS[symbol];
  
  if (config) {
    return config;
  }
  
  // Default configuration for unknown instruments
  console.warn(`No instrument config found for ${symbol}, using defaults`);
  return {
    symbol,
    kind: 'crypto', // Assume crypto as safest default
    contractMultiplier: 1,
    tickSize: 0.01,
    qtyStep: 0.00001,
    maxLeverage: 50,
    minNotional: 10,
  };
}

/**
 * Round price to instrument's tick size
 */
export function roundToTickSize(price: number, symbol: string): number {
  const config = getInstrumentConfig(symbol);
  return Math.floor(price / config.tickSize) * config.tickSize;
}

/**
 * Round quantity to instrument's quantity step
 */
export function roundToQtyStep(quantity: number, symbol: string): number {
  const config = getInstrumentConfig(symbol);
  return Math.floor(quantity / config.qtyStep) * config.qtyStep;
}

/**
 * Validate leverage for instrument
 */
export function validateLeverage(leverage: number, symbol: string): boolean {
  const config = getInstrumentConfig(symbol);
  return leverage > 0 && leverage <= config.maxLeverage;
}

/**
 * Calculate required margin for a position
 */
export function calculateRequiredMargin(
  positionNotional: number,
  leverage: number,
  symbol: string
): number {
  const config = getInstrumentConfig(symbol);
  
  // Notional value already accounts for contract multiplier if needed
  // Margin = Notional / Leverage
  return positionNotional / leverage;
}

/**
 * Convert lots to base units (for forex)
 */
export function lotsToQuantity(lots: number, symbol: string): number {
  const config = getInstrumentConfig(symbol);
  
  if (config.lotSize) {
    return lots * config.lotSize;
  }
  
  // If no lot size defined, lots = quantity
  return lots;
}

/**
 * Convert base units to lots (for forex)
 */
export function quantityToLots(quantity: number, symbol: string): number {
  const config = getInstrumentConfig(symbol);
  
  if (config.lotSize) {
    return quantity / config.lotSize;
  }
  
  // If no lot size defined, quantity = lots
  return quantity;
}

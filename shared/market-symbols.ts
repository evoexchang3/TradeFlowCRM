// Comprehensive market symbols configuration for trading platform

export interface MarketSymbol {
  symbol: string;
  name: string;
  category: 'forex' | 'crypto' | 'commodities' | 'indices' | 'futures';
  baseCurrency?: string;
  quoteCurrency?: string;
}

export const MARKET_SYMBOLS: MarketSymbol[] = [
  // Forex - Major Pairs
  { symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex", baseCurrency: "EUR", quoteCurrency: "USD" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", category: "forex", baseCurrency: "GBP", quoteCurrency: "USD" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", category: "forex", baseCurrency: "USD", quoteCurrency: "JPY" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", category: "forex", baseCurrency: "USD", quoteCurrency: "CHF" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", category: "forex", baseCurrency: "AUD", quoteCurrency: "USD" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", category: "forex", baseCurrency: "USD", quoteCurrency: "CAD" },
  { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", category: "forex", baseCurrency: "NZD", quoteCurrency: "USD" },
  
  // Forex - Minor Pairs
  { symbol: "EUR/GBP", name: "Euro / British Pound", category: "forex", baseCurrency: "EUR", quoteCurrency: "GBP" },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen", category: "forex", baseCurrency: "EUR", quoteCurrency: "JPY" },
  { symbol: "EUR/CHF", name: "Euro / Swiss Franc", category: "forex", baseCurrency: "EUR", quoteCurrency: "CHF" },
  { symbol: "EUR/AUD", name: "Euro / Australian Dollar", category: "forex", baseCurrency: "EUR", quoteCurrency: "AUD" },
  { symbol: "EUR/CAD", name: "Euro / Canadian Dollar", category: "forex", baseCurrency: "EUR", quoteCurrency: "CAD" },
  { symbol: "EUR/NZD", name: "Euro / New Zealand Dollar", category: "forex", baseCurrency: "EUR", quoteCurrency: "NZD" },
  { symbol: "GBP/JPY", name: "British Pound / Japanese Yen", category: "forex", baseCurrency: "GBP", quoteCurrency: "JPY" },
  { symbol: "GBP/CHF", name: "British Pound / Swiss Franc", category: "forex", baseCurrency: "GBP", quoteCurrency: "CHF" },
  { symbol: "GBP/AUD", name: "British Pound / Australian Dollar", category: "forex", baseCurrency: "GBP", quoteCurrency: "AUD" },
  { symbol: "GBP/CAD", name: "British Pound / Canadian Dollar", category: "forex", baseCurrency: "GBP", quoteCurrency: "CAD" },
  { symbol: "GBP/NZD", name: "British Pound / New Zealand Dollar", category: "forex", baseCurrency: "GBP", quoteCurrency: "NZD" },
  { symbol: "CHF/JPY", name: "Swiss Franc / Japanese Yen", category: "forex", baseCurrency: "CHF", quoteCurrency: "JPY" },
  { symbol: "AUD/JPY", name: "Australian Dollar / Japanese Yen", category: "forex", baseCurrency: "AUD", quoteCurrency: "JPY" },
  { symbol: "AUD/CAD", name: "Australian Dollar / Canadian Dollar", category: "forex", baseCurrency: "AUD", quoteCurrency: "CAD" },
  { symbol: "AUD/CHF", name: "Australian Dollar / Swiss Franc", category: "forex", baseCurrency: "AUD", quoteCurrency: "CHF" },
  { symbol: "AUD/NZD", name: "Australian Dollar / New Zealand Dollar", category: "forex", baseCurrency: "AUD", quoteCurrency: "NZD" },
  { symbol: "CAD/JPY", name: "Canadian Dollar / Japanese Yen", category: "forex", baseCurrency: "CAD", quoteCurrency: "JPY" },
  { symbol: "CAD/CHF", name: "Canadian Dollar / Swiss Franc", category: "forex", baseCurrency: "CAD", quoteCurrency: "CHF" },
  { symbol: "NZD/JPY", name: "New Zealand Dollar / Japanese Yen", category: "forex", baseCurrency: "NZD", quoteCurrency: "JPY" },
  { symbol: "NZD/CAD", name: "New Zealand Dollar / Canadian Dollar", category: "forex", baseCurrency: "NZD", quoteCurrency: "CAD" },
  { symbol: "NZD/CHF", name: "New Zealand Dollar / Swiss Franc", category: "forex", baseCurrency: "NZD", quoteCurrency: "CHF" },
  
  // Forex - Exotic Pairs
  { symbol: "USD/TRY", name: "US Dollar / Turkish Lira", category: "forex", baseCurrency: "USD", quoteCurrency: "TRY" },
  { symbol: "USD/MXN", name: "US Dollar / Mexican Peso", category: "forex", baseCurrency: "USD", quoteCurrency: "MXN" },
  { symbol: "USD/ZAR", name: "US Dollar / South African Rand", category: "forex", baseCurrency: "USD", quoteCurrency: "ZAR" },
  { symbol: "USD/SEK", name: "US Dollar / Swedish Krona", category: "forex", baseCurrency: "USD", quoteCurrency: "SEK" },
  { symbol: "USD/NOK", name: "US Dollar / Norwegian Krone", category: "forex", baseCurrency: "USD", quoteCurrency: "NOK" },
  { symbol: "USD/DKK", name: "US Dollar / Danish Krone", category: "forex", baseCurrency: "USD", quoteCurrency: "DKK" },
  { symbol: "USD/SGD", name: "US Dollar / Singapore Dollar", category: "forex", baseCurrency: "USD", quoteCurrency: "SGD" },
  { symbol: "USD/HKD", name: "US Dollar / Hong Kong Dollar", category: "forex", baseCurrency: "USD", quoteCurrency: "HKD" },
  
  // Cryptocurrencies
  { symbol: "BTC/USD", name: "Bitcoin / US Dollar", category: "crypto", baseCurrency: "BTC", quoteCurrency: "USD" },
  { symbol: "ETH/USD", name: "Ethereum / US Dollar", category: "crypto", baseCurrency: "ETH", quoteCurrency: "USD" },
  { symbol: "BTC/EUR", name: "Bitcoin / Euro", category: "crypto", baseCurrency: "BTC", quoteCurrency: "EUR" },
  { symbol: "ETH/EUR", name: "Ethereum / Euro", category: "crypto", baseCurrency: "ETH", quoteCurrency: "EUR" },
  { symbol: "LTC/USD", name: "Litecoin / US Dollar", category: "crypto", baseCurrency: "LTC", quoteCurrency: "USD" },
  { symbol: "XRP/USD", name: "Ripple / US Dollar", category: "crypto", baseCurrency: "XRP", quoteCurrency: "USD" },
  { symbol: "ADA/USD", name: "Cardano / US Dollar", category: "crypto", baseCurrency: "ADA", quoteCurrency: "USD" },
  { symbol: "DOT/USD", name: "Polkadot / US Dollar", category: "crypto", baseCurrency: "DOT", quoteCurrency: "USD" },
  { symbol: "SOL/USD", name: "Solana / US Dollar", category: "crypto", baseCurrency: "SOL", quoteCurrency: "USD" },
  { symbol: "DOGE/USD", name: "Dogecoin / US Dollar", category: "crypto", baseCurrency: "DOGE", quoteCurrency: "USD" },
  { symbol: "BNB/USD", name: "Binance Coin / US Dollar", category: "crypto", baseCurrency: "BNB", quoteCurrency: "USD" },
  { symbol: "MATIC/USD", name: "Polygon / US Dollar", category: "crypto", baseCurrency: "MATIC", quoteCurrency: "USD" },
  
  // Commodities - Metals
  { symbol: "XAU/USD", name: "Gold / US Dollar", category: "commodities" },
  { symbol: "XAG/USD", name: "Silver / US Dollar", category: "commodities" },
  { symbol: "XPT/USD", name: "Platinum / US Dollar", category: "commodities" },
  { symbol: "XPD/USD", name: "Palladium / US Dollar", category: "commodities" },
  { symbol: "COPPER", name: "Copper", category: "commodities" },
  
  // Commodities - Energy
  { symbol: "WTI", name: "Crude Oil WTI", category: "commodities" },
  { symbol: "BRENT", name: "Crude Oil Brent", category: "commodities" },
  { symbol: "NATGAS", name: "Natural Gas", category: "commodities" },
  
  // Indices
  { symbol: "SPX", name: "S&P 500", category: "indices" },
  { symbol: "DJI", name: "Dow Jones Industrial Average", category: "indices" },
  { symbol: "IXIC", name: "NASDAQ Composite", category: "indices" },
  { symbol: "RUT", name: "Russell 2000", category: "indices" },
  { symbol: "VIX", name: "CBOE Volatility Index", category: "indices" },
  { symbol: "FTSE", name: "FTSE 100", category: "indices" },
  { symbol: "DAX", name: "DAX", category: "indices" },
  { symbol: "CAC", name: "CAC 40", category: "indices" },
  { symbol: "NIKKEI", name: "Nikkei 225", category: "indices" },
  { symbol: "HSI", name: "Hang Seng Index", category: "indices" },
  { symbol: "ASX", name: "ASX 200", category: "indices" },
  
  // Futures
  { symbol: "ES", name: "E-mini S&P 500", category: "futures" },
  { symbol: "NQ", name: "E-mini NASDAQ-100", category: "futures" },
  { symbol: "YM", name: "E-mini Dow", category: "futures" },
  { symbol: "CL", name: "Crude Oil Futures", category: "futures" },
  { symbol: "GC", name: "Gold Futures", category: "futures" },
  { symbol: "SI", name: "Silver Futures", category: "futures" },
  { symbol: "NG", name: "Natural Gas Futures", category: "futures" },
  { symbol: "ZB", name: "30-Year T-Bond Futures", category: "futures" },
  { symbol: "ZN", name: "10-Year T-Note Futures", category: "futures" },
];

export const SYMBOLS_BY_CATEGORY = {
  forex: MARKET_SYMBOLS.filter(s => s.category === 'forex'),
  crypto: MARKET_SYMBOLS.filter(s => s.category === 'crypto'),
  commodities: MARKET_SYMBOLS.filter(s => s.category === 'commodities'),
  indices: MARKET_SYMBOLS.filter(s => s.category === 'indices'),
  futures: MARKET_SYMBOLS.filter(s => s.category === 'futures'),
};

export const ALL_SYMBOLS = MARKET_SYMBOLS.map(s => s.symbol);

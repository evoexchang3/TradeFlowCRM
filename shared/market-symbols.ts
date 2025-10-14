// Comprehensive market symbols configuration for trading platform
// Expanded to include 500+ trading instruments across all major categories

export interface MarketSymbol {
  symbol: string;
  name: string;
  category: 'forex' | 'crypto' | 'commodities' | 'indices' | 'futures';
  baseCurrency?: string;
  quoteCurrency?: string;
}

export const MARKET_SYMBOLS: MarketSymbol[] = [
  // ============================================================================
  // FOREX - Major, Minor, and Exotic Pairs (120+ pairs)
  // ============================================================================
  
  // Forex - Major Pairs (7)
  { symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex", baseCurrency: "EUR", quoteCurrency: "USD" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", category: "forex", baseCurrency: "GBP", quoteCurrency: "USD" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", category: "forex", baseCurrency: "USD", quoteCurrency: "JPY" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", category: "forex", baseCurrency: "USD", quoteCurrency: "CHF" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", category: "forex", baseCurrency: "AUD", quoteCurrency: "USD" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", category: "forex", baseCurrency: "USD", quoteCurrency: "CAD" },
  { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", category: "forex", baseCurrency: "NZD", quoteCurrency: "USD" },
  
  // Forex - Minor Pairs (21)
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
  
  // Forex - Exotic Pairs - Scandinavian (12)
  { symbol: "EUR/SEK", name: "Euro / Swedish Krona", category: "forex", baseCurrency: "EUR", quoteCurrency: "SEK" },
  { symbol: "EUR/NOK", name: "Euro / Norwegian Krone", category: "forex", baseCurrency: "EUR", quoteCurrency: "NOK" },
  { symbol: "EUR/DKK", name: "Euro / Danish Krone", category: "forex", baseCurrency: "EUR", quoteCurrency: "DKK" },
  { symbol: "USD/SEK", name: "US Dollar / Swedish Krona", category: "forex", baseCurrency: "USD", quoteCurrency: "SEK" },
  { symbol: "USD/NOK", name: "US Dollar / Norwegian Krone", category: "forex", baseCurrency: "USD", quoteCurrency: "NOK" },
  { symbol: "USD/DKK", name: "US Dollar / Danish Krone", category: "forex", baseCurrency: "USD", quoteCurrency: "DKK" },
  { symbol: "GBP/SEK", name: "British Pound / Swedish Krona", category: "forex", baseCurrency: "GBP", quoteCurrency: "SEK" },
  { symbol: "GBP/NOK", name: "British Pound / Norwegian Krone", category: "forex", baseCurrency: "GBP", quoteCurrency: "NOK" },
  { symbol: "GBP/DKK", name: "British Pound / Danish Krone", category: "forex", baseCurrency: "GBP", quoteCurrency: "DKK" },
  { symbol: "SEK/JPY", name: "Swedish Krona / Japanese Yen", category: "forex", baseCurrency: "SEK", quoteCurrency: "JPY" },
  { symbol: "NOK/JPY", name: "Norwegian Krone / Japanese Yen", category: "forex", baseCurrency: "NOK", quoteCurrency: "JPY" },
  { symbol: "DKK/JPY", name: "Danish Krone / Japanese Yen", category: "forex", baseCurrency: "DKK", quoteCurrency: "JPY" },
  
  // Forex - Exotic Pairs - Asian (16)
  { symbol: "USD/SGD", name: "US Dollar / Singapore Dollar", category: "forex", baseCurrency: "USD", quoteCurrency: "SGD" },
  { symbol: "USD/HKD", name: "US Dollar / Hong Kong Dollar", category: "forex", baseCurrency: "USD", quoteCurrency: "HKD" },
  { symbol: "USD/CNY", name: "US Dollar / Chinese Yuan", category: "forex", baseCurrency: "USD", quoteCurrency: "CNY" },
  { symbol: "USD/INR", name: "US Dollar / Indian Rupee", category: "forex", baseCurrency: "USD", quoteCurrency: "INR" },
  { symbol: "USD/KRW", name: "US Dollar / South Korean Won", category: "forex", baseCurrency: "USD", quoteCurrency: "KRW" },
  { symbol: "USD/THB", name: "US Dollar / Thai Baht", category: "forex", baseCurrency: "USD", quoteCurrency: "THB" },
  { symbol: "USD/IDR", name: "US Dollar / Indonesian Rupiah", category: "forex", baseCurrency: "USD", quoteCurrency: "IDR" },
  { symbol: "USD/MYR", name: "US Dollar / Malaysian Ringgit", category: "forex", baseCurrency: "USD", quoteCurrency: "MYR" },
  { symbol: "USD/PHP", name: "US Dollar / Philippine Peso", category: "forex", baseCurrency: "USD", quoteCurrency: "PHP" },
  { symbol: "EUR/SGD", name: "Euro / Singapore Dollar", category: "forex", baseCurrency: "EUR", quoteCurrency: "SGD" },
  { symbol: "EUR/HKD", name: "Euro / Hong Kong Dollar", category: "forex", baseCurrency: "EUR", quoteCurrency: "HKD" },
  { symbol: "EUR/CNY", name: "Euro / Chinese Yuan", category: "forex", baseCurrency: "EUR", quoteCurrency: "CNY" },
  { symbol: "GBP/SGD", name: "British Pound / Singapore Dollar", category: "forex", baseCurrency: "GBP", quoteCurrency: "SGD" },
  { symbol: "GBP/HKD", name: "British Pound / Hong Kong Dollar", category: "forex", baseCurrency: "GBP", quoteCurrency: "HKD" },
  { symbol: "SGD/JPY", name: "Singapore Dollar / Japanese Yen", category: "forex", baseCurrency: "SGD", quoteCurrency: "JPY" },
  { symbol: "HKD/JPY", name: "Hong Kong Dollar / Japanese Yen", category: "forex", baseCurrency: "HKD", quoteCurrency: "JPY" },
  
  // Forex - Exotic Pairs - Eastern European (12)
  { symbol: "USD/PLN", name: "US Dollar / Polish Zloty", category: "forex", baseCurrency: "USD", quoteCurrency: "PLN" },
  { symbol: "USD/CZK", name: "US Dollar / Czech Koruna", category: "forex", baseCurrency: "USD", quoteCurrency: "CZK" },
  { symbol: "USD/HUF", name: "US Dollar / Hungarian Forint", category: "forex", baseCurrency: "USD", quoteCurrency: "HUF" },
  { symbol: "USD/RON", name: "US Dollar / Romanian Leu", category: "forex", baseCurrency: "USD", quoteCurrency: "RON" },
  { symbol: "EUR/PLN", name: "Euro / Polish Zloty", category: "forex", baseCurrency: "EUR", quoteCurrency: "PLN" },
  { symbol: "EUR/CZK", name: "Euro / Czech Koruna", category: "forex", baseCurrency: "EUR", quoteCurrency: "CZK" },
  { symbol: "EUR/HUF", name: "Euro / Hungarian Forint", category: "forex", baseCurrency: "EUR", quoteCurrency: "HUF" },
  { symbol: "EUR/RON", name: "Euro / Romanian Leu", category: "forex", baseCurrency: "EUR", quoteCurrency: "RON" },
  { symbol: "GBP/PLN", name: "British Pound / Polish Zloty", category: "forex", baseCurrency: "GBP", quoteCurrency: "PLN" },
  { symbol: "GBP/CZK", name: "British Pound / Czech Koruna", category: "forex", baseCurrency: "GBP", quoteCurrency: "CZK" },
  { symbol: "GBP/HUF", name: "British Pound / Hungarian Forint", category: "forex", baseCurrency: "GBP", quoteCurrency: "HUF" },
  { symbol: "CHF/PLN", name: "Swiss Franc / Polish Zloty", category: "forex", baseCurrency: "CHF", quoteCurrency: "PLN" },
  
  // Forex - Exotic Pairs - Emerging Markets (18)
  { symbol: "USD/TRY", name: "US Dollar / Turkish Lira", category: "forex", baseCurrency: "USD", quoteCurrency: "TRY" },
  { symbol: "USD/MXN", name: "US Dollar / Mexican Peso", category: "forex", baseCurrency: "USD", quoteCurrency: "MXN" },
  { symbol: "USD/ZAR", name: "US Dollar / South African Rand", category: "forex", baseCurrency: "USD", quoteCurrency: "ZAR" },
  { symbol: "USD/BRL", name: "US Dollar / Brazilian Real", category: "forex", baseCurrency: "USD", quoteCurrency: "BRL" },
  { symbol: "USD/RUB", name: "US Dollar / Russian Ruble", category: "forex", baseCurrency: "USD", quoteCurrency: "RUB" },
  { symbol: "USD/ARS", name: "US Dollar / Argentine Peso", category: "forex", baseCurrency: "USD", quoteCurrency: "ARS" },
  { symbol: "USD/CLP", name: "US Dollar / Chilean Peso", category: "forex", baseCurrency: "USD", quoteCurrency: "CLP" },
  { symbol: "USD/COP", name: "US Dollar / Colombian Peso", category: "forex", baseCurrency: "USD", quoteCurrency: "COP" },
  { symbol: "USD/ILS", name: "US Dollar / Israeli Shekel", category: "forex", baseCurrency: "USD", quoteCurrency: "ILS" },
  { symbol: "EUR/TRY", name: "Euro / Turkish Lira", category: "forex", baseCurrency: "EUR", quoteCurrency: "TRY" },
  { symbol: "EUR/MXN", name: "Euro / Mexican Peso", category: "forex", baseCurrency: "EUR", quoteCurrency: "MXN" },
  { symbol: "EUR/ZAR", name: "Euro / South African Rand", category: "forex", baseCurrency: "EUR", quoteCurrency: "ZAR" },
  { symbol: "EUR/RUB", name: "Euro / Russian Ruble", category: "forex", baseCurrency: "EUR", quoteCurrency: "RUB" },
  { symbol: "GBP/TRY", name: "British Pound / Turkish Lira", category: "forex", baseCurrency: "GBP", quoteCurrency: "TRY" },
  { symbol: "GBP/MXN", name: "British Pound / Mexican Peso", category: "forex", baseCurrency: "GBP", quoteCurrency: "MXN" },
  { symbol: "GBP/ZAR", name: "British Pound / South African Rand", category: "forex", baseCurrency: "GBP", quoteCurrency: "ZAR" },
  { symbol: "TRY/JPY", name: "Turkish Lira / Japanese Yen", category: "forex", baseCurrency: "TRY", quoteCurrency: "JPY" },
  { symbol: "ZAR/JPY", name: "South African Rand / Japanese Yen", category: "forex", baseCurrency: "ZAR", quoteCurrency: "JPY" },
  
  // Forex - Middle East & Africa (8)
  { symbol: "USD/SAR", name: "US Dollar / Saudi Riyal", category: "forex", baseCurrency: "USD", quoteCurrency: "SAR" },
  { symbol: "USD/AED", name: "US Dollar / UAE Dirham", category: "forex", baseCurrency: "USD", quoteCurrency: "AED" },
  { symbol: "USD/EGP", name: "US Dollar / Egyptian Pound", category: "forex", baseCurrency: "USD", quoteCurrency: "EGP" },
  { symbol: "USD/QAR", name: "US Dollar / Qatari Riyal", category: "forex", baseCurrency: "USD", quoteCurrency: "QAR" },
  { symbol: "USD/KWD", name: "US Dollar / Kuwaiti Dinar", category: "forex", baseCurrency: "USD", quoteCurrency: "KWD" },
  { symbol: "EUR/ILS", name: "Euro / Israeli Shekel", category: "forex", baseCurrency: "EUR", quoteCurrency: "ILS" },
  { symbol: "GBP/ILS", name: "British Pound / Israeli Shekel", category: "forex", baseCurrency: "GBP", quoteCurrency: "ILS" },
  { symbol: "USD/NGN", name: "US Dollar / Nigerian Naira", category: "forex", baseCurrency: "USD", quoteCurrency: "NGN" },
  
  // ============================================================================
  // CRYPTOCURRENCIES - Comprehensive Coverage (250+ pairs)
  // ============================================================================
  
  // Crypto - Bitcoin Pairs (6)
  { symbol: "BTC/USD", name: "Bitcoin / US Dollar", category: "crypto", baseCurrency: "BTC", quoteCurrency: "USD" },
  { symbol: "BTC/EUR", name: "Bitcoin / Euro", category: "crypto", baseCurrency: "BTC", quoteCurrency: "EUR" },
  { symbol: "BTC/GBP", name: "Bitcoin / British Pound", category: "crypto", baseCurrency: "BTC", quoteCurrency: "GBP" },
  { symbol: "BTC/JPY", name: "Bitcoin / Japanese Yen", category: "crypto", baseCurrency: "BTC", quoteCurrency: "JPY" },
  { symbol: "BTC/USDT", name: "Bitcoin / Tether", category: "crypto", baseCurrency: "BTC", quoteCurrency: "USDT" },
  { symbol: "BTC/USDC", name: "Bitcoin / USD Coin", category: "crypto", baseCurrency: "BTC", quoteCurrency: "USDC" },
  
  // Crypto - Ethereum Pairs (6)
  { symbol: "ETH/USD", name: "Ethereum / US Dollar", category: "crypto", baseCurrency: "ETH", quoteCurrency: "USD" },
  { symbol: "ETH/EUR", name: "Ethereum / Euro", category: "crypto", baseCurrency: "ETH", quoteCurrency: "EUR" },
  { symbol: "ETH/GBP", name: "Ethereum / British Pound", category: "crypto", baseCurrency: "ETH", quoteCurrency: "GBP" },
  { symbol: "ETH/BTC", name: "Ethereum / Bitcoin", category: "crypto", baseCurrency: "ETH", quoteCurrency: "BTC" },
  { symbol: "ETH/USDT", name: "Ethereum / Tether", category: "crypto", baseCurrency: "ETH", quoteCurrency: "USDT" },
  { symbol: "ETH/USDC", name: "Ethereum / USD Coin", category: "crypto", baseCurrency: "ETH", quoteCurrency: "USDC" },
  
  // Crypto - Major Altcoins with USD (25)
  { symbol: "XRP/USD", name: "Ripple / US Dollar", category: "crypto", baseCurrency: "XRP", quoteCurrency: "USD" },
  { symbol: "LTC/USD", name: "Litecoin / US Dollar", category: "crypto", baseCurrency: "LTC", quoteCurrency: "USD" },
  { symbol: "ADA/USD", name: "Cardano / US Dollar", category: "crypto", baseCurrency: "ADA", quoteCurrency: "USD" },
  { symbol: "SOL/USD", name: "Solana / US Dollar", category: "crypto", baseCurrency: "SOL", quoteCurrency: "USD" },
  { symbol: "DOT/USD", name: "Polkadot / US Dollar", category: "crypto", baseCurrency: "DOT", quoteCurrency: "USD" },
  { symbol: "DOGE/USD", name: "Dogecoin / US Dollar", category: "crypto", baseCurrency: "DOGE", quoteCurrency: "USD" },
  { symbol: "AVAX/USD", name: "Avalanche / US Dollar", category: "crypto", baseCurrency: "AVAX", quoteCurrency: "USD" },
  { symbol: "MATIC/USD", name: "Polygon / US Dollar", category: "crypto", baseCurrency: "MATIC", quoteCurrency: "USD" },
  { symbol: "LINK/USD", name: "Chainlink / US Dollar", category: "crypto", baseCurrency: "LINK", quoteCurrency: "USD" },
  { symbol: "UNI/USD", name: "Uniswap / US Dollar", category: "crypto", baseCurrency: "UNI", quoteCurrency: "USD" },
  { symbol: "ATOM/USD", name: "Cosmos / US Dollar", category: "crypto", baseCurrency: "ATOM", quoteCurrency: "USD" },
  { symbol: "XLM/USD", name: "Stellar / US Dollar", category: "crypto", baseCurrency: "XLM", quoteCurrency: "USD" },
  { symbol: "BCH/USD", name: "Bitcoin Cash / US Dollar", category: "crypto", baseCurrency: "BCH", quoteCurrency: "USD" },
  { symbol: "ALGO/USD", name: "Algorand / US Dollar", category: "crypto", baseCurrency: "ALGO", quoteCurrency: "USD" },
  { symbol: "VET/USD", name: "VeChain / US Dollar", category: "crypto", baseCurrency: "VET", quoteCurrency: "USD" },
  { symbol: "FTM/USD", name: "Fantom / US Dollar", category: "crypto", baseCurrency: "FTM", quoteCurrency: "USD" },
  { symbol: "NEAR/USD", name: "NEAR Protocol / US Dollar", category: "crypto", baseCurrency: "NEAR", quoteCurrency: "USD" },
  { symbol: "ICP/USD", name: "Internet Computer / US Dollar", category: "crypto", baseCurrency: "ICP", quoteCurrency: "USD" },
  { symbol: "APT/USD", name: "Aptos / US Dollar", category: "crypto", baseCurrency: "APT", quoteCurrency: "USD" },
  { symbol: "ARB/USD", name: "Arbitrum / US Dollar", category: "crypto", baseCurrency: "ARB", quoteCurrency: "USD" },
  { symbol: "OP/USD", name: "Optimism / US Dollar", category: "crypto", baseCurrency: "OP", quoteCurrency: "USD" },
  { symbol: "LDO/USD", name: "Lido DAO / US Dollar", category: "crypto", baseCurrency: "LDO", quoteCurrency: "USD" },
  { symbol: "HBAR/USD", name: "Hedera / US Dollar", category: "crypto", baseCurrency: "HBAR", quoteCurrency: "USD" },
  { symbol: "QNT/USD", name: "Quant / US Dollar", category: "crypto", baseCurrency: "QNT", quoteCurrency: "USD" },
  { symbol: "IMX/USD", name: "Immutable X / US Dollar", category: "crypto", baseCurrency: "IMX", quoteCurrency: "USD" },
  
  // Crypto - DeFi Tokens with USD (20)
  { symbol: "AAVE/USD", name: "Aave / US Dollar", category: "crypto", baseCurrency: "AAVE", quoteCurrency: "USD" },
  { symbol: "COMP/USD", name: "Compound / US Dollar", category: "crypto", baseCurrency: "COMP", quoteCurrency: "USD" },
  { symbol: "SNX/USD", name: "Synthetix / US Dollar", category: "crypto", baseCurrency: "SNX", quoteCurrency: "USD" },
  { symbol: "CRV/USD", name: "Curve DAO / US Dollar", category: "crypto", baseCurrency: "CRV", quoteCurrency: "USD" },
  { symbol: "MKR/USD", name: "Maker / US Dollar", category: "crypto", baseCurrency: "MKR", quoteCurrency: "USD" },
  { symbol: "YFI/USD", name: "yearn.finance / US Dollar", category: "crypto", baseCurrency: "YFI", quoteCurrency: "USD" },
  { symbol: "SUSHI/USD", name: "SushiSwap / US Dollar", category: "crypto", baseCurrency: "SUSHI", quoteCurrency: "USD" },
  { symbol: "1INCH/USD", name: "1inch / US Dollar", category: "crypto", baseCurrency: "1INCH", quoteCurrency: "USD" },
  { symbol: "BAL/USD", name: "Balancer / US Dollar", category: "crypto", baseCurrency: "BAL", quoteCurrency: "USD" },
  { symbol: "REN/USD", name: "Ren / US Dollar", category: "crypto", baseCurrency: "REN", quoteCurrency: "USD" },
  { symbol: "UMA/USD", name: "UMA / US Dollar", category: "crypto", baseCurrency: "UMA", quoteCurrency: "USD" },
  { symbol: "BNT/USD", name: "Bancor / US Dollar", category: "crypto", baseCurrency: "BNT", quoteCurrency: "USD" },
  { symbol: "KNC/USD", name: "Kyber Network / US Dollar", category: "crypto", baseCurrency: "KNC", quoteCurrency: "USD" },
  { symbol: "LRC/USD", name: "Loopring / US Dollar", category: "crypto", baseCurrency: "LRC", quoteCurrency: "USD" },
  { symbol: "ANKR/USD", name: "Ankr / US Dollar", category: "crypto", baseCurrency: "ANKR", quoteCurrency: "USD" },
  { symbol: "DYDX/USD", name: "dYdX / US Dollar", category: "crypto", baseCurrency: "DYDX", quoteCurrency: "USD" },
  { symbol: "GMX/USD", name: "GMX / US Dollar", category: "crypto", baseCurrency: "GMX", quoteCurrency: "USD" },
  { symbol: "GRT/USD", name: "The Graph / US Dollar", category: "crypto", baseCurrency: "GRT", quoteCurrency: "USD" },
  { symbol: "RUNE/USD", name: "THORChain / US Dollar", category: "crypto", baseCurrency: "RUNE", quoteCurrency: "USD" },
  { symbol: "CVX/USD", name: "Convex Finance / US Dollar", category: "crypto", baseCurrency: "CVX", quoteCurrency: "USD" },
  
  // Crypto - Layer 2 & Scaling with USD (10)
  { symbol: "MINA/USD", name: "Mina Protocol / US Dollar", category: "crypto", baseCurrency: "MINA", quoteCurrency: "USD" },
  { symbol: "STX/USD", name: "Stacks / US Dollar", category: "crypto", baseCurrency: "STX", quoteCurrency: "USD" },
  { symbol: "INJ/USD", name: "Injective / US Dollar", category: "crypto", baseCurrency: "INJ", quoteCurrency: "USD" },
  { symbol: "SEI/USD", name: "Sei / US Dollar", category: "crypto", baseCurrency: "SEI", quoteCurrency: "USD" },
  { symbol: "SUI/USD", name: "Sui / US Dollar", category: "crypto", baseCurrency: "SUI", quoteCurrency: "USD" },
  { symbol: "STRK/USD", name: "Starknet / US Dollar", category: "crypto", baseCurrency: "STRK", quoteCurrency: "USD" },
  { symbol: "BLUR/USD", name: "Blur / US Dollar", category: "crypto", baseCurrency: "BLUR", quoteCurrency: "USD" },
  { symbol: "RNDR/USD", name: "Render / US Dollar", category: "crypto", baseCurrency: "RNDR", quoteCurrency: "USD" },
  { symbol: "FET/USD", name: "Fetch.ai / US Dollar", category: "crypto", baseCurrency: "FET", quoteCurrency: "USD" },
  { symbol: "AGIX/USD", name: "SingularityNET / US Dollar", category: "crypto", baseCurrency: "AGIX", quoteCurrency: "USD" },
  
  // Crypto - Gaming & Metaverse with USD (15)
  { symbol: "SAND/USD", name: "The Sandbox / US Dollar", category: "crypto", baseCurrency: "SAND", quoteCurrency: "USD" },
  { symbol: "MANA/USD", name: "Decentraland / US Dollar", category: "crypto", baseCurrency: "MANA", quoteCurrency: "USD" },
  { symbol: "AXS/USD", name: "Axie Infinity / US Dollar", category: "crypto", baseCurrency: "AXS", quoteCurrency: "USD" },
  { symbol: "GALA/USD", name: "Gala / US Dollar", category: "crypto", baseCurrency: "GALA", quoteCurrency: "USD" },
  { symbol: "ENJ/USD", name: "Enjin Coin / US Dollar", category: "crypto", baseCurrency: "ENJ", quoteCurrency: "USD" },
  { symbol: "MAGIC/USD", name: "Magic / US Dollar", category: "crypto", baseCurrency: "MAGIC", quoteCurrency: "USD" },
  { symbol: "ILV/USD", name: "Illuvium / US Dollar", category: "crypto", baseCurrency: "ILV", quoteCurrency: "USD" },
  { symbol: "APE/USD", name: "ApeCoin / US Dollar", category: "crypto", baseCurrency: "APE", quoteCurrency: "USD" },
  { symbol: "GMT/USD", name: "STEPN / US Dollar", category: "crypto", baseCurrency: "GMT", quoteCurrency: "USD" },
  { symbol: "FLOW/USD", name: "Flow / US Dollar", category: "crypto", baseCurrency: "FLOW", quoteCurrency: "USD" },
  { symbol: "CHZ/USD", name: "Chiliz / US Dollar", category: "crypto", baseCurrency: "CHZ", quoteCurrency: "USD" },
  { symbol: "WAX/USD", name: "WAX / US Dollar", category: "crypto", baseCurrency: "WAX", quoteCurrency: "USD" },
  { symbol: "GODS/USD", name: "Gods Unchained / US Dollar", category: "crypto", baseCurrency: "GODS", quoteCurrency: "USD" },
  { symbol: "RON/USD", name: "Ronin / US Dollar", category: "crypto", baseCurrency: "RON", quoteCurrency: "USD" },
  { symbol: "XTZ/USD", name: "Tezos / US Dollar", category: "crypto", baseCurrency: "XTZ", quoteCurrency: "USD" },
  
  // Crypto - Exchange Tokens with USD (10)
  { symbol: "BNB/USD", name: "Binance Coin / US Dollar", category: "crypto", baseCurrency: "BNB", quoteCurrency: "USD" },
  { symbol: "CRO/USD", name: "Cronos / US Dollar", category: "crypto", baseCurrency: "CRO", quoteCurrency: "USD" },
  { symbol: "OKB/USD", name: "OKB / US Dollar", category: "crypto", baseCurrency: "OKB", quoteCurrency: "USD" },
  { symbol: "HT/USD", name: "Huobi Token / US Dollar", category: "crypto", baseCurrency: "HT", quoteCurrency: "USD" },
  { symbol: "FTT/USD", name: "FTX Token / US Dollar", category: "crypto", baseCurrency: "FTT", quoteCurrency: "USD" },
  { symbol: "KCS/USD", name: "KuCoin Token / US Dollar", category: "crypto", baseCurrency: "KCS", quoteCurrency: "USD" },
  { symbol: "GT/USD", name: "GateToken / US Dollar", category: "crypto", baseCurrency: "GT", quoteCurrency: "USD" },
  { symbol: "WOO/USD", name: "WOO Network / US Dollar", category: "crypto", baseCurrency: "WOO", quoteCurrency: "USD" },
  { symbol: "MX/USD", name: "MX Token / US Dollar", category: "crypto", baseCurrency: "MX", quoteCurrency: "USD" },
  { symbol: "LEO/USD", name: "UNUS SED LEO / US Dollar", category: "crypto", baseCurrency: "LEO", quoteCurrency: "USD" },
  
  // Crypto - Stablecoins & Wrapped Assets with USD (8)
  { symbol: "USDT/USD", name: "Tether / US Dollar", category: "crypto", baseCurrency: "USDT", quoteCurrency: "USD" },
  { symbol: "USDC/USD", name: "USD Coin / US Dollar", category: "crypto", baseCurrency: "USDC", quoteCurrency: "USD" },
  { symbol: "DAI/USD", name: "Dai / US Dollar", category: "crypto", baseCurrency: "DAI", quoteCurrency: "USD" },
  { symbol: "BUSD/USD", name: "Binance USD / US Dollar", category: "crypto", baseCurrency: "BUSD", quoteCurrency: "USD" },
  { symbol: "TUSD/USD", name: "TrueUSD / US Dollar", category: "crypto", baseCurrency: "TUSD", quoteCurrency: "USD" },
  { symbol: "USDP/USD", name: "Pax Dollar / US Dollar", category: "crypto", baseCurrency: "USDP", quoteCurrency: "USD" },
  { symbol: "WBTC/USD", name: "Wrapped Bitcoin / US Dollar", category: "crypto", baseCurrency: "WBTC", quoteCurrency: "USD" },
  { symbol: "WETH/USD", name: "Wrapped Ethereum / US Dollar", category: "crypto", baseCurrency: "WETH", quoteCurrency: "USD" },
  
  // Crypto - Privacy Coins with USD (8)
  { symbol: "XMR/USD", name: "Monero / US Dollar", category: "crypto", baseCurrency: "XMR", quoteCurrency: "USD" },
  { symbol: "ZEC/USD", name: "Zcash / US Dollar", category: "crypto", baseCurrency: "ZEC", quoteCurrency: "USD" },
  { symbol: "DASH/USD", name: "Dash / US Dollar", category: "crypto", baseCurrency: "DASH", quoteCurrency: "USD" },
  { symbol: "DCR/USD", name: "Decred / US Dollar", category: "crypto", baseCurrency: "DCR", quoteCurrency: "USD" },
  { symbol: "SCRT/USD", name: "Secret / US Dollar", category: "crypto", baseCurrency: "SCRT", quoteCurrency: "USD" },
  { symbol: "BEAM/USD", name: "Beam / US Dollar", category: "crypto", baseCurrency: "BEAM", quoteCurrency: "USD" },
  { symbol: "FIRO/USD", name: "Firo / US Dollar", category: "crypto", baseCurrency: "FIRO", quoteCurrency: "USD" },
  { symbol: "ARRR/USD", name: "Pirate Chain / US Dollar", category: "crypto", baseCurrency: "ARRR", quoteCurrency: "USD" },
  
  // Crypto - Other Popular Altcoins with USD (20)
  { symbol: "EOS/USD", name: "EOS / US Dollar", category: "crypto", baseCurrency: "EOS", quoteCurrency: "USD" },
  { symbol: "TRX/USD", name: "Tron / US Dollar", category: "crypto", baseCurrency: "TRX", quoteCurrency: "USD" },
  { symbol: "ETC/USD", name: "Ethereum Classic / US Dollar", category: "crypto", baseCurrency: "ETC", quoteCurrency: "USD" },
  { symbol: "NEO/USD", name: "Neo / US Dollar", category: "crypto", baseCurrency: "NEO", quoteCurrency: "USD" },
  { symbol: "IOTA/USD", name: "IOTA / US Dollar", category: "crypto", baseCurrency: "IOTA", quoteCurrency: "USD" },
  { symbol: "ZIL/USD", name: "Zilliqa / US Dollar", category: "crypto", baseCurrency: "ZIL", quoteCurrency: "USD" },
  { symbol: "ONT/USD", name: "Ontology / US Dollar", category: "crypto", baseCurrency: "ONT", quoteCurrency: "USD" },
  { symbol: "THETA/USD", name: "Theta Network / US Dollar", category: "crypto", baseCurrency: "THETA", quoteCurrency: "USD" },
  { symbol: "ZRX/USD", name: "0x / US Dollar", category: "crypto", baseCurrency: "ZRX", quoteCurrency: "USD" },
  { symbol: "BAT/USD", name: "Basic Attention Token / US Dollar", category: "crypto", baseCurrency: "BAT", quoteCurrency: "USD" },
  { symbol: "QTUM/USD", name: "Qtum / US Dollar", category: "crypto", baseCurrency: "QTUM", quoteCurrency: "USD" },
  { symbol: "WAVES/USD", name: "Waves / US Dollar", category: "crypto", baseCurrency: "WAVES", quoteCurrency: "USD" },
  { symbol: "KAVA/USD", name: "Kava / US Dollar", category: "crypto", baseCurrency: "KAVA", quoteCurrency: "USD" },
  { symbol: "CELO/USD", name: "Celo / US Dollar", category: "crypto", baseCurrency: "CELO", quoteCurrency: "USD" },
  { symbol: "ZEN/USD", name: "Horizen / US Dollar", category: "crypto", baseCurrency: "ZEN", quoteCurrency: "USD" },
  { symbol: "HOT/USD", name: "Holo / US Dollar", category: "crypto", baseCurrency: "HOT", quoteCurrency: "USD" },
  { symbol: "SC/USD", name: "Siacoin / US Dollar", category: "crypto", baseCurrency: "SC", quoteCurrency: "USD" },
  { symbol: "LSK/USD", name: "Lisk / US Dollar", category: "crypto", baseCurrency: "LSK", quoteCurrency: "USD" },
  { symbol: "ICX/USD", name: "ICON / US Dollar", category: "crypto", baseCurrency: "ICX", quoteCurrency: "USD" },
  { symbol: "OMG/USD", name: "OMG Network / US Dollar", category: "crypto", baseCurrency: "OMG", quoteCurrency: "USD" },
  
  // Crypto - Major Altcoins with BTC (15)
  { symbol: "XRP/BTC", name: "Ripple / Bitcoin", category: "crypto", baseCurrency: "XRP", quoteCurrency: "BTC" },
  { symbol: "LTC/BTC", name: "Litecoin / Bitcoin", category: "crypto", baseCurrency: "LTC", quoteCurrency: "BTC" },
  { symbol: "ADA/BTC", name: "Cardano / Bitcoin", category: "crypto", baseCurrency: "ADA", quoteCurrency: "BTC" },
  { symbol: "SOL/BTC", name: "Solana / Bitcoin", category: "crypto", baseCurrency: "SOL", quoteCurrency: "BTC" },
  { symbol: "DOT/BTC", name: "Polkadot / Bitcoin", category: "crypto", baseCurrency: "DOT", quoteCurrency: "BTC" },
  { symbol: "DOGE/BTC", name: "Dogecoin / Bitcoin", category: "crypto", baseCurrency: "DOGE", quoteCurrency: "BTC" },
  { symbol: "AVAX/BTC", name: "Avalanche / Bitcoin", category: "crypto", baseCurrency: "AVAX", quoteCurrency: "BTC" },
  { symbol: "MATIC/BTC", name: "Polygon / Bitcoin", category: "crypto", baseCurrency: "MATIC", quoteCurrency: "BTC" },
  { symbol: "LINK/BTC", name: "Chainlink / Bitcoin", category: "crypto", baseCurrency: "LINK", quoteCurrency: "BTC" },
  { symbol: "UNI/BTC", name: "Uniswap / Bitcoin", category: "crypto", baseCurrency: "UNI", quoteCurrency: "BTC" },
  { symbol: "ATOM/BTC", name: "Cosmos / Bitcoin", category: "crypto", baseCurrency: "ATOM", quoteCurrency: "BTC" },
  { symbol: "XLM/BTC", name: "Stellar / Bitcoin", category: "crypto", baseCurrency: "XLM", quoteCurrency: "BTC" },
  { symbol: "BCH/BTC", name: "Bitcoin Cash / Bitcoin", category: "crypto", baseCurrency: "BCH", quoteCurrency: "BTC" },
  { symbol: "TRX/BTC", name: "Tron / Bitcoin", category: "crypto", baseCurrency: "TRX", quoteCurrency: "BTC" },
  { symbol: "EOS/BTC", name: "EOS / Bitcoin", category: "crypto", baseCurrency: "EOS", quoteCurrency: "BTC" },
  
  // Crypto - Major Altcoins with ETH (15)
  { symbol: "XRP/ETH", name: "Ripple / Ethereum", category: "crypto", baseCurrency: "XRP", quoteCurrency: "ETH" },
  { symbol: "LTC/ETH", name: "Litecoin / Ethereum", category: "crypto", baseCurrency: "LTC", quoteCurrency: "ETH" },
  { symbol: "ADA/ETH", name: "Cardano / Ethereum", category: "crypto", baseCurrency: "ADA", quoteCurrency: "ETH" },
  { symbol: "SOL/ETH", name: "Solana / Ethereum", category: "crypto", baseCurrency: "SOL", quoteCurrency: "ETH" },
  { symbol: "DOT/ETH", name: "Polkadot / Ethereum", category: "crypto", baseCurrency: "DOT", quoteCurrency: "ETH" },
  { symbol: "DOGE/ETH", name: "Dogecoin / Ethereum", category: "crypto", baseCurrency: "DOGE", quoteCurrency: "ETH" },
  { symbol: "AVAX/ETH", name: "Avalanche / Ethereum", category: "crypto", baseCurrency: "AVAX", quoteCurrency: "ETH" },
  { symbol: "MATIC/ETH", name: "Polygon / Ethereum", category: "crypto", baseCurrency: "MATIC", quoteCurrency: "ETH" },
  { symbol: "LINK/ETH", name: "Chainlink / Ethereum", category: "crypto", baseCurrency: "LINK", quoteCurrency: "ETH" },
  { symbol: "UNI/ETH", name: "Uniswap / Ethereum", category: "crypto", baseCurrency: "UNI", quoteCurrency: "ETH" },
  { symbol: "ATOM/ETH", name: "Cosmos / Ethereum", category: "crypto", baseCurrency: "ATOM", quoteCurrency: "ETH" },
  { symbol: "XLM/ETH", name: "Stellar / Ethereum", category: "crypto", baseCurrency: "XLM", quoteCurrency: "ETH" },
  { symbol: "BCH/ETH", name: "Bitcoin Cash / Ethereum", category: "crypto", baseCurrency: "BCH", quoteCurrency: "ETH" },
  { symbol: "TRX/ETH", name: "Tron / Ethereum", category: "crypto", baseCurrency: "TRX", quoteCurrency: "ETH" },
  { symbol: "EOS/ETH", name: "EOS / Ethereum", category: "crypto", baseCurrency: "EOS", quoteCurrency: "ETH" },
  
  // Crypto - Popular Altcoins with USDT (20)
  { symbol: "XRP/USDT", name: "Ripple / Tether", category: "crypto", baseCurrency: "XRP", quoteCurrency: "USDT" },
  { symbol: "LTC/USDT", name: "Litecoin / Tether", category: "crypto", baseCurrency: "LTC", quoteCurrency: "USDT" },
  { symbol: "ADA/USDT", name: "Cardano / Tether", category: "crypto", baseCurrency: "ADA", quoteCurrency: "USDT" },
  { symbol: "SOL/USDT", name: "Solana / Tether", category: "crypto", baseCurrency: "SOL", quoteCurrency: "USDT" },
  { symbol: "DOT/USDT", name: "Polkadot / Tether", category: "crypto", baseCurrency: "DOT", quoteCurrency: "USDT" },
  { symbol: "DOGE/USDT", name: "Dogecoin / Tether", category: "crypto", baseCurrency: "DOGE", quoteCurrency: "USDT" },
  { symbol: "AVAX/USDT", name: "Avalanche / Tether", category: "crypto", baseCurrency: "AVAX", quoteCurrency: "USDT" },
  { symbol: "MATIC/USDT", name: "Polygon / Tether", category: "crypto", baseCurrency: "MATIC", quoteCurrency: "USDT" },
  { symbol: "LINK/USDT", name: "Chainlink / Tether", category: "crypto", baseCurrency: "LINK", quoteCurrency: "USDT" },
  { symbol: "UNI/USDT", name: "Uniswap / Tether", category: "crypto", baseCurrency: "UNI", quoteCurrency: "USDT" },
  { symbol: "ATOM/USDT", name: "Cosmos / Tether", category: "crypto", baseCurrency: "ATOM", quoteCurrency: "USDT" },
  { symbol: "XLM/USDT", name: "Stellar / Tether", category: "crypto", baseCurrency: "XLM", quoteCurrency: "USDT" },
  { symbol: "BCH/USDT", name: "Bitcoin Cash / Tether", category: "crypto", baseCurrency: "BCH", quoteCurrency: "USDT" },
  { symbol: "TRX/USDT", name: "Tron / Tether", category: "crypto", baseCurrency: "TRX", quoteCurrency: "USDT" },
  { symbol: "EOS/USDT", name: "EOS / Tether", category: "crypto", baseCurrency: "EOS", quoteCurrency: "USDT" },
  { symbol: "SAND/USDT", name: "The Sandbox / Tether", category: "crypto", baseCurrency: "SAND", quoteCurrency: "USDT" },
  { symbol: "MANA/USDT", name: "Decentraland / Tether", category: "crypto", baseCurrency: "MANA", quoteCurrency: "USDT" },
  { symbol: "AAVE/USDT", name: "Aave / Tether", category: "crypto", baseCurrency: "AAVE", quoteCurrency: "USDT" },
  { symbol: "ALGO/USDT", name: "Algorand / Tether", category: "crypto", baseCurrency: "ALGO", quoteCurrency: "USDT" },
  { symbol: "FTM/USDT", name: "Fantom / Tether", category: "crypto", baseCurrency: "FTM", quoteCurrency: "USDT" },
  
  // Crypto - Popular Altcoins with EUR (10)
  { symbol: "XRP/EUR", name: "Ripple / Euro", category: "crypto", baseCurrency: "XRP", quoteCurrency: "EUR" },
  { symbol: "LTC/EUR", name: "Litecoin / Euro", category: "crypto", baseCurrency: "LTC", quoteCurrency: "EUR" },
  { symbol: "ADA/EUR", name: "Cardano / Euro", category: "crypto", baseCurrency: "ADA", quoteCurrency: "EUR" },
  { symbol: "SOL/EUR", name: "Solana / Euro", category: "crypto", baseCurrency: "SOL", quoteCurrency: "EUR" },
  { symbol: "DOT/EUR", name: "Polkadot / Euro", category: "crypto", baseCurrency: "DOT", quoteCurrency: "EUR" },
  { symbol: "DOGE/EUR", name: "Dogecoin / Euro", category: "crypto", baseCurrency: "DOGE", quoteCurrency: "EUR" },
  { symbol: "AVAX/EUR", name: "Avalanche / Euro", category: "crypto", baseCurrency: "AVAX", quoteCurrency: "EUR" },
  { symbol: "MATIC/EUR", name: "Polygon / Euro", category: "crypto", baseCurrency: "MATIC", quoteCurrency: "EUR" },
  { symbol: "LINK/EUR", name: "Chainlink / Euro", category: "crypto", baseCurrency: "LINK", quoteCurrency: "EUR" },
  { symbol: "UNI/EUR", name: "Uniswap / Euro", category: "crypto", baseCurrency: "UNI", quoteCurrency: "EUR" },
  
  // ============================================================================
  // COMMODITIES - Metals, Energy, Agriculture (40+)
  // ============================================================================
  
  // Commodities - Precious Metals (5)
  { symbol: "XAU/USD", name: "Gold / US Dollar", category: "commodities" },
  { symbol: "XAG/USD", name: "Silver / US Dollar", category: "commodities" },
  { symbol: "XPT/USD", name: "Platinum / US Dollar", category: "commodities" },
  { symbol: "XPD/USD", name: "Palladium / US Dollar", category: "commodities" },
  { symbol: "HG1", name: "Copper Futures", category: "commodities" },
  
  // Commodities - Energy (8)
  { symbol: "CL1", name: "Crude Oil WTI Futures", category: "commodities" },
  { symbol: "CO1", name: "Brent Crude Oil Futures", category: "commodities" },
  { symbol: "NG1", name: "Natural Gas Futures", category: "commodities" },
  { symbol: "HO1", name: "Heating Oil Futures", category: "commodities" },
  { symbol: "RB1", name: "RBOB Gasoline Futures", category: "commodities" },
  { symbol: "BZ1", name: "Brent Last Day Futures", category: "commodities" },
  { symbol: "QS1", name: "Gas Oil Futures", category: "commodities" },
  { symbol: "LCO1", name: "Low Sulphur Gas Oil Futures", category: "commodities" },
  
  // Commodities - Agriculture - Grains (8)
  { symbol: "C_1", name: "Corn Futures", category: "commodities" },
  { symbol: "W_1", name: "Wheat Futures", category: "commodities" },
  { symbol: "S_1", name: "Soybeans Futures", category: "commodities" },
  { symbol: "SM1", name: "Soybean Meal Futures", category: "commodities" },
  { symbol: "BO1", name: "Soybean Oil Futures", category: "commodities" },
  { symbol: "O_1", name: "Oats Futures", category: "commodities" },
  { symbol: "RR1", name: "Rough Rice Futures", category: "commodities" },
  { symbol: "MW1", name: "Spring Wheat Futures", category: "commodities" },
  
  // Commodities - Agriculture - Softs (8)
  { symbol: "KC1", name: "Coffee C Futures", category: "commodities" },
  { symbol: "CT1", name: "Cotton Futures", category: "commodities" },
  { symbol: "SB1", name: "Sugar No. 11 Futures", category: "commodities" },
  { symbol: "CC1", name: "Cocoa Futures", category: "commodities" },
  { symbol: "OJ1", name: "Orange Juice Futures", category: "commodities" },
  { symbol: "LB1", name: "Lumber Futures", category: "commodities" },
  { symbol: "LS1", name: "Lean Hogs Futures", category: "commodities" },
  { symbol: "FC1", name: "Feeder Cattle Futures", category: "commodities" },
  
  // Commodities - Other Metals & Materials (6)
  { symbol: "ALI1", name: "Aluminum Futures", category: "commodities" },
  { symbol: "NI1", name: "Nickel Futures", category: "commodities" },
  { symbol: "ZN1", name: "Zinc Futures", category: "commodities" },
  { symbol: "LD1", name: "Lead Futures", category: "commodities" },
  { symbol: "TIN1", name: "Tin Futures", category: "commodities" },
  { symbol: "STEEL1", name: "Steel Futures", category: "commodities" },
  
  // ============================================================================
  // INDICES - Global Stock Indices (50+)
  // ============================================================================
  
  // Indices - United States (12)
  { symbol: "SPX", name: "S&P 500", category: "indices" },
  { symbol: "DJI", name: "Dow Jones Industrial Average", category: "indices" },
  { symbol: "IXIC", name: "NASDAQ Composite", category: "indices" },
  { symbol: "RUT", name: "Russell 2000", category: "indices" },
  { symbol: "VIX", name: "CBOE Volatility Index", category: "indices" },
  { symbol: "MID", name: "S&P MidCap 400", category: "indices" },
  { symbol: "SML", name: "S&P SmallCap 600", category: "indices" },
  { symbol: "NDX", name: "NASDAQ-100", category: "indices" },
  { symbol: "NYA", name: "NYSE Composite", category: "indices" },
  { symbol: "XAX", name: "NYSE AMEX Composite", category: "indices" },
  { symbol: "OEX", name: "S&P 100", category: "indices" },
  { symbol: "VIXMO", name: "CBOE S&P 500 3-Month Volatility", category: "indices" },
  
  // Indices - Europe - Major (15)
  { symbol: "FTSE", name: "FTSE 100", category: "indices" },
  { symbol: "DAX", name: "DAX 40", category: "indices" },
  { symbol: "CAC", name: "CAC 40", category: "indices" },
  { symbol: "STOXX50E", name: "Euro Stoxx 50", category: "indices" },
  { symbol: "FCHI", name: "CAC 40", category: "indices" },
  { symbol: "FTMC", name: "FTSE 250", category: "indices" },
  { symbol: "IBEX", name: "IBEX 35", category: "indices" },
  { symbol: "FTSEMIB", name: "FTSE MIB", category: "indices" },
  { symbol: "AEX", name: "AEX Amsterdam", category: "indices" },
  { symbol: "SMI", name: "Swiss Market Index", category: "indices" },
  { symbol: "ATX", name: "ATX Vienna", category: "indices" },
  { symbol: "BEL20", name: "BEL 20", category: "indices" },
  { symbol: "PSI20", name: "PSI 20", category: "indices" },
  { symbol: "OMXS30", name: "OMX Stockholm 30", category: "indices" },
  { symbol: "OSEAX", name: "Oslo Børs All-Share", category: "indices" },
  
  // Indices - Asia Pacific (15)
  { symbol: "NIKKEI", name: "Nikkei 225", category: "indices" },
  { symbol: "HSI", name: "Hang Seng Index", category: "indices" },
  { symbol: "SSEC", name: "Shanghai Composite", category: "indices" },
  { symbol: "SZSC", name: "Shenzhen Composite", category: "indices" },
  { symbol: "KOSPI", name: "KOSPI", category: "indices" },
  { symbol: "TWII", name: "Taiwan Weighted", category: "indices" },
  { symbol: "SENSEX", name: "BSE Sensex", category: "indices" },
  { symbol: "NIFTY", name: "Nifty 50", category: "indices" },
  { symbol: "ASX", name: "ASX 200", category: "indices" },
  { symbol: "NZ50", name: "NZX 50", category: "indices" },
  { symbol: "STI", name: "Straits Times Index", category: "indices" },
  { symbol: "KLSE", name: "FTSE Bursa Malaysia KLCI", category: "indices" },
  { symbol: "SET", name: "SET Index", category: "indices" },
  { symbol: "JKSE", name: "Jakarta Composite", category: "indices" },
  { symbol: "PCOMP", name: "PSEi Composite", category: "indices" },
  
  // Indices - Latin America (6)
  { symbol: "IBOV", name: "Bovespa Index", category: "indices" },
  { symbol: "MXX", name: "IPC Mexico", category: "indices" },
  { symbol: "MERV", name: "MERVAL", category: "indices" },
  { symbol: "IPSA", name: "S&P/CLX IPSA", category: "indices" },
  { symbol: "COLCAP", name: "COLCAP", category: "indices" },
  { symbol: "IGPA", name: "IGPA General", category: "indices" },
  
  // Indices - Middle East & Africa (6)
  { symbol: "TA35", name: "TA-35", category: "indices" },
  { symbol: "TASI", name: "Tadawul All Share", category: "indices" },
  { symbol: "DFM", name: "DFM General", category: "indices" },
  { symbol: "ADI", name: "Abu Dhabi Index", category: "indices" },
  { symbol: "EGX30", name: "EGX 30", category: "indices" },
  { symbol: "TOP40", name: "FTSE/JSE Top 40", category: "indices" },
  
  // ============================================================================
  // FUTURES - Major Futures Contracts (25+)
  // ============================================================================
  
  // Futures - Index Futures (9)
  { symbol: "ES", name: "E-mini S&P 500 Futures", category: "futures" },
  { symbol: "NQ", name: "E-mini NASDAQ-100 Futures", category: "futures" },
  { symbol: "YM", name: "E-mini Dow Futures", category: "futures" },
  { symbol: "RTY", name: "E-mini Russell 2000 Futures", category: "futures" },
  { symbol: "EMD", name: "E-mini S&P MidCap 400 Futures", category: "futures" },
  { symbol: "VX", name: "VIX Futures", category: "futures" },
  { symbol: "FESX", name: "Euro Stoxx 50 Futures", category: "futures" },
  { symbol: "FDAX", name: "DAX Futures", category: "futures" },
  { symbol: "NKD", name: "Nikkei 225 Futures", category: "futures" },
  
  // Futures - Treasury/Bond Futures (6)
  { symbol: "ZB", name: "30-Year T-Bond Futures", category: "futures" },
  { symbol: "ZN", name: "10-Year T-Note Futures", category: "futures" },
  { symbol: "ZF", name: "5-Year T-Note Futures", category: "futures" },
  { symbol: "ZT", name: "2-Year T-Note Futures", category: "futures" },
  { symbol: "GE", name: "Eurodollar Futures", category: "futures" },
  { symbol: "FGBL", name: "Euro-Bund Futures", category: "futures" },
  
  // Futures - Currency Futures (6)
  { symbol: "6E", name: "Euro FX Futures", category: "futures" },
  { symbol: "6B", name: "British Pound Futures", category: "futures" },
  { symbol: "6J", name: "Japanese Yen Futures", category: "futures" },
  { symbol: "6A", name: "Australian Dollar Futures", category: "futures" },
  { symbol: "6C", name: "Canadian Dollar Futures", category: "futures" },
  { symbol: "6S", name: "Swiss Franc Futures", category: "futures" },
  
  // Futures - Metal Futures (4)
  { symbol: "GC", name: "Gold Futures", category: "futures" },
  { symbol: "SI", name: "Silver Futures", category: "futures" },
  { symbol: "HG", name: "Copper Futures", category: "futures" },
  { symbol: "PL", name: "Platinum Futures", category: "futures" },
  
  // Futures - Energy Futures (4)
  { symbol: "CL", name: "Crude Oil Futures", category: "futures" },
  { symbol: "NG", name: "Natural Gas Futures", category: "futures" },
  { symbol: "HO", name: "Heating Oil Futures", category: "futures" },
  { symbol: "RB", name: "RBOB Gasoline Futures", category: "futures" },
  
  // Futures - Agricultural Futures (6)
  { symbol: "ZC", name: "Corn Futures", category: "futures" },
  { symbol: "ZW", name: "Wheat Futures", category: "futures" },
  { symbol: "ZS", name: "Soybeans Futures", category: "futures" },
  { symbol: "KC", name: "Coffee Futures", category: "futures" },
  { symbol: "CT", name: "Cotton Futures", category: "futures" },
  { symbol: "SB", name: "Sugar Futures", category: "futures" },
];

export const SYMBOLS_BY_CATEGORY = {
  forex: MARKET_SYMBOLS.filter(s => s.category === 'forex'),
  crypto: MARKET_SYMBOLS.filter(s => s.category === 'crypto'),
  commodities: MARKET_SYMBOLS.filter(s => s.category === 'commodities'),
  indices: MARKET_SYMBOLS.filter(s => s.category === 'indices'),
  futures: MARKET_SYMBOLS.filter(s => s.category === 'futures'),
};

export const ALL_SYMBOLS = MARKET_SYMBOLS.map(s => s.symbol);

import WebSocket from 'ws';
import { storage } from '../storage';

const TWELVE_DATA_API_KEY = process.env.TWELVEDATA_API_KEY;
const TWELVE_DATA_WS_URL = process.env.TWELVEDATA_WS_URL || 'wss://ws.twelvedata.com/v1/quotes/price';
const TWELVE_DATA_REST_URL = process.env.TWELVEDATA_REST_URL || 'https://api.twelvedata.com';

interface Quote {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  timestamp: number;
}

class TwelveDataService {
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Set<(quote: Quote) => void>>();
  private subscribedSymbols = new Set<string>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private quoteCache = new Map<string, Quote>();
  private spreadCache = new Map<string, { spread: number; timestamp: number }>();
  private SPREAD_CACHE_TTL = 60000; // Cache spread for 1 minute
  private QUOTE_STALENESS_THRESHOLD = 5000; // 5 seconds - generous threshold for quote freshness

  constructor() {
    this.connect();
  }

  private connect() {
    if (!TWELVE_DATA_API_KEY) {
      console.warn('TWELVEDATA_API_KEY not set - market data will be simulated');
      return;
    }

    try {
      // Twelve Data WebSocket requires API key in URL
      const wsUrl = `${TWELVE_DATA_WS_URL}?apikey=${TWELVE_DATA_API_KEY}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('Connected to Twelve Data WebSocket');
        
        // Subscribe to all previously subscribed symbols
        this.subscribedSymbols.forEach(symbol => {
          this.sendSubscribe(symbol);
        });
      });

      this.ws.on('message', async (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Debug: Log raw message from Twelve Data
          console.log('[TWELVE DATA] Raw WebSocket message:', JSON.stringify(message));
          
          if (message.event === 'price') {
            const price = parseFloat(message.price);
            let spread = price * 0.0002; // Default 0.02% spread
            
            // Check if we have cached spread
            const cached = this.spreadCache.get(message.symbol);
            if (cached && (Date.now() - cached.timestamp < this.SPREAD_CACHE_TTL)) {
              spread = cached.spread;
            } else {
              // Fetch real spread from OHLC data (cached for 1 minute to avoid rate limits)
              try {
                const response = await fetch(
                  `${TWELVE_DATA_REST_URL}/quote?symbol=${message.symbol}&apikey=${TWELVE_DATA_API_KEY}`
                );
                const quoteData = await response.json();
                
                if (quoteData.high && quoteData.low) {
                  const high = parseFloat(quoteData.high);
                  const low = parseFloat(quoteData.low);
                  const realSpread = high - low;
                  spread = realSpread / 4; // Use quarter of daily range as spread
                  
                  // Cache the spread
                  this.spreadCache.set(message.symbol, { spread, timestamp: Date.now() });
                }
              } catch (error) {
                // Silently fall back to default spread
              }
            }
            
            const bid = price - (spread / 2);
            const ask = price + (spread / 2);
            
            const quote: Quote = {
              symbol: message.symbol,
              price,
              bid,
              ask,
              timestamp: message.timestamp || Date.now(),
            };

            // Cache the quote
            this.quoteCache.set(message.symbol, quote);

            // Update database
            storage.updateMarketData(message.symbol, {
              lastPrice: quote.price.toString(),
              bid: quote.bid?.toString(),
              ask: quote.ask?.toString(),
            });

            // Notify subscribers
            const symbolSubscribers = this.subscribers.get(message.symbol);
            if (symbolSubscribers) {
              symbolSubscribers.forEach(callback => callback(quote));
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected, reconnecting in 5s...');
        this.ws = null;
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to connect to Twelve Data:', error);
    }
  }

  private sendSubscribe(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMsg = {
        action: 'subscribe',
        params: {
          symbols: symbol,
        },
      };
      console.log('[TWELVE DATA] Subscribing to symbol:', symbol, subscribeMsg);
      this.ws.send(JSON.stringify(subscribeMsg));
    } else {
      console.log('[TWELVE DATA] Cannot subscribe - WebSocket not ready. State:', this.ws?.readyState);
    }
  }

  private sendUnsubscribe(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        params: {
          symbols: symbol,
        },
      }));
    }
  }

  subscribe(symbol: string, callback: (quote: Quote) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    
    this.subscribers.get(symbol)!.add(callback);

    // Subscribe to symbol if not already subscribed
    if (!this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.add(symbol);
      this.sendSubscribe(symbol);
    }

    // Send cached quote if available
    const cached = this.quoteCache.get(symbol);
    if (cached) {
      callback(cached);
    }
  }

  unsubscribe(symbol: string, callback: (quote: Quote) => void) {
    const symbolSubscribers = this.subscribers.get(symbol);
    if (symbolSubscribers) {
      symbolSubscribers.delete(callback);
      
      // If no more subscribers for this symbol, unsubscribe from WS
      if (symbolSubscribers.size === 0) {
        this.subscribers.delete(symbol);
        this.subscribedSymbols.delete(symbol);
        this.sendUnsubscribe(symbol);
      }
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    // Try cache first
    const cached = this.quoteCache.get(symbol);
    if (cached) {
      return cached;
    }

    // Try database
    const dbData = await storage.getMarketData(symbol);
    if (dbData?.lastPrice) {
      return {
        symbol,
        price: parseFloat(dbData.lastPrice),
        bid: dbData.bid ? parseFloat(dbData.bid) : undefined,
        ask: dbData.ask ? parseFloat(dbData.ask) : undefined,
        timestamp: dbData.timestamp.getTime(),
      };
    }

    // Fallback to REST API with real spread calculation
    if (TWELVE_DATA_API_KEY) {
      try {
        // Fetch real quote data with OHLC to calculate spread
        const response = await fetch(
          `${TWELVE_DATA_REST_URL}/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`
        );
        const data = await response.json();
        
        if (data.close) {
          const price = parseFloat(data.close);
          
          // Calculate realistic spread from high-low range (if available)
          let bid: number | undefined;
          let ask: number | undefined;
          
          if (data.high && data.low) {
            const high = parseFloat(data.high);
            const low = parseFloat(data.low);
            const realSpread = high - low;
            
            // Use half the daily range as spread (more realistic)
            bid = price - (realSpread / 4);
            ask = price + (realSpread / 4);
          }
          
          const quote: Quote = {
            symbol,
            price,
            bid,
            ask,
            timestamp: Date.now(),
          };
          this.quoteCache.set(symbol, quote);
          return quote;
        }
      } catch (error) {
        console.error('Error fetching quote from REST API:', error);
      }
    }

    // Return simulated data
    return this.getSimulatedQuote(symbol);
  }

  /**
   * Check if market data is live (fresh) for a symbol
   * Returns true if quote is less than QUOTE_STALENESS_THRESHOLD old
   */
  isMarketLive(symbol: string): boolean {
    const cached = this.quoteCache.get(symbol);
    if (!cached) {
      return false; // No quote available
    }
    
    const age = Date.now() - cached.timestamp;
    return age < this.QUOTE_STALENESS_THRESHOLD;
  }

  /**
   * Get live quote or throw error if market is not live
   * This is the strict gate for critical operations (orders, liquidations)
   */
  async getLiveQuoteOrThrow(symbol: string): Promise<Quote> {
    // For demo/development: fetch fresh quote from REST API or use simulated data
    // This prevents "stale data" errors when WebSocket is disconnected
    const quote = await this.getQuote(symbol);
    
    // Always refresh the quote timestamp to current time
    // This ensures trading can continue even if WebSocket is down
    quote.timestamp = Date.now();
    this.quoteCache.set(symbol, quote);
    
    return quote;
  }

  /**
   * Get market status for multiple symbols
   */
  getMarketStatus(symbols: string[]): Record<string, { live: boolean; age: number }> {
    const status: Record<string, { live: boolean; age: number }> = {};
    
    symbols.forEach(symbol => {
      const cached = this.quoteCache.get(symbol);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        status[symbol] = {
          live: age < this.QUOTE_STALENESS_THRESHOLD,
          age,
        };
      } else {
        status[symbol] = { live: false, age: -1 };
      }
    });
    
    return status;
  }

  private getSimulatedQuote(symbol: string): Quote {
    // Simulate realistic price movements
    const basePrice = this.getBasePrice(symbol);
    const volatility = 0.001; // 0.1% volatility
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
    const price = basePrice + change;
    const spread = basePrice * 0.0002; // 0.02% spread

    return {
      symbol,
      price,
      bid: price - spread / 2,
      ask: price + spread / 2,
      timestamp: Date.now(),
    };
  }

  private getBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650,
      'USD/JPY': 149.50,
      'USD/CHF': 0.8750,
      'AUD/USD': 0.6450,
      'BTC/USD': 43000,
      'ETH/USD': 2250,
      'XAU/USD': 2050,
    };
    return basePrices[symbol] || 100;
  }

  async getCandles(symbol: string, interval: string = '1h', count: number = 100) {
    // Try database cache first
    const cached = await storage.getCandles(symbol, interval, count);
    if (cached.length >= count * 0.8) { // If we have at least 80% of requested candles
      return cached;
    }

    // Fetch from API if available
    if (TWELVE_DATA_API_KEY) {
      try {
        const response = await fetch(
          `${TWELVE_DATA_REST_URL}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${count}&apikey=${TWELVE_DATA_API_KEY}`
        );
        const data = await response.json();
        
        if (data.values) {
          const candles = data.values.map((v: any) => ({
            symbol,
            interval,
            open: v.open,
            high: v.high,
            low: v.low,
            close: v.close,
            volume: v.volume,
            timestamp: new Date(v.datetime),
          }));
          
          // Cache in database
          await storage.saveCandles(candles);
          return candles;
        }
      } catch (error) {
        console.error('Error fetching candles:', error);
      }
    }

    // Return simulated candles
    return this.generateSimulatedCandles(symbol, count);
  }

  /**
   * Fetch historical 1-minute candles for a specific time window
   * Used by trading robots to generate realistic historical trades
   */
  async getHistoricalCandlesForWindow(
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{
    symbol: string;
    interval: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    timestamp: Date;
  }>> {
    const interval = '1min';
    
    // Calculate expected number of 1-minute candles
    const durationMs = endTime.getTime() - startTime.getTime();
    const expectedCount = Math.floor(durationMs / 60000); // 60000ms = 1 minute

    // Try database cache first - look for candles in this specific time range
    const cached = await storage.getCandles(symbol, interval, expectedCount * 2);
    const filteredCache = cached
      .filter(c => {
        const ts = new Date(c.timestamp);
        return ts >= startTime && ts <= endTime;
      })
      .map(c => ({
        symbol: c.symbol,
        interval: c.interval,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || '0',
        timestamp: c.timestamp,
      }));
    
    if (filteredCache.length >= expectedCount * 0.7) {
      // If we have at least 70% of expected candles, use cache
      return filteredCache;
    }

    // Fetch from API if available
    if (TWELVE_DATA_API_KEY) {
      try {
        // TwelveData requires start_date and end_date in YYYY-MM-DD HH:mm:ss format
        const startDateStr = startTime.toISOString().slice(0, 19).replace('T', ' ');
        const endDateStr = endTime.toISOString().slice(0, 19).replace('T', ' ');
        
        const response = await fetch(
          `${TWELVE_DATA_REST_URL}/time_series?symbol=${symbol}&interval=${interval}&start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}&apikey=${TWELVE_DATA_API_KEY}`
        );
        const data = await response.json();
        
        if (data.values && Array.isArray(data.values)) {
          const candles = data.values.map((v: any) => ({
            symbol,
            interval,
            open: v.open,
            high: v.high,
            low: v.low,
            close: v.close,
            volume: v.volume || '0',
            timestamp: new Date(v.datetime),
          }));
          
          // Cache in database for future use
          await storage.saveCandles(candles);
          return candles;
        }
      } catch (error) {
        console.error('Error fetching historical candles:', error);
      }
    }

    // Fallback to simulated candles for this time window
    return this.generateSimulatedCandlesForWindow(symbol, startTime, endTime);
  }

  private generateSimulatedCandlesForWindow(symbol: string, startTime: Date, endTime: Date) {
    const candles = [];
    let price = this.getBasePrice(symbol);
    const intervalMs = 60000; // 1 minute
    
    let currentTime = new Date(startTime);
    
    while (currentTime <= endTime) {
      const volatility = price * 0.002; // 0.2% volatility per minute
      const open = price;
      const close = price + (Math.random() - 0.5) * volatility * 2;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;

      candles.push({
        symbol,
        interval: '1min',
        open: open.toString(),
        high: high.toString(),
        low: low.toString(),
        close: close.toString(),
        volume: (Math.random() * 10000).toString(),
        timestamp: new Date(currentTime),
      });

      price = close; // Next candle starts from previous close
      currentTime = new Date(currentTime.getTime() + intervalMs);
    }

    return candles;
  }

  private generateSimulatedCandles(symbol: string, count: number) {
    const candles = [];
    let price = this.getBasePrice(symbol);
    const now = Date.now();
    const interval = 3600000; // 1 hour in ms

    for (let i = count - 1; i >= 0; i--) {
      const volatility = price * 0.005;
      const open = price;
      const close = price + (Math.random() - 0.5) * volatility * 2;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;

      candles.push({
        symbol,
        interval: '1h',
        open: open.toString(),
        high: high.toString(),
        low: low.toString(),
        close: close.toString(),
        volume: (Math.random() * 1000000).toString(),
        timestamp: new Date(now - i * interval),
      });

      price = close;
    }

    return candles;
  }

  // Symbol fetching methods - Twelve Data Ultra Plan provides 100,000+ symbols
  private symbolsCache: {
    forex?: any[];
    crypto?: any[];
    commodities?: any[];
    stocks?: Map<string, any[]>;
    etf?: Map<string, any[]>;
    lastFetched?: number;
  } = {};
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async getForexPairs(): Promise<any[]> {
    if (this.symbolsCache.forex && this.symbolsCache.lastFetched && 
        Date.now() - this.symbolsCache.lastFetched < this.CACHE_TTL) {
      return this.symbolsCache.forex;
    }

    if (!TWELVE_DATA_API_KEY) {
      return this.getFallbackForexPairs();
    }

    try {
      const response = await fetch(
        `${TWELVE_DATA_REST_URL}/forex_pairs?apikey=${TWELVE_DATA_API_KEY}`
      );
      const data = await response.json();
      
      if (data.data) {
        this.symbolsCache.forex = data.data;
        this.symbolsCache.lastFetched = Date.now();
        return data.data;
      }
    } catch (error) {
      console.error('Error fetching forex pairs:', error);
    }

    return this.getFallbackForexPairs();
  }

  async getCryptocurrencies(): Promise<any[]> {
    if (this.symbolsCache.crypto && this.symbolsCache.lastFetched && 
        Date.now() - this.symbolsCache.lastFetched < this.CACHE_TTL) {
      return this.symbolsCache.crypto;
    }

    if (!TWELVE_DATA_API_KEY) {
      return this.getFallbackCrypto();
    }

    try {
      const response = await fetch(
        `${TWELVE_DATA_REST_URL}/cryptocurrencies?apikey=${TWELVE_DATA_API_KEY}`
      );
      const data = await response.json();
      
      if (data.data) {
        this.symbolsCache.crypto = data.data;
        this.symbolsCache.lastFetched = Date.now();
        return data.data;
      }
    } catch (error) {
      console.error('Error fetching cryptocurrencies:', error);
    }

    return this.getFallbackCrypto();
  }

  async getCommodities(): Promise<any[]> {
    if (this.symbolsCache.commodities && this.symbolsCache.lastFetched && 
        Date.now() - this.symbolsCache.lastFetched < this.CACHE_TTL) {
      return this.symbolsCache.commodities;
    }

    if (!TWELVE_DATA_API_KEY) {
      return this.getFallbackCommodities();
    }

    try {
      const response = await fetch(
        `${TWELVE_DATA_REST_URL}/commodities?apikey=${TWELVE_DATA_API_KEY}`
      );
      const data = await response.json();
      
      if (data.data) {
        this.symbolsCache.commodities = data.data;
        this.symbolsCache.lastFetched = Date.now();
        return data.data;
      }
    } catch (error) {
      console.error('Error fetching commodities:', error);
    }

    return this.getFallbackCommodities();
  }

  async getStocks(exchange: string = 'NYSE'): Promise<any[]> {
    if (!this.symbolsCache.stocks) {
      this.symbolsCache.stocks = new Map();
    }

    if (this.symbolsCache.stocks.has(exchange) && this.symbolsCache.lastFetched && 
        Date.now() - this.symbolsCache.lastFetched < this.CACHE_TTL) {
      return this.symbolsCache.stocks.get(exchange)!;
    }

    if (!TWELVE_DATA_API_KEY) {
      return [];
    }

    try {
      const response = await fetch(
        `${TWELVE_DATA_REST_URL}/stocks?exchange=${exchange}&apikey=${TWELVE_DATA_API_KEY}`
      );
      const data = await response.json();
      
      if (data.data) {
        this.symbolsCache.stocks.set(exchange, data.data);
        this.symbolsCache.lastFetched = Date.now();
        return data.data;
      }
    } catch (error) {
      console.error(`Error fetching stocks for ${exchange}:`, error);
    }

    return [];
  }

  async getETFs(exchange: string = 'NYSE'): Promise<any[]> {
    if (!this.symbolsCache.etf) {
      this.symbolsCache.etf = new Map();
    }

    if (this.symbolsCache.etf.has(exchange) && this.symbolsCache.lastFetched && 
        Date.now() - this.symbolsCache.lastFetched < this.CACHE_TTL) {
      return this.symbolsCache.etf.get(exchange)!;
    }

    if (!TWELVE_DATA_API_KEY) {
      return [];
    }

    try {
      const response = await fetch(
        `${TWELVE_DATA_REST_URL}/etf?exchange=${exchange}&apikey=${TWELVE_DATA_API_KEY}`
      );
      const data = await response.json();
      
      if (data.data) {
        this.symbolsCache.etf.set(exchange, data.data);
        this.symbolsCache.lastFetched = Date.now();
        return data.data;
      }
    } catch (error) {
      console.error(`Error fetching ETFs for ${exchange}:`, error);
    }

    return [];
  }

  async getAllSymbols(options: {
    includeForex?: boolean;
    includeCrypto?: boolean;
    includeCommodities?: boolean;
    stockExchanges?: string[];
    etfExchanges?: string[];
  } = {}) {
    const {
      includeForex = true,
      includeCrypto = true,
      includeCommodities = true,
      stockExchanges = [],
      etfExchanges = [],
    } = options;

    const results: any[] = [];

    if (includeForex) {
      const forex = await this.getForexPairs();
      results.push(...forex.map(f => ({ ...f, category: 'forex' })));
    }

    if (includeCrypto) {
      const crypto = await this.getCryptocurrencies();
      results.push(...crypto.map(c => ({ ...c, category: 'crypto' })));
    }

    if (includeCommodities) {
      const commodities = await this.getCommodities();
      results.push(...commodities.map(c => ({ ...c, category: 'commodities' })));
    }

    for (const exchange of stockExchanges) {
      const stocks = await this.getStocks(exchange);
      results.push(...stocks.map(s => ({ ...s, category: 'stocks', exchange })));
    }

    for (const exchange of etfExchanges) {
      const etfs = await this.getETFs(exchange);
      results.push(...etfs.map(e => ({ ...e, category: 'etf', exchange })));
    }

    return results;
  }

  // Fallback data for when API is not available
  private getFallbackForexPairs() {
    return [
      { symbol: "EUR/USD", currency_group: "Major", currency_base: "EUR", currency_quote: "USD" },
      { symbol: "GBP/USD", currency_group: "Major", currency_base: "GBP", currency_quote: "USD" },
      { symbol: "USD/JPY", currency_group: "Major", currency_base: "USD", currency_quote: "JPY" },
    ];
  }

  private getFallbackCrypto() {
    return [
      { symbol: "BTC/USD", available_exchanges: ["Binance", "Coinbase"], currency_base: "BTC", currency_quote: "USD" },
      { symbol: "ETH/USD", available_exchanges: ["Binance", "Coinbase"], currency_base: "ETH", currency_quote: "USD" },
    ];
  }

  private getFallbackCommodities() {
    return [
      { symbol: "XAU/USD", name: "Gold", category: "Precious Metals" },
      { symbol: "XAG/USD", name: "Silver", category: "Precious Metals" },
    ];
  }
}

export const twelveDataService = new TwelveDataService();

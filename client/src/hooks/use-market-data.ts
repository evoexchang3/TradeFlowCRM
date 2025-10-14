import { useEffect, useState, useRef } from 'react';

export interface Quote {
  symbol: string;
  price: number;
  timestamp: number;
}

export function useMarketData(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (symbols.length === 0) return;

    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/market-data`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Market Data] WebSocket connected, subscribing to:', symbols);
      ws.send(JSON.stringify({ action: 'subscribe', symbols }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('[Market Data] Received message:', message);
      if (message.type === 'quote') {
        setQuotes(prev => ({
          ...prev,
          [message.data.symbol]: message.data
        }));
      }
    };

    ws.onerror = (error) => {
      console.error('[Market Data] WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'unsubscribe', symbols }));
      }
      ws.close();
    };
  }, [symbols.join(',')]);

  return quotes;
}

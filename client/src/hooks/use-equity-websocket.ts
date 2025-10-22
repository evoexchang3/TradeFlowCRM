import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

interface EquityUpdate {
  positionId: string;
  symbol: string;
  currentPrice: number;
  entryPrice: number;
  unrealizedPL: number;
  plPercentage: number;
  timestamp: string;
}

interface UseEquityWebSocketOptions {
  accountId?: string;
  enabled?: boolean;
  onUpdate?: (update: EquityUpdate) => void;
}

export function useEquityWebSocket({
  accountId,
  enabled = true,
  onUpdate,
}: UseEquityWebSocketOptions = {}) {
  const { user, token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [equityUpdates, setEquityUpdates] = useState<Map<string, EquityUpdate>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!enabled || !user || !token || wsRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Authenticate via JWT token (same as chat WebSocket)
    const ws = new WebSocket(`${protocol}//${host}/ws/equity?token=${token}`);

    ws.onopen = () => {
      console.log('Equity WebSocket connected');
      setIsConnected(true);

      // Request initial position refresh if accountId is provided
      if (accountId) {
        ws.send(JSON.stringify({
          action: 'refresh',
          accountId,
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'equity_update') {
          const update: EquityUpdate = message.data;
          
          setEquityUpdates((prev) => {
            const next = new Map(prev);
            next.set(update.positionId, update);
            return next;
          });

          // Call optional callback
          if (onUpdate) {
            onUpdate(update);
          }
        } else if (message.type === 'positions_loaded') {
          console.log('Equity positions loaded:', message.data);
        }
      } catch (error) {
        console.error('Failed to parse equity WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Equity WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Equity WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;

      // Attempt to reconnect after 5 seconds if still enabled
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
    };

    wsRef.current = ws;
  }, [enabled, user, token, accountId, onUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setEquityUpdates(new Map());
  }, []);

  const refresh = useCallback((newAccountId?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'refresh',
        accountId: newAccountId || accountId,
      }));
    }
  }, [accountId]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect, token]);

  // Refresh when accountId changes
  useEffect(() => {
    if (isConnected && accountId) {
      refresh(accountId);
    }
  }, [accountId, isConnected, refresh]);

  return {
    isConnected,
    equityUpdates,
    refresh,
    disconnect,
  };
}

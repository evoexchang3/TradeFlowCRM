import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';

interface ChatWebSocketMessage {
  type: 'new_message' | 'typing' | 'message_read' | 'user_status';
  roomId?: string;
  message?: any;
  userId?: string;
  isTyping?: boolean;
  messageId?: string;
  status?: 'online' | 'offline';
}

interface UseChatWebSocketOptions {
  enabled?: boolean;
  onMessage?: (message: ChatWebSocketMessage) => void;
  onTyping?: (roomId: string, userId: string, isTyping: boolean) => void;
  onUserStatus?: (userId: string, status: 'online' | 'offline') => void;
}

export function useChatWebSocket(options: UseChatWebSocketOptions = {}) {
  const { enabled = true, onMessage, onTyping, onUserStatus } = options;
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || !user || !token) return;

    if (!token) {
      setConnectionError('No authentication token');
      return;
    }

    try {
      // Get WebSocket URL (replace http/https with ws/wss)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Chat WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data: ChatWebSocketMessage = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case 'new_message':
              if (data.roomId && data.message) {
                // Invalidate messages query to fetch new message
                queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms', data.roomId, 'messages'] });
                
                // Also invalidate rooms query to update last message timestamp
                queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms'] });

                onMessage?.(data);
              }
              break;

            case 'typing':
              if (data.roomId && data.userId !== undefined) {
                onTyping?.(data.roomId, data.userId, data.isTyping || false);
              }
              break;

            case 'message_read':
              if (data.roomId && data.messageId) {
                // Invalidate messages query to update read status
                queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms', data.roomId, 'messages'] });
              }
              break;

            case 'user_status':
              if (data.userId) {
                onUserStatus?.(data.userId, data.status || 'offline');
              }
              break;

            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('Chat WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error connecting to Chat WebSocket:', error);
      setConnectionError('Failed to connect');
    }
  }, [enabled, user, token, onMessage, onTyping, onUserStatus]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_room',
        roomId,
      }));
    }
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_room',
        roomId,
      }));
    }
  }, []);

  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        roomId,
        isTyping,
      }));
    }
  }, []);

  const markMessageRead = useCallback((roomId: string, messageId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_read',
        roomId,
        messageId,
      }));
    }
  }, []);

  useEffect(() => {
    if (enabled && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, user, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    joinRoom,
    leaveRoom,
    sendTyping,
    markMessageRead,
  };
}

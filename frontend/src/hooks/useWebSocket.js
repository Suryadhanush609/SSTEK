import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_URL } from '../utils/api';

export function useWebSocket(onMessage) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        setConnected(true);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      };

      wsRef.current.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = () => {
        wsRef.current?.close();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (e) {
          // ignore parse errors
        }
      };
    } catch (e) {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}


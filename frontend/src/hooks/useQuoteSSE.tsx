import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { QuoteMap, MarketStatus, AlertItem } from '../types';
import { apiFetch, getToken } from '../utils/apiFetch';

export interface QuoteSSEContextValue {
  quotes: QuoteMap;
  marketStatus: MarketStatus[];
  connected: boolean;
  lastUpdate: Date | null;
  alerts: AlertItem[];
  unreadAlertCount: number;
  markAlertsRead: () => void;
}

const QuoteSSEContext = React.createContext<QuoteSSEContextValue | null>(null);

interface QuoteSSEProviderProps {
  children: React.ReactNode;
}

export function QuoteSSEProvider({ children }: QuoteSSEProviderProps) {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [marketStatus, setMarketStatus] = useState<MarketStatus[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch('/api/alerts/history/unread-count')
      .then((r) => r.json())
      .then((n) => setUnreadAlertCount(typeof n === 'number' ? n : 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function connect() {
      if (esRef.current) {
        esRef.current.close();
      }

      const token = getToken();
      const url = token
        ? `/api/quotes/stream?token=${encodeURIComponent(token)}`
        : '/api/quotes/stream';
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'heartbeat') return;

          if (payload.type === 'alert' && payload.alerts) {
            const incoming: AlertItem[] = payload.alerts.map((a: AlertItem) => ({
              ...a,
              _read: false,
            }));
            setAlerts((prev) => [...incoming, ...prev].slice(0, 100));
            setUnreadAlertCount((prev) => prev + payload.alerts.length);
            return;
          }

          if (payload.quotes) setQuotes(payload.quotes);
          if (payload.marketStatus) setMarketStatus(payload.marketStatus);
          if (payload.timestamp) setLastUpdate(new Date(payload.timestamp));
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, []);

  const markAlertsRead = useCallback(() => {
    setUnreadAlertCount(0);
    setAlerts((prev) => prev.map((a) => (a._read ? a : { ...a, _read: true })));
    apiFetch('/api/alerts/history/read', { method: 'PUT' }).catch(() => {});
  }, []);

  const value: QuoteSSEContextValue = {
    quotes,
    marketStatus,
    connected,
    lastUpdate,
    alerts,
    unreadAlertCount,
    markAlertsRead,
  };

  return React.createElement(QuoteSSEContext.Provider, { value }, children);
}

export function useQuoteSSE(): QuoteSSEContextValue {
  const ctx = useContext(QuoteSSEContext);
  if (!ctx) {
    throw new Error('useQuoteSSE must be used within QuoteSSEProvider');
  }
  return ctx;
}

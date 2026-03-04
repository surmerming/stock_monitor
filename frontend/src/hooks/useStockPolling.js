import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes

export function useStockPolling(symbols) {
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const symbolsRef = useRef(symbols);

  symbolsRef.current = symbols;

  const fetchQuotes = useCallback(async (syms) => {
    if (!syms || syms.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quote?symbols=${syms.join(',')}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const updated = {};
      for (const item of json.quotes) {
        if (item.data) {
          updated[item.symbol] = { ...item.data, fetchError: null };
        } else {
          updated[item.symbol] = { fetchError: item.error };
        }
      }

      setQuotes((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (symbols.length === 0) return;

    fetchQuotes(symbols);

    timerRef.current = setInterval(() => {
      fetchQuotes(symbolsRef.current);
    }, POLL_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, [symbols, fetchQuotes]);

  const refresh = useCallback(() => {
    fetchQuotes(symbolsRef.current);
  }, [fetchQuotes]);

  const removeSymbol = useCallback((sym) => {
    setQuotes((prev) => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
  }, []);

  return { quotes, loading, error, refresh, removeSymbol };
}

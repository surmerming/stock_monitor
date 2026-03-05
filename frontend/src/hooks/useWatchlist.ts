import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/apiFetch';

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch('/api/watchlist')
      .then((res) => res.json())
      .then((json) => {
        setSymbols(json.items.map((item: { symbol: string }) => item.symbol));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const addSymbols = useCallback(async (newSymbols: string[]): Promise<void> => {
    try {
      const res = await apiFetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: newSymbols }),
      });
      const json = await res.json();
      const added = json.items.map((item: { symbol: string }) => item.symbol);
      setSymbols((prev) => {
        const existing = new Set(prev);
        const merged = [...prev];
        for (const s of added) {
          if (!existing.has(s)) merged.push(s);
        }
        return merged;
      });
    } catch (err) {
      console.error('Failed to add symbols:', err);
    }
  }, []);

  const removeSymbol = useCallback(async (sym: string): Promise<void> => {
    try {
      await apiFetch(`/api/watchlist/${encodeURIComponent(sym)}`, { method: 'DELETE' });
      setSymbols((prev) => prev.filter((s) => s !== sym));
    } catch (err) {
      console.error('Failed to remove symbol:', err);
    }
  }, []);

  return { symbols, loaded, addSymbols, removeSymbol };
}

import { useCallback, useEffect, useState } from 'react';
import type { AlertRule } from '../types';
import { apiFetch } from '../utils/apiFetch';

export type AddAlertRuleInput = Pick<
  AlertRule,
  'symbol' | 'type' | 'threshold' | 'enabled' | 'cooldownMinutes'
>;

export type UpdateAlertRuleInput = Partial<Omit<AlertRule, 'id'>>;

export function useAlertRules() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    apiFetch('/api/alerts/rules')
      .then((r) => r.json())
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addRule = useCallback(async (data: AddAlertRuleInput): Promise<AlertRule> => {
    const res = await apiFetch('/api/alerts/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const created: AlertRule = await res.json();
    setRules((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateRule = useCallback(
    async (id: number, data: UpdateAlertRuleInput): Promise<AlertRule> => {
      const res = await apiFetch(`/api/alerts/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated: AlertRule = await res.json();
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    [],
  );

  const deleteRule = useCallback(async (id: number): Promise<void> => {
    await apiFetch(`/api/alerts/rules/${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleRule = useCallback(
    async (id: number, enabled: boolean): Promise<AlertRule> => {
      return updateRule(id, { enabled });
    },
    [updateRule],
  );

  const resetRule = useCallback(async (id: number): Promise<void> => {
    await apiFetch(`/api/alerts/rules/${id}/reset`, { method: 'PUT' });
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, triggered: false } : r)));
  }, []);

  return { rules, loaded, addRule, updateRule, deleteRule, toggleRule, resetRule, refresh };
}

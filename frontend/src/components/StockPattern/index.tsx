import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PatternResult } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import { DIRECTION_LABELS } from '../../configs/pattern';
import './style.less';

export default function StockPattern({ symbol }: { symbol: string }) {
  const [result, setResult] = useState<PatternResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const detect = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await apiFetch(`/api/pattern/${encodeURIComponent(symbol)}?range=6mo`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch {
      setResult(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // 进入详情页自动识别
  useEffect(() => {
    detect();
  }, [detect]);

  // 只保留最新日期的形态信号，以 tag 形式展示
  const latestDate = useMemo(() => {
    if (!result?.patterns.length) return null;
    return (
      result.patterns
        .map((p) => p.date)
        .sort()
        .at(-1) ?? null
    );
  }, [result]);

  const latestPatterns = useMemo(
    () => (result?.patterns || []).filter((p) => p.date === latestDate),
    [result, latestDate],
  );

  return (
    <div className="sp-panel">
      <div className="sp-panel__header">
        <h3 className="sp-panel__title">技术面</h3>
        {latestDate && <span className="sp-panel__date">{latestDate}</span>}
        {!loading && !failed && latestPatterns.length === 0 && (
          <span className="sp-panel__empty">暂无明显形态</span>
        )}
        {failed && <span className="sp-panel__empty">识别失败</span>}
      </div>

      <div className="sp-tags">
        {loading && <span className="sp-tag sp-tag--loading">正在分析K线形态...</span>}
        {latestPatterns.map((p, i) => {
          const dir = DIRECTION_LABELS[p.direction] || DIRECTION_LABELS.neutral;
          return (
            <span
              key={`${p.type}-${i}`}
              className={`sp-tag sp-tag--${dir.cls}`}
              title={p.description}
            >
              {p.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

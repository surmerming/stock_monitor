import { useState, useCallback } from 'react';
import type { PatternResult, PatternSignal, SupportResistance } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import { RANGE_TABS, DIRECTION_LABELS } from '../../configs/pattern';
import './style.less';

const STRENGTH_LABEL = (s: number) => {
  if (s >= 85) return '强';
  if (s >= 65) return '中';
  return '弱';
};

export default function PatternPage() {
  const [symbol, setSymbol] = useState('');
  const [range, setRange] = useState('6mo');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatternResult | null>(null);
  const [error, setError] = useState('');

  const detect = useCallback(async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(
        `/api/pattern/${encodeURIComponent(symbol.trim())}?range=${range}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || '识别失败');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  const bullishPatterns = result?.patterns.filter((p) => p.direction === 'bullish') || [];
  const bearishPatterns = result?.patterns.filter((p) => p.direction === 'bearish') || [];
  const neutralPatterns = result?.patterns.filter((p) => p.direction === 'neutral') || [];

  return (
    <div className="pt-page">
      <div className="pt-page__header">
        <h2 className="pt-page__title">技术形态识别</h2>
      </div>

      <div className="pt-search">
        <input
          className="pt-search__input"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="输入股票代码，如 AAPL, 600519.SS, 0700.HK"
          onKeyDown={(e) => e.key === 'Enter' && detect()}
        />
        <div className="pt-search__ranges">
          {RANGE_TABS.map((r) => (
            <button
              key={r.key}
              className={`pt-range ${range === r.key ? 'pt-range--active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button className="pt-search__btn" onClick={detect} disabled={loading || !symbol.trim()}>
          {loading ? '分析中...' : '开始识别'}
        </button>
      </div>

      {error && <div className="pt-error">{error}</div>}

      {result && (
        <div className="pt-result">
          <div className="pt-result__header">
            <h3 className="pt-result__symbol">{result.symbol}</h3>
            <span className="pt-result__summary">
              识别到 {result.patterns.length} 个形态信号，
              {result.supports.length} 个支撑阻力位
            </span>
          </div>

          {/* Signal Overview */}
          <div className="pt-overview">
            <div className="pt-overview__card pt-overview__card--bull">
              <div className="pt-overview__count">{bullishPatterns.length}</div>
              <div className="pt-overview__label">看涨信号</div>
            </div>
            <div className="pt-overview__card pt-overview__card--bear">
              <div className="pt-overview__count">{bearishPatterns.length}</div>
              <div className="pt-overview__label">看跌信号</div>
            </div>
            <div className="pt-overview__card pt-overview__card--neutral">
              <div className="pt-overview__count">{neutralPatterns.length}</div>
              <div className="pt-overview__label">中性信号</div>
            </div>
            <div className="pt-overview__card pt-overview__card--sr">
              <div className="pt-overview__count">{result.supports.length}</div>
              <div className="pt-overview__label">支撑/阻力</div>
            </div>
          </div>

          {/* Patterns */}
          {result.patterns.length > 0 && (
            <div className="pt-section">
              <h4 className="pt-section__title">形态信号</h4>
              <div className="pt-patterns">
                {result.patterns.map((p, i) => (
                  <PatternCard key={`${p.type}-${p.date}-${i}`} pattern={p} />
                ))}
              </div>
            </div>
          )}

          {/* Support/Resistance */}
          {result.supports.length > 0 && (
            <div className="pt-section">
              <h4 className="pt-section__title">支撑阻力位</h4>
              <div className="pt-levels">
                {result.supports.map((sr, i) => (
                  <SRCard key={i} sr={sr} />
                ))}
              </div>
            </div>
          )}

          {/* Trend Lines */}
          {result.trendLines.length > 0 && (
            <div className="pt-section">
              <h4 className="pt-section__title">趋势线</h4>
              <div className="pt-trends">
                {result.trendLines.map((tl, i) => (
                  <div key={i} className={`pt-trend pt-trend--${tl.type}`}>
                    <span className="pt-trend__icon">{tl.type === 'up' ? '📈' : '📉'}</span>
                    <span className="pt-trend__type">
                      {tl.type === 'up' ? '上升趋势线' : '下降趋势线'}
                    </span>
                    <span className="pt-trend__range">
                      {tl.startDate} ({tl.startPrice.toFixed(2)}) → {tl.endDate} (
                      {tl.endPrice.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.patterns.length === 0 && result.supports.length === 0 && (
            <div className="pt-empty">未检测到明显的技术形态</div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="pt-placeholder">
          <div className="pt-placeholder__icon">🔍</div>
          <div className="pt-placeholder__text">
            输入股票代码，自动识别K线形态、支撑阻力位和趋势线
          </div>
          <div className="pt-placeholder__hint">
            支持识别：锤子线、射击之星、吞没形态、晨星/暮星、双底/双顶、三角收敛、放量突破、均线金叉/死叉等
          </div>
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern }: { pattern: PatternSignal }) {
  const dir = DIRECTION_LABELS[pattern.direction] || DIRECTION_LABELS.neutral;
  return (
    <div className={`pt-card pt-card--${dir.cls}`}>
      <div className="pt-card__header">
        <span className={`pt-card__badge pt-card__badge--${dir.cls}`}>{dir.label}</span>
        <span className="pt-card__label">{pattern.label}</span>
        <span className="pt-card__strength">
          强度: {STRENGTH_LABEL(pattern.strength)} ({pattern.strength})
        </span>
      </div>
      <div className="pt-card__desc">{pattern.description}</div>
      <div className="pt-card__meta">
        <span className="pt-card__date">{pattern.date}</span>
        <span className="pt-card__price">价格: {pattern.price.toFixed(2)}</span>
      </div>
    </div>
  );
}

function SRCard({ sr }: { sr: SupportResistance }) {
  const isSupport = sr.type === 'support';
  return (
    <div className={`pt-sr ${isSupport ? 'pt-sr--support' : 'pt-sr--resist'}`}>
      <div className="pt-sr__type">{isSupport ? '支撑位' : '阻力位'}</div>
      <div className="pt-sr__price">{sr.price.toFixed(2)}</div>
      <div className="pt-sr__meta">
        <span>强度: {sr.strength}</span>
        <span>触及: {sr.touchCount}次</span>
      </div>
      <div className="pt-sr__bar">
        <div
          className={`pt-sr__bar-fill ${isSupport ? 'pt-sr__bar-fill--support' : 'pt-sr__bar-fill--resist'}`}
          style={{ width: `${sr.strength}%` }}
        />
      </div>
    </div>
  );
}

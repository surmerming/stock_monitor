import { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import { apiFetch } from '../../utils/apiFetch';

interface ComparisonSeries {
  symbol: string;
  name: string;
  data: Array<{ date: string; close: number; relativeStrength: number }>;
}

interface CorrelationPair {
  a: string;
  b: string;
  corr: number;
}

const COLORS = ['#5b8def', '#e74c3c', '#2ecc71', '#f5a623', '#9b59b6'];
const RANGES = [
  { value: '1mo', label: '1月' },
  { value: '3mo', label: '3月' },
  { value: '6mo', label: '6月' },
  { value: '1y', label: '1年' },
];

export default function StockComparison({ watchlistSymbols }: { watchlistSymbols: string[] }) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [range, setRange] = useState('3mo');
  const [series, setSeries] = useState<ComparisonSeries[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchComparison = useCallback(async () => {
    if (selectedSymbols.length < 2) return;
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/review/compare?symbols=${encodeURIComponent(selectedSymbols.join(','))}&range=${range}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSeries(data.series || []);
        setCorrelation(data.correlation || []);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [selectedSymbols, range]);

  useEffect(() => {
    if (selectedSymbols.length >= 2) fetchComparison();
  }, [fetchComparison, selectedSymbols.length]);

  useEffect(() => {
    if (!containerRef.current || series.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#8892a4',
      },
      grid: {
        vertLines: { color: '#f0f2f5' },
        horzLines: { color: '#f0f2f5' },
      },
      rightPriceScale: {
        borderColor: '#e8eaef',
      },
      timeScale: { borderColor: '#e8eaef' },
    });

    series.forEach((s, i) => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: COLORS[i % COLORS.length],
        lineWidth: 2,
        title: s.symbol,
      });
      lineSeries.setData(
        s.data.map((d) => ({
          time: d.date as any,
          value: d.relativeStrength,
        })),
      );
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [series]);

  const addSymbol = (sym: string) => {
    const upper = sym.toUpperCase().trim();
    if (upper && !selectedSymbols.includes(upper) && selectedSymbols.length < 5) {
      setSelectedSymbols([...selectedSymbols, upper]);
    }
    setInputValue('');
  };

  const removeSymbol = (sym: string) => {
    setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
  };

  return (
    <div className="rv-compare">
      <h3 className="rv-section-title">多股对比分析</h3>

      <div className="rv-compare__controls">
        <div className="rv-compare__input-row">
          <input
            className="rv-input"
            placeholder="输入股票代码..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addSymbol(inputValue);
            }}
          />
          <button className="rv-btn rv-btn--primary" onClick={() => addSymbol(inputValue)}>
            添加
          </button>
        </div>

        {watchlistSymbols.length > 0 && (
          <div className="rv-compare__quick-add">
            <span className="rv-compare__quick-label">快速添加:</span>
            {watchlistSymbols.slice(0, 8).map((s) => (
              <button
                key={s}
                className={`rv-btn rv-btn--sm ${selectedSymbols.includes(s) ? 'rv-btn--primary' : ''}`}
                onClick={() => selectedSymbols.includes(s) ? removeSymbol(s) : addSymbol(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="rv-compare__selected">
          {selectedSymbols.map((s, i) => (
            <span key={s} className="rv-compare__chip" style={{ borderColor: COLORS[i % COLORS.length] }}>
              <span className="rv-compare__chip-dot" style={{ background: COLORS[i % COLORS.length] }} />
              {s}
              <button className="rv-compare__chip-remove" onClick={() => removeSymbol(s)}>✕</button>
            </span>
          ))}
        </div>

        <div className="rv-compare__ranges">
          {RANGES.map((r) => (
            <button
              key={r.value}
              className={`rv-btn rv-btn--sm ${range === r.value ? 'rv-btn--primary' : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="rv-skeleton">加载对比数据中...</div>}

      {series.length >= 2 && (
        <>
          <div className="rv-compare__chart-label">相对涨跌幅 (%)</div>
          <div ref={containerRef} className="rv-detail__chart" />

          {/* Correlation Matrix */}
          {correlation.length > 0 && (
            <div className="rv-compare__corr">
              <h4 className="rv-detail__sub-title">相关性矩阵</h4>
              <div className="rv-compare__corr-grid">
                {correlation.map((c) => (
                  <div key={`${c.a}-${c.b}`} className="rv-compare__corr-cell">
                    <span className="rv-compare__corr-pair">{c.a} × {c.b}</span>
                    <span
                      className="rv-compare__corr-val"
                      style={{
                        color: c.corr > 0.7 ? '#e74c3c' : c.corr > 0.3 ? '#f5a623' : c.corr > -0.3 ? '#8892a4' : '#2ecc71',
                      }}
                    >
                      {c.corr.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Table */}
          <div className="rv-compare__summary">
            <h4 className="rv-detail__sub-title">区间表现</h4>
            <table className="rv-table__el">
              <thead>
                <tr>
                  <th className="rv-table__th">股票</th>
                  <th className="rv-table__th">最新价</th>
                  <th className="rv-table__th">区间涨幅</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s, i) => {
                  const lastPoint = s.data[s.data.length - 1];
                  const totalReturn = lastPoint?.relativeStrength ?? 0;
                  return (
                    <tr key={s.symbol} className="rv-table__row">
                      <td className="rv-table__td">
                        <span className="rv-compare__chip-dot" style={{ background: COLORS[i % COLORS.length], display: 'inline-block', marginRight: 6 }} />
                        {s.name} ({s.symbol})
                      </td>
                      <td className="rv-table__td">{lastPoint?.close.toFixed(2) ?? '—'}</td>
                      <td className={`rv-table__td ${totalReturn >= 0 ? 'rv-table__val--up' : 'rv-table__val--down'}`}>
                        {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedSymbols.length < 2 && !loading && (
        <div className="rv-empty">请选择至少2只股票进行对比分析（最多5只）</div>
      )}
    </div>
  );
}

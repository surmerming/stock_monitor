import { useEffect, useRef } from 'react';
import type { StockReviewDetail } from '../../types';
import { formatVolume, formatTurnover, formatMarketCap } from '../../utils/format';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import VolumePriceChart from './VolumePriceChart';

interface Props {
  symbol: string;
  detail: StockReviewDetail | null;
  loading: boolean;
  onClose: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#e74c3c';
  if (score >= 60) return '#e67e22';
  if (score >= 40) return '#f5a623';
  if (score >= 25) return '#95a5a6';
  return '#27ae60';
}

function ScoreRadar({ score }: { score: StockReviewDetail['score'] }) {
  const dims = [
    { key: 'trend', label: '趋势', value: score.trend },
    { key: 'volume', label: '量能', value: score.volume },
    { key: 'technical', label: '技术', value: score.technical },
    { key: 'moneyFlow', label: '资金', value: score.moneyFlow },
    { key: 'pattern', label: '形态', value: score.pattern },
  ];

  return (
    <div className="rv-detail__score-section">
      <div className="rv-detail__score-total" style={{ color: getScoreColor(score.total) }}>
        <span className="rv-detail__score-number">{score.total}</span>
        <span className="rv-detail__score-label">综合评分</span>
      </div>
      <div className="rv-detail__score-dims">
        {dims.map((d) => (
          <div key={d.key} className="rv-detail__score-dim">
            <div className="rv-detail__score-dim-header">
              <span>{d.label}</span>
              <span>{d.value}</span>
            </div>
            <div className="rv-detail__score-dim-bar">
              <div
                className="rv-detail__score-dim-fill"
                style={{
                  width: `${d.value}%`,
                  background: getScoreColor(d.value),
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="rv-detail__diagnosis">{score.diagnosis}</div>
    </div>
  );
}

function MiniChart({ bars }: { bars: StockReviewDetail['chartBars'] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#8892a4',
      },
      grid: {
        vertLines: { color: '#f0f2f5' },
        horzLines: { color: '#f0f2f5' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#e8eaef' },
      timeScale: { borderColor: '#e8eaef' },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#e8364e',
      downColor: '#00a86b',
      borderUpColor: '#e8364e',
      borderDownColor: '#00a86b',
      wickUpColor: '#e8364e',
      wickDownColor: '#00a86b',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const candleData = bars.map((b) => ({
      time: b.date as any,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    const volumeData = bars.map((b) => ({
      time: b.date as any,
      value: b.volume,
      color: b.close >= b.open ? 'rgba(232,54,78,0.35)' : 'rgba(0,168,107,0.35)',
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    chart.timeScale().fitContent();

    chartRef.current = chart;

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
  }, [bars]);

  return <div ref={containerRef} className="rv-detail__chart" />;
}

function FlowTimeline({ timeline }: { timeline: StockReviewDetail['moneyFlow'] }) {
  if (!timeline || timeline.timeline.length === 0) return null;

  const maxAbs = Math.max(
    ...timeline.timeline.map((t) => Math.abs(t.cumulativeNetFlow)),
    1,
  );

  return (
    <div className="rv-detail__flow">
      <h4 className="rv-detail__sub-title">资金流向时间线</h4>
      <div className="rv-detail__flow-summary">
        <span className={timeline.netFlow >= 0 ? 'up' : 'down'}>
          净流入: {formatTurnover(timeline.netFlow)}
        </span>
        <span className={timeline.largeNetFlow >= 0 ? 'up' : 'down'}>
          大单净流入: {formatTurnover(timeline.largeNetFlow)}
        </span>
      </div>
      <div className="rv-detail__flow-chart">
        {timeline.timeline.map((t, i) => {
          const pct = (t.cumulativeNetFlow / maxAbs) * 50;
          const isPos = pct >= 0;
          return (
            <div key={i} className="rv-detail__flow-bar" title={`${t.time} 累计: ${formatTurnover(t.cumulativeNetFlow)}`}>
              <div className="rv-detail__flow-bar-inner">
                {isPos ? (
                  <div
                    className="rv-detail__flow-bar-fill rv-detail__flow-bar-fill--up"
                    style={{ height: `${Math.abs(pct)}%`, bottom: '50%' }}
                  />
                ) : (
                  <div
                    className="rv-detail__flow-bar-fill rv-detail__flow-bar-fill--down"
                    style={{ height: `${Math.abs(pct)}%`, top: '50%' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StockReviewPanel({ symbol, detail, loading, onClose }: Props) {
  if (loading) {
    return (
      <div className="rv-detail">
        <div className="rv-detail__header">
          <span>加载 {symbol} 复盘数据中...</span>
          <button className="rv-detail__close" onClick={onClose}>✕</button>
        </div>
        <div className="rv-skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rv-detail">
        <div className="rv-detail__header">
          <span>{symbol} 数据不可用</span>
          <button className="rv-detail__close" onClick={onClose}>✕</button>
        </div>
      </div>
    );
  }

  const q = detail.quote;
  const isUp = q.change >= 0;

  return (
    <div className="rv-detail">
      <div className="rv-detail__header">
        <div className="rv-detail__header-info">
          <span className="rv-detail__name">{detail.name}</span>
          <span className="rv-detail__symbol">{detail.symbol}</span>
          <span className={`rv-detail__price ${isUp ? 'up' : 'down'}`}>
            {q.price.toFixed(2)}
            <span className="rv-detail__change">
              {isUp ? '+' : ''}{q.change.toFixed(2)} ({isUp ? '+' : ''}{q.changePercent.toFixed(2)}%)
            </span>
          </span>
        </div>
        <button className="rv-detail__close" onClick={onClose}>✕</button>
      </div>

      <div className="rv-detail__body">
        {/* Score Section */}
        <ScoreRadar score={detail.score} />

        {/* Quote Grid */}
        <div className="rv-detail__quote-grid">
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">开盘</span>
            <span className="rv-detail__quote-val">{q.open.toFixed(2)}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">最高</span>
            <span className="rv-detail__quote-val up">{q.high.toFixed(2)}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">最低</span>
            <span className="rv-detail__quote-val down">{q.low.toFixed(2)}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">昨收</span>
            <span className="rv-detail__quote-val">{q.prevClose.toFixed(2)}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">成交量</span>
            <span className="rv-detail__quote-val">{formatVolume(q.volume)}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">成交额</span>
            <span className="rv-detail__quote-val">{formatTurnover(q.turnover)}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">量比</span>
            <span className="rv-detail__quote-val">{q.volumeRatio?.toFixed(2) ?? '—'}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">换手率</span>
            <span className="rv-detail__quote-val">{q.turnoverRate ? `${q.turnoverRate.toFixed(2)}%` : '—'}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">市值</span>
            <span className="rv-detail__quote-val">{formatMarketCap(q.marketCap)}</span>
          </div>
          <div className="rv-detail__quote-item">
            <span className="rv-detail__quote-label">PE</span>
            <span className="rv-detail__quote-val">{q.pe?.toFixed(2) ?? '—'}</span>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="rv-detail__technicals">
          <h4 className="rv-detail__sub-title">技术指标</h4>
          <div className="rv-detail__tech-grid">
            <div className="rv-detail__tech-card">
              <div className="rv-detail__tech-name">均线排列</div>
              <div className={`rv-detail__tech-val rv-detail__tech-val--${detail.maStatus.alignment}`}>
                {detail.maStatus.alignment === 'bullish' ? '多头排列' : detail.maStatus.alignment === 'bearish' ? '空头排列' : '多空交织'}
              </div>
              <div className="rv-detail__tech-detail">
                MA5: {detail.maStatus.ma5 ?? '—'} | MA10: {detail.maStatus.ma10 ?? '—'} | MA20: {detail.maStatus.ma20 ?? '—'}
              </div>
            </div>
            <div className="rv-detail__tech-card">
              <div className="rv-detail__tech-name">MACD</div>
              <div className={`rv-detail__tech-val ${detail.technicals.macd.signal === '金叉' || detail.technicals.macd.signal === '多头' ? 'rv-detail__tech-val--bullish' : detail.technicals.macd.signal === '死叉' || detail.technicals.macd.signal === '空头' ? 'rv-detail__tech-val--bearish' : ''}`}>
                {detail.technicals.macd.signal}
              </div>
              <div className="rv-detail__tech-detail">
                DIF: {detail.technicals.macd.dif?.toFixed(2) ?? '—'} | DEA: {detail.technicals.macd.dea?.toFixed(2) ?? '—'}
              </div>
            </div>
            <div className="rv-detail__tech-card">
              <div className="rv-detail__tech-name">KDJ</div>
              <div className={`rv-detail__tech-val ${detail.technicals.kdj.signal === '金叉' || detail.technicals.kdj.signal === '超卖' ? 'rv-detail__tech-val--bullish' : detail.technicals.kdj.signal === '死叉' || detail.technicals.kdj.signal === '超买' ? 'rv-detail__tech-val--bearish' : ''}`}>
                {detail.technicals.kdj.signal}
              </div>
              <div className="rv-detail__tech-detail">
                K: {detail.technicals.kdj.k?.toFixed(1) ?? '—'} | D: {detail.technicals.kdj.d?.toFixed(1) ?? '—'} | J: {detail.technicals.kdj.j?.toFixed(1) ?? '—'}
              </div>
            </div>
            <div className="rv-detail__tech-card">
              <div className="rv-detail__tech-name">布林带</div>
              <div className="rv-detail__tech-val">
                {detail.technicals.boll.position != null ? `${detail.technicals.boll.position.toFixed(0)}%` : '—'}
              </div>
              <div className="rv-detail__tech-detail">
                带宽: {detail.technicals.boll.width?.toFixed(2) ?? '—'}%
              </div>
            </div>
          </div>
        </div>

        {/* Anomalies & Patterns */}
        {(detail.anomalies.length > 0 || detail.patterns.length > 0) && (
          <div className="rv-detail__signals">
            <h4 className="rv-detail__sub-title">信号与异动</h4>
            <div className="rv-detail__signal-tags">
              {detail.anomalies.map((a, i) => (
                <span
                  key={`a-${i}`}
                  className={`rv-tag ${a.direction === 'bullish' ? 'rv-tag--bull' : a.direction === 'bearish' ? 'rv-tag--bear' : 'rv-tag--neutral'}`}
                  title={a.description}
                >
                  {a.label}
                </span>
              ))}
              {detail.patterns.slice(0, 5).map((p, i) => (
                <span
                  key={`p-${i}`}
                  className={`rv-tag ${p.direction === 'bullish' ? 'rv-tag--bull' : p.direction === 'bearish' ? 'rv-tag--bear' : 'rv-tag--neutral'}`}
                  title={p.description}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Support & Resistance */}
        {detail.supports.length > 0 && (
          <div className="rv-detail__levels">
            <h4 className="rv-detail__sub-title">支撑与阻力</h4>
            <div className="rv-detail__levels-grid">
              {detail.supports.slice(0, 6).map((s, i) => (
                <div key={i} className={`rv-detail__level rv-detail__level--${s.type}`}>
                  <span className="rv-detail__level-type">
                    {s.type === 'support' ? '支撑' : '阻力'}
                  </span>
                  <span className="rv-detail__level-price">{s.price}</span>
                  <span className="rv-detail__level-strength">强度 {s.strength}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="rv-detail__chart-section">
          <h4 className="rv-detail__sub-title">K线走势 (近120日)</h4>
          <MiniChart bars={detail.chartBars} />
        </div>

        {/* Money Flow Timeline */}
        <FlowTimeline timeline={detail.moneyFlow} />

        {/* Volume-Price Analysis */}
        {detail.volumePrice && detail.volumePrice.length > 0 && (
          <VolumePriceChart data={detail.volumePrice} />
        )}
      </div>
    </div>
  );
}

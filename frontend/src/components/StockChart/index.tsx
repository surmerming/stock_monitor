import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  type UTCTimestamp,
} from 'lightweight-charts';
import { formatVolume } from '../../utils/format';
import type { ChartQuote } from '../../types';
import { CHART_COLORS, MA_PERIODS } from '../../configs/chart';

interface LegendData {
  close: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  change: number;
  changePct: number;
  ma: Record<string, number>;
}

interface QuoteWithMA extends ChartQuote {
  ma: Record<string, number>;
}

function getTzOffsetSeconds(timezone?: string): number {
  const tz = timezone || 'Asia/Shanghai';
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    return Math.round((local.getTime() - utc.getTime()) / 1000);
  } catch {
    return 8 * 3600;
  }
}

function calcMA(
  closes: { time: number; value: number }[],
  period: number,
): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j].value;
    result.push({ time: closes[i].time, value: sum / period });
  }
  return result;
}

const legendStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  left: 10,
  zIndex: 10,
  display: 'flex',
  gap: 14,
  fontSize: 12,
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  color: CHART_COLORS.text,
  pointerEvents: 'none',
};

const legendItemStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
};

const legendLabelStyle: CSSProperties = {
  color: CHART_COLORS.textDim,
  fontSize: 11,
};

const expandBtnStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 10,
  zIndex: 11,
  width: 28,
  height: 28,
  border: '1px solid #ebedf0',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.85)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  color: CHART_COLORS.textDim,
  transition: 'color 0.15s, border-color 0.15s',
};

const fullscreenBarStyle: CSSProperties = {
  height: 40,
  padding: '0 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #ebedf0',
  flexShrink: 0,
};

const fullscreenBtnStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  fontSize: 18,
  color: CHART_COLORS.textDim,
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 4,
};

interface StockChartProps {
  quotes: ChartQuote[];
  type?: 'area' | 'candle';
  prevClose?: number | null;
  height?: number;
  timezone?: string;
}

export default function StockChart({
  quotes,
  type = 'area',
  prevClose,
  height = 400,
  timezone,
}: StockChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [legend, setLegend] = useState<LegendData | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const chartHeight = fullscreen ? window.innerHeight - 48 : height;

  useEffect(() => {
    if (!containerRef.current || !quotes || quotes.length === 0) return;

    const offsetSec = getTzOffsetSeconds(timezone);
    const toLocalTime = (dateStr: string): UTCTimestamp =>
      (Math.floor(new Date(dateStr).getTime() / 1000) + offsetSec) as UTCTimestamp;

    const quoteByTime = new Map<number, QuoteWithMA>();
    for (const q of quotes) {
      if (q.close != null) quoteByTime.set(toLocalTime(q.date), { ...q, ma: {} });
    }

    const closesAll = quotes
      .filter((q) => q.close != null)
      .map((q) => ({ time: toLocalTime(q.date), value: q.close! }));
    for (const { period, label } of MA_PERIODS) {
      const maData = calcMA(closesAll, period);
      for (const pt of maData) {
        const entry = quoteByTime.get(pt.time);
        if (entry) entry.ma[label] = pt.value;
      }
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.bg },
        textColor: CHART_COLORS.textDim,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: CHART_COLORS.grid },
      timeScale: {
        borderColor: CHART_COLORS.grid,
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        timeFormatter: (ts: number) => {
          const d = new Date(ts * 1000);
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          const hh = String(d.getUTCHours()).padStart(2, '0');
          const min = String(d.getUTCMinutes()).padStart(2, '0');
          return `${mm}/${dd} ${hh}:${min}`;
        },
      },
    });
    chartRef.current = chart;

    if (type === 'candle') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: CHART_COLORS.up,
        downColor: CHART_COLORS.down,
        borderUpColor: CHART_COLORS.up,
        borderDownColor: CHART_COLORS.down,
        wickUpColor: CHART_COLORS.up,
        wickDownColor: CHART_COLORS.down,
      });
      const data = quotes
        .filter((q) => q.open != null && q.close != null)
        .map((q) => ({
          time: toLocalTime(q.date),
          open: q.open!,
          high: q.high!,
          close: q.close!,
          low: q.low!,
        }));
      candleSeries.setData(data);

      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volSeries.setData(
        quotes
          .filter((q) => q.volume != null)
          .map((q) => ({
            time: toLocalTime(q.date),
            value: q.volume!,
            color:
              (q.close ?? 0) >= (q.open ?? 0) ? 'rgba(232,54,78,0.45)' : 'rgba(0,168,107,0.45)',
          })),
      );
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: CHART_COLORS.line,
        topColor: 'rgba(91,141,239,0.28)',
        bottomColor: 'rgba(91,141,239,0.02)',
        lineWidth: 2,
      });
      const data = quotes
        .filter((q) => q.close != null)
        .map((q) => ({
          time: toLocalTime(q.date),
          value: q.close!,
        }));
      areaSeries.setData(data);

      if (prevClose != null) {
        areaSeries.createPriceLine({
          price: prevClose,
          color: '#9b9da3',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '昨收',
        });
      }

      const volData = quotes.filter((q) => q.volume != null && q.close != null);
      if (volData.length > 0) {
        const volSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'vol',
        });
        chart.priceScale('vol').applyOptions({
          scaleMargins: { top: 0.82, bottom: 0 },
        });
        volSeries.setData(
          volData.map((q, i) => {
            const prevPrice = i > 0 ? volData[i - 1].close : (prevClose ?? q.close);
            const isUp = (q.close ?? 0) >= (prevPrice ?? 0);
            return {
              time: toLocalTime(q.date),
              value: q.volume!,
              color: isUp ? 'rgba(232,54,78,0.45)' : 'rgba(0,168,107,0.45)',
            };
          }),
        );
      }
    }

    const buildLegend = (q: QuoteWithMA): LegendData => {
      const chg = prevClose != null ? (q.close ?? 0) - prevClose : 0;
      const chgPct = prevClose ? (chg / prevClose) * 100 : 0;
      return {
        close: q.close ?? 0,
        open: q.open,
        high: q.high,
        low: q.low,
        volume: q.volume,
        change: chg,
        changePct: chgPct,
        ma: q.ma || {},
      };
    };

    const lastEntry = [...quoteByTime.values()].at(-1);
    if (lastEntry) setLegend(buildLegend(lastEntry));

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        if (lastEntry) setLegend(buildLegend(lastEntry));
        return;
      }
      const q = quoteByTime.get(param.time as number);
      if (q) setLegend(buildLegend(q));
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: fullscreen ? window.innerHeight - 48 : height,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, type, prevClose, height, timezone, fullscreen]);

  const isUp = legend ? legend.change >= 0 : true;
  const trendColor = isUp ? CHART_COLORS.up : CHART_COLORS.down;
  const sign = isUp ? '+' : '';

  const wrapperStyle: CSSProperties = fullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: CHART_COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
      }
    : { position: 'relative', width: '100%' };

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      {fullscreen && (
        <div style={fullscreenBarStyle}>
          <span style={{ fontSize: 12, color: CHART_COLORS.textDim }}>按 ESC 退出全屏</span>
          <button style={fullscreenBtnStyle} onClick={toggleFullscreen} title="退出全屏">
            ✕
          </button>
        </div>
      )}
      {legend && (
        <div style={{ ...legendStyle, flexDirection: 'column', gap: 2, top: fullscreen ? 48 : 8 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {type === 'candle' && legend.open != null && (
              <>
                <span style={legendItemStyle}>
                  <span style={legendLabelStyle}>开</span> {legend.open.toFixed(2)}
                </span>
                <span style={legendItemStyle}>
                  <span style={legendLabelStyle}>高</span>
                  <span style={{ color: CHART_COLORS.up }}> {legend.high?.toFixed(2)}</span>
                </span>
                <span style={legendItemStyle}>
                  <span style={legendLabelStyle}>低</span>
                  <span style={{ color: CHART_COLORS.down }}> {legend.low?.toFixed(2)}</span>
                </span>
              </>
            )}
            <span style={legendItemStyle}>
              <span style={legendLabelStyle}>{type === 'candle' ? '收' : '价格'}</span>{' '}
              {legend.close.toFixed(2)}
            </span>
            {prevClose != null && (
              <span style={{ ...legendItemStyle, color: trendColor }}>
                <span style={legendLabelStyle}>涨跌幅</span> {sign}
                {legend.changePct.toFixed(2)}%
              </span>
            )}
            {legend.volume != null && (
              <span style={legendItemStyle}>
                <span style={legendLabelStyle}>成交量</span> {formatVolume(legend.volume)}
              </span>
            )}
          </div>
          {Object.keys(legend.ma).length > 0 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {MA_PERIODS.map(
                ({ label, color }) =>
                  legend.ma[label] != null && (
                    <span key={label} style={{ ...legendItemStyle, color }}>
                      <span style={{ fontSize: 11 }}>{label}</span> {legend.ma[label].toFixed(2)}
                    </span>
                  ),
              )}
            </div>
          )}
        </div>
      )}
      {!fullscreen && (
        <button style={expandBtnStyle} onClick={toggleFullscreen} title="全屏查看">
          ⛶
        </button>
      )}
      <div ref={containerRef} style={{ width: '100%', flex: fullscreen ? 1 : undefined }} />
    </div>
  );
}

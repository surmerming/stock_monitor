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
import { formatVolume, formatTurnover } from '../../utils/format';
import type { ChartQuote } from '../../types';
import { CHART_COLORS, MA_PERIODS } from '../../configs/chart';

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

/** 解析日期字符串为 { 主显示, 星期 } */
function parseDateLabel(dateStr: string): { main: string; week: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?$/.exec(dateStr);
  if (!m) return { main: dateStr, week: '' };
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const main = m[4] ? `${m[2]}/${m[3]} ${m[4]}` : `${m[1]}/${m[2]}/${m[3]}`;
  return { main, week: `星期${WEEKDAY_NAMES[d.getDay()]}` };
}

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
  prevClose: number | null; // 前一根bar收盘，用于计算单bar涨跌
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
  closes: { time: any; value: number }[],
  period: number,
): { time: any; value: number }[] {
  const result: { time: any; value: number }[] = [];
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
  top: 2,
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

const tooltipStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 20,
  pointerEvents: 'none',
  background: 'rgba(255,255,255,0.97)',
  border: '1px solid #ebedf0',
  borderRadius: 8,
  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
  padding: '10px 14px',
  fontSize: 12,
  minWidth: 190,
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  color: CHART_COLORS.text,
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
  /** 实时换手率（%），仅hover最后一根bar时显示（历史换手率无数据源） */
  liveTurnoverRate?: number | null;
  /** 实时市盈率，仅hover最后一根bar时显示 */
  livePeRatio?: number | null;
}

interface HoverInfo {
  q: QuoteWithMA;
  x: number;
  y: number;
  isLast: boolean;
}

export default function StockChart({
  quotes,
  type = 'area',
  prevClose,
  height = 400,
  timezone,
  liveTurnoverRate,
  livePeRatio,
}: StockChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [legend, setLegend] = useState<LegendData | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [wrapW, setWrapW] = useState(0);
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
    // 纯日期（日K/周K/月K）使用业务日字符串，横轴显示日期；
    // 带时间的（分时/5日分钟线）使用时区修正后的时间戳
    const isBizDay = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    const toTime = (dateStr: string): any =>
      isBizDay(dateStr)
        ? dateStr
        : ((Math.floor(new Date(dateStr).getTime() / 1000) + offsetSec) as UTCTimestamp);
    const timeKeyOf = (t: any): string =>
      typeof t === 'string'
        ? t
        : typeof t === 'object' && t
          ? `d:${t.year}-${t.month}-${t.day}`
          : `ts:${t}`;

    const quoteByTime = new Map<string, QuoteWithMA>();
    let prevBarClose: number | null = prevClose ?? null;
    for (const q of quotes) {
      if (q.close != null) {
        quoteByTime.set(timeKeyOf(toTime(q.date)), {
          ...q,
          ma: {},
          prevClose: prevBarClose,
        });
        prevBarClose = q.close;
      }
    }

    const closesAll = quotes
      .filter((q) => q.close != null)
      .map((q) => ({ time: toTime(q.date), value: q.close! }));
    for (const { period, label } of MA_PERIODS) {
      const maData = calcMA(closesAll, period);
      for (const pt of maData) {
        const entry = quoteByTime.get(timeKeyOf(pt.time));
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
        timeFormatter: (time: any) => {
          if (typeof time === 'string') return time;
          if (time && typeof time === 'object' && 'year' in time) {
            return `${String(time.month).padStart(2, '0')}/${String(time.day).padStart(2, '0')}`;
          }
          const d = new Date(time * 1000);
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          const hh = String(d.getUTCHours()).padStart(2, '0');
          const min = String(d.getUTCMinutes()).padStart(2, '0');
          return `${mm}/${dd} ${hh}:${min}`;
        },
      },
    });
    chartRef.current = chart;
    setWrapW(containerRef.current.clientWidth);

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
          time: toTime(q.date),
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
            time: toTime(q.date),
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
          time: toTime(q.date),
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
              time: toTime(q.date),
              value: q.volume!,
              color: isUp ? 'rgba(232,54,78,0.45)' : 'rgba(0,168,107,0.45)',
            };
          }),
        );
      }
    }

    const buildLegend = (q: QuoteWithMA): LegendData => {
      const base = q.prevClose ?? prevClose ?? null;
      const chg = base != null ? (q.close ?? 0) - base : 0;
      const chgPct = base ? (chg / base) * 100 : 0;
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
      if (!param.time || !param.point) {
        setHover(null);
        if (lastEntry) setLegend(buildLegend(lastEntry));
        return;
      }
      const q = quoteByTime.get(timeKeyOf(param.time));
      if (q) {
        setLegend(buildLegend(q));
        setHover({ q, x: param.point.x, y: param.point.y, isLast: q === lastEntry });
      }
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: fullscreen ? window.innerHeight - 48 : height,
        });
        setWrapW(containerRef.current.clientWidth);
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
            {prevClose != null && (
              <span style={{ ...legendItemStyle, color: trendColor }}>
                <span style={legendLabelStyle}>涨跌幅</span> {sign}
                {legend.changePct.toFixed(2)}%
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
      {hover &&
        (() => {
          const q = hover.q;
          const label = parseDateLabel(q.date);
          const base = q.prevClose;
          const valColor = (v: number | null | undefined) =>
            v == null || base == null
              ? CHART_COLORS.text
              : v >= base
                ? CHART_COLORS.up
                : CHART_COLORS.down;
          const chg = base != null ? (q.close ?? 0) - base : null;
          const chgPct = base ? ((chg ?? 0) / base) * 100 : null;
          const chgColor = chg == null || chg >= 0 ? CHART_COLORS.up : CHART_COLORS.down;
          const TIP_W = 200;
          const TIP_H = 280;
          const left = hover.x + 18 + TIP_W > wrapW ? hover.x - TIP_W - 14 : hover.x + 18;
          const top = Math.min(Math.max(hover.y - 30, 8), Math.max(chartHeight - TIP_H - 40, 8));
          const row = (name: string, value: string, extra?: CSSProperties) => (
            <div
              key={name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 18,
                lineHeight: '23px',
              }}
            >
              <span style={{ color: CHART_COLORS.textDim }}>{name}</span>
              <span style={{ fontWeight: 500, ...extra }}>{value}</span>
            </div>
          );
          const fmtSign = (v: number | null, suffix = '') => {
            if (v == null) return '—';
            return `${v > 0 ? '+' : ''}${v.toFixed(2)}${suffix}`;
          };
          return (
            <div style={{ ...tooltipStyle, left, top }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12.5 }}>
                {label.main}
                {label.week && <span style={{ marginLeft: 6 }}>{label.week}</span>}
              </div>
              {row('开盘', q.open?.toFixed(2) ?? '—', { color: valColor(q.open) })}
              {row('最高', q.high?.toFixed(2) ?? '—', { color: valColor(q.high) })}
              {row('最低', q.low?.toFixed(2) ?? '—', { color: valColor(q.low) })}
              {row('收盘', q.close?.toFixed(2) ?? '—', { color: valColor(q.close) })}
              {row('涨跌额', fmtSign(chg), { color: chgColor })}
              {row('涨跌幅', fmtSign(chgPct, '%'), { color: chgColor })}
              {row('成交量', q.volume != null ? formatVolume(q.volume) : '—')}
              {q.turnover != null && row('成交额', formatTurnover(q.turnover))}
              {hover.isLast &&
                liveTurnoverRate != null &&
                row('换手率', `${liveTurnoverRate.toFixed(3)}%`)}
              {hover.isLast && livePeRatio != null && row('市盈率', livePeRatio.toFixed(2))}
            </div>
          );
        })()}
      {!fullscreen && (
        <button style={expandBtnStyle} onClick={toggleFullscreen} title="全屏查看">
          ⛶
        </button>
      )}
      <div ref={containerRef} style={{ width: '100%', flex: fullscreen ? 1 : undefined }} />
    </div>
  );
}

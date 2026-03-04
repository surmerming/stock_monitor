import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuoteSSE } from '../hooks/useQuoteSSE';
import StockChart from '../components/StockChart';
import { formatVolume, formatMarketCap } from '../utils/format';
import type { QuoteData, ChartData } from '../types';
import './StockDetailPage.less';

const CHART_RANGES = [
  { key: '1d', label: '分时', interval: '1m' },
  { key: '5d', label: '5日', interval: '5m' },
  { key: '1mo', label: '1月', interval: '15m' },
  { key: '3mo', label: '3月', interval: '1d' },
  { key: '6mo', label: '6月', interval: '1d' },
  { key: '1y', label: '1年', interval: '1d' },
];

const REC_LABELS: Record<string, string> = {
  buy: '买入',
  strongBuy: '强烈买入',
  hold: '持有',
  sell: '卖出',
  strongSell: '强烈卖出',
  underperform: '跑输',
  outperform: '跑赢',
};

interface DetailPrice {
  exchange?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
}

interface SummaryDetail {
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  beta?: number;
}

interface FinancialData {
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  returnOnEquity?: number;
  revenueGrowth?: number;
  targetMeanPrice?: number;
  targetLowPrice?: number;
  targetHighPrice?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;
}

interface RecommendationTrendItem {
  period: string;
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
}

interface InsightRecommendation {
  rating?: string;
  targetPrice?: number;
}

interface Insights {
  recommendation?: InsightRecommendation;
}

interface ShortInterest {
  sharesShort?: number;
  sharesShortPriorMonth?: number;
  shortPercentOfFloat?: number;
  shortRatio?: number;
  floatShares?: number;
  sharesOutstanding?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  dateShortInterest?: string;
}

interface MajorHolders {
  institutionsPercentHeld?: number;
  insidersPercentHeld?: number;
  institutionsFloatPercentHeld?: number;
  institutionsCount?: number;
}

interface SigDev {
  date?: string;
  headline?: string;
}

interface DetailResponse {
  price?: DetailPrice;
  summaryDetail?: SummaryDetail;
  financialData?: FinancialData;
  recommendationTrend?: RecommendationTrendItem[];
  insights?: Insights & { sigDevs?: SigDev[] };
  shortInterest?: ShortInterest;
  majorHolders?: MajorHolders;
}

interface FundamentalPanelProps {
  detail: DetailResponse | null;
  liveQuote: QuoteData | null;
  loading: boolean;
}

interface AnalystPanelProps {
  detail: DetailResponse | null;
  loading: boolean;
}

interface ShortInterestPanelProps {
  detail: DetailResponse | null;
  loading: boolean;
}

function fmt(v: number | string | null | undefined): string {
  if (v == null) return '—';
  return typeof v === 'number' ? v.toFixed(2) : String(v);
}

function pctFmt(v: number | null | undefined): string {
  if (v == null) return '—';
  return (v * 100).toFixed(2) + '%';
}

function fmtBigNum(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1e8) return (v / 1e8).toFixed(2) + '亿';
  if (v >= 1e4) return (v / 1e4).toFixed(2) + '万';
  return v.toLocaleString();
}

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { quotes } = useQuoteSSE();

  const [activeRange, setActiveRange] = useState<string>('1d');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  const liveQuote = (symbol ? quotes[symbol] : null) || null;
  const rangeConfig = CHART_RANGES.find((r) => r.key === activeRange);

  const fetchChart = useCallback(async () => {
    if (!symbol || !rangeConfig) return;
    setChartLoading(true);
    try {
      const res = await fetch(
        `/api/stock/${encodeURIComponent(symbol)}/chart?interval=${rangeConfig.interval}&range=${activeRange}`,
      );
      const json = await res.json();
      setChartData(json);
    } catch {
      // keep stale
    } finally {
      setChartLoading(false);
    }
  }, [symbol, activeRange, rangeConfig]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  useEffect(() => {
    if (!symbol) return;
    setDetailLoading(true);
    fetch(`/api/stock/${encodeURIComponent(symbol)}/detail`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [symbol]);

  const priceData = detail?.price;
  const name = liveQuote?.name || priceData?.shortName || priceData?.longName || symbol || '';
  const price = liveQuote?.current_price ?? priceData?.regularMarketPrice ?? 0;
  const change = liveQuote?.change ?? priceData?.regularMarketChange ?? 0;
  const changePct =
    liveQuote?.change_percent ?? (priceData?.regularMarketChangePercent ?? 0) * 100;
  const isUp = change >= 0;
  const trend = isUp ? 'up' : 'down';
  const sign = isUp ? '+' : '';
  const chartType = activeRange === '1d' ? 'area' : 'candle';

  return (
    <div className="stock-detail">
      <button className="stock-detail__back" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="stock-detail__header">
        <div className="stock-detail__header-left">
          <h2 className="stock-detail__name">{name}</h2>
          <span className="stock-detail__symbol">{symbol}</span>
          {priceData?.exchange && (
            <span className="stock-detail__exchange">{priceData.exchange}</span>
          )}
        </div>
        <div className="stock-detail__header-right">
          <span className={`stock-detail__price stock-detail__price--${trend}`}>
            {price.toFixed(2)}
          </span>
          <span className={`stock-detail__change stock-detail__change--${trend}`}>
            {sign}
            {change.toFixed(2)} ({sign}
            {changePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="stock-detail__chart-section">
        <div className="stock-detail__range-tabs">
          {CHART_RANGES.map((r) => (
            <button
              key={r.key}
              className={`stock-detail__range-btn ${activeRange === r.key ? 'stock-detail__range-btn--active' : ''}`}
              onClick={() => setActiveRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="stock-detail__chart-wrap">
          {chartLoading && !chartData ? (
            <div className="stock-detail__chart-loading">加载中...</div>
          ) : chartData?.quotes?.length ? (
            <StockChart
              quotes={chartData.quotes}
              type={chartType}
              prevClose={activeRange === '1d' ? chartData.meta?.chartPreviousClose ?? null : null}
              timezone={chartData.meta?.timezone}
            />
          ) : (
            <div className="stock-detail__chart-loading">暂无图表数据</div>
          )}
        </div>
      </div>

      <div className="stock-detail__panels">
        <FundamentalPanel detail={detail} liveQuote={liveQuote} loading={detailLoading} />
        <AnalystPanel detail={detail} loading={detailLoading} />
      </div>

      <ShortInterestPanel detail={detail} loading={detailLoading} />

      {detail?.insights?.sigDevs && detail.insights.sigDevs.length > 0 && (
        <div className="stock-detail__section">
          <h3 className="stock-detail__section-title">重要动态</h3>
          <div className="stock-detail__events">
            {detail.insights.sigDevs.map((ev, i) => (
              <div key={i} className="stock-detail__event">
                <span className="stock-detail__event-date">
                  {ev.date ? new Date(ev.date).toLocaleDateString('zh-CN') : ''}
                </span>
                <span className="stock-detail__event-text">{ev.headline}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FundamentalPanel({ detail, liveQuote, loading }: FundamentalPanelProps) {
  if (loading) return <div className="fund-panel fund-panel--loading">加载中...</div>;

  const sd = detail?.summaryDetail;
  const fd = detail?.financialData;
  const p = detail?.price;

  const items: { label: string; value: string }[] = [
    { label: '今开', value: fmt(p?.regularMarketOpen) },
    { label: '昨收', value: fmt(p?.regularMarketPreviousClose) },
    { label: '最高', value: fmt(liveQuote?.day_high ?? p?.regularMarketDayHigh) },
    { label: '最低', value: fmt(liveQuote?.day_low ?? p?.regularMarketDayLow) },
    { label: '成交量', value: formatVolume(liveQuote?.volume ?? p?.regularMarketVolume) },
    { label: '市值', value: formatMarketCap(liveQuote?.market_cap ?? p?.marketCap) },
    { label: 'PE (TTM)', value: fmt(sd?.trailingPE) },
    { label: 'PE (远期)', value: fmt(sd?.forwardPE) },
    { label: 'PB', value: fmt(sd?.priceToBook) },
    {
      label: '股息率',
      value: sd?.dividendYield != null ? (sd.dividendYield * 100).toFixed(2) + '%' : '—',
    },
    { label: '52周最高', value: fmt(sd?.fiftyTwoWeekHigh) },
    { label: '52周最低', value: fmt(sd?.fiftyTwoWeekLow) },
    { label: '50日均线', value: fmt(sd?.fiftyDayAverage) },
    { label: '200日均线', value: fmt(sd?.twoHundredDayAverage) },
    { label: 'Beta', value: fmt(sd?.beta) },
    { label: '毛利率', value: pctFmt(fd?.grossMargins) },
    { label: '营业利润率', value: pctFmt(fd?.operatingMargins) },
    { label: '净利率', value: pctFmt(fd?.profitMargins) },
    { label: 'ROE', value: pctFmt(fd?.returnOnEquity) },
    { label: '营收增长', value: pctFmt(fd?.revenueGrowth) },
  ];

  return (
    <div className="fund-panel">
      <h3 className="fund-panel__title">基本面数据</h3>
      <div className="fund-panel__grid">
        {items.map((item) => (
          <div key={item.label} className="fund-panel__item">
            <span className="fund-panel__label">{item.label}</span>
            <span className="fund-panel__value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalystPanel({ detail, loading }: AnalystPanelProps) {
  if (loading) return <div className="analyst-panel analyst-panel--loading">加载中...</div>;

  const fd = detail?.financialData;
  const trend = detail?.recommendationTrend;
  const ins = detail?.insights;

  if (!fd?.targetMeanPrice && (!trend || trend.length === 0)) {
    return null;
  }

  const latestTrend = trend?.find((t) => t.period === '0m') || trend?.[0];
  const recLabel =
    (fd?.recommendationKey && REC_LABELS[fd.recommendationKey]) ||
    fd?.recommendationKey ||
    '—';

  return (
    <div className="analyst-panel">
      <h3 className="analyst-panel__title">分析师评级</h3>

      {fd?.targetMeanPrice != null && (
        <div className="analyst-panel__targets">
          <div className="analyst-panel__target-main">
            <span className="analyst-panel__target-label">目标均价</span>
            <span className="analyst-panel__target-value">{fd.targetMeanPrice.toFixed(2)}</span>
          </div>
          <div className="analyst-panel__target-range">
            <span>{fd.targetLowPrice?.toFixed(2) ?? '—'}</span>
            <div className="analyst-panel__target-bar">
              <div className="analyst-panel__target-bar-fill" />
            </div>
            <span>{fd.targetHighPrice?.toFixed(2) ?? '—'}</span>
          </div>
          <div className="analyst-panel__rec">
            <span className="analyst-panel__rec-label">综合评级</span>
            <span className="analyst-panel__rec-value">{String(recLabel)}</span>
            {fd.numberOfAnalystOpinions != null && (
              <span className="analyst-panel__rec-count">
                ({fd.numberOfAnalystOpinions} 位分析师)
              </span>
            )}
          </div>
        </div>
      )}

      {latestTrend && (
        <div className="analyst-panel__distribution">
          <h4 className="analyst-panel__sub-title">评级分布 (本月)</h4>
          <div className="analyst-panel__bars">
            {[
              { label: '强买', value: latestTrend.strongBuy, color: '#e8364e' },
              { label: '买入', value: latestTrend.buy, color: '#f5816b' },
              { label: '持有', value: latestTrend.hold, color: '#faad14' },
              { label: '卖出', value: latestTrend.sell, color: '#73d897' },
              { label: '强卖', value: latestTrend.strongSell, color: '#00a86b' },
            ].map((bar) => {
              const total =
                (latestTrend.strongBuy || 0) +
                (latestTrend.buy || 0) +
                (latestTrend.hold || 0) +
                (latestTrend.sell || 0) +
                (latestTrend.strongSell || 0);
              const pct = total > 0 ? ((bar.value || 0) / total) * 100 : 0;
              return (
                <div key={bar.label} className="analyst-panel__bar-row">
                  <span className="analyst-panel__bar-label">{bar.label}</span>
                  <div className="analyst-panel__bar-track">
                    <div
                      className="analyst-panel__bar-fill"
                      style={{ width: `${pct}%`, background: bar.color }}
                    />
                  </div>
                  <span className="analyst-panel__bar-count">{bar.value || 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ins?.recommendation && (
        <div className="analyst-panel__insight-rec">
          <span className="analyst-panel__insight-label">Yahoo 评级:</span>
          <span className="analyst-panel__insight-value">{ins.recommendation.rating}</span>
          {ins.recommendation.targetPrice != null && (
            <span className="analyst-panel__insight-target">
              目标价 {ins.recommendation.targetPrice.toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface ShortPanelItem {
  label: string;
  value: string;
  color?: string;
}

function ShortInterestPanel({ detail, loading }: ShortInterestPanelProps) {
  if (loading) return null;

  const si = detail?.shortInterest;
  const mh = detail?.majorHolders;
  const hasShortData = si?.sharesShort != null;
  const hasHolderData = mh?.institutionsPercentHeld != null;

  if (!hasShortData && !hasHolderData) return null;

  const shortPctFloat = si?.shortPercentOfFloat;
  const shortPctPrev =
    si?.sharesShort != null && si?.sharesShortPriorMonth != null
      ? ((si.sharesShort - si.sharesShortPriorMonth) / si.sharesShortPriorMonth) * 100
      : null;

  let sentimentLevel = '—';
  let sentimentColor = '#8892a4';
  if (shortPctFloat != null) {
    if (shortPctFloat > 0.2) {
      sentimentLevel = '极度看空';
      sentimentColor = '#00a86b';
    } else if (shortPctFloat > 0.1) {
      sentimentLevel = '偏空';
      sentimentColor = '#52c77a';
    } else if (shortPctFloat > 0.05) {
      sentimentLevel = '中性';
      sentimentColor = '#faad14';
    } else {
      sentimentLevel = '偏多';
      sentimentColor = '#e8364e';
    }
  }

  const items: ShortPanelItem[] = [];

  if (hasShortData && si) {
    items.push(
      { label: '做空股数', value: fmtBigNum(si.sharesShort) },
      { label: '上月做空股数', value: fmtBigNum(si.sharesShortPriorMonth) },
      {
        label: '做空环比变化',
        value:
          shortPctPrev != null
            ? (shortPctPrev >= 0 ? '+' : '') + shortPctPrev.toFixed(2) + '%'
            : '—',
        color: shortPctPrev != null ? (shortPctPrev > 0 ? '#00a86b' : '#e8364e') : undefined,
      },
      { label: '做空占流通比', value: pctFmt(shortPctFloat) },
      { label: '做空比率 (天)', value: si.shortRatio != null ? si.shortRatio.toFixed(2) : '—' },
      { label: '流通股', value: fmtBigNum(si.floatShares) },
      { label: '总股本', value: fmtBigNum(si.sharesOutstanding) },
    );
  }

  if (hasHolderData && mh) {
    items.push(
      { label: '机构持股比例', value: pctFmt(mh.institutionsPercentHeld) },
      { label: '内部人持股比例', value: pctFmt(mh.insidersPercentHeld) },
      { label: '机构占流通比', value: pctFmt(mh.institutionsFloatPercentHeld) },
      { label: '持股机构数', value: mh.institutionsCount != null ? String(mh.institutionsCount) : '—' },
    );
  }

  if (hasShortData && si) {
    items.push({
      label: '内部人持股',
      value: pctFmt(si.heldPercentInsiders),
    });
    items.push({
      label: '机构持股',
      value: pctFmt(si.heldPercentInstitutions),
    });
  }

  const barPct = shortPctFloat != null ? Math.min(shortPctFloat * 100, 100) : 0;

  return (
    <div className="short-panel">
      <h3 className="short-panel__title">做空 / 做多情绪</h3>

      {hasShortData && si && (
        <div className="short-panel__sentiment">
          <div className="short-panel__sentiment-header">
            <span className="short-panel__sentiment-label">多空情绪</span>
            <span className="short-panel__sentiment-value" style={{ color: sentimentColor }}>
              {sentimentLevel}
            </span>
          </div>
          <div className="short-panel__bar-track">
            <div
              className="short-panel__bar-fill"
              style={{ width: `${barPct}%`, background: sentimentColor }}
            />
          </div>
          <div className="short-panel__bar-labels">
            <span>做多（做空占比低）</span>
            <span>做空（做空占比高）</span>
          </div>
          {si.dateShortInterest && (
            <div className="short-panel__date">
              数据日期: {new Date(si.dateShortInterest).toLocaleDateString('zh-CN')}
            </div>
          )}
        </div>
      )}

      <div className="short-panel__grid">
        {items.map((item) => (
          <div key={item.label} className="short-panel__item">
            <span className="short-panel__label">{item.label}</span>
            <span className="short-panel__value" style={item.color ? { color: item.color } : undefined}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

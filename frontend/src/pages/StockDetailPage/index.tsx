import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuoteSSE } from '../../hooks/useQuoteSSE';
import { useWatchlist } from '../../hooks/useWatchlist';
import StockChart from '../../components/StockChart';
import StockPattern from '../../components/StockPattern';
import StockInteraction from '../../components/StockInteraction';
import { formatVolume, formatMarketCap } from '../../utils/format';
import type { QuoteData, ChartData } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import { CHART_RANGES, REC_LABELS, SHEET_TABS, type FinSheetTab } from '../../configs/chart';
import './style.less';

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
  // === Yahoo Finance 风格字段（保留兼容）===
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  returnOnEquity?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  totalRevenue?: number;
  targetMeanPrice?: number;
  targetLowPrice?: number;
  targetHighPrice?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;

  // === 新浪财务扩展 ===
  // 盈利能力
  roeAvg?: number;
  roeDiluted?: number;
  roeNet?: number;
  roa?: number;
  roic?: number;
  ebitMargin?: number;

  // 财务风险
  currentRatio?: number;
  quickRatio?: number;
  debtRatio?: number;
  equityMultiplier?: number;
  cashRatio?: number;

  // 营运能力
  arTurn?: number;
  arDays?: number;
  invTurn?: number;
  invDays?: number;
  taTurn?: number;

  // 收益质量
  ocfToProfit?: number;
  costExpenseRatio?: number;

  // 每股指标
  basicEPS?: number;
  dilutedEPS?: number;
  bps?: number;
  ocfps?: number;
  fcps?: number;
  udpps?: number;
  cappps?: number;
  surppps?: number;

  // 绝对值（元）
  revenue?: number;
  cost?: number;
  netProfit?: number;
  netProfitParent?: number;
  netProfitDeducted?: number;
  equity?: number;
  totalAssets?: number;
  ocf?: number;
}

interface MoneyflowDetail {
  date: string;
  netFlow: number; // 主力净流入（超大单+大单）
  superNet: number; // 超大单净流入
  largeNet: number; // 大单净流入
  mediumNet: number; // 中单净流入
  smallNet: number; // 小单净流入
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

interface NewsItem {
  title?: string;
  link?: string;
  publisher?: string;
  publishTime?: string;
}

interface DetailResponse {
  price?: DetailPrice;
  summaryDetail?: SummaryDetail;
  financialData?: FinancialData;
  moneyflow?: MoneyflowDetail | null;
  recommendationTrend?: RecommendationTrendItem[];
  insights?: Insights & { sigDevs?: SigDev[] };
  shortInterest?: ShortInterest;
  majorHolders?: MajorHolders;
  news?: NewsItem[];
}

interface IncomeItem {
  date: string;
  periodType?: string;
  totalRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebit: number | null;
  ebitda: number | null;
  dilutedEPS: number | null;
  basicEPS: number | null;
  costOfRevenue: number | null;
  researchAndDevelopment: number | null;
  sellingGeneralAndAdministration: number | null;
}

interface BalanceItem {
  date: string;
  periodType?: string;
  totalAssets: number | null;
  totalLiabilitiesNetMinorityInterest: number | null;
  stockholdersEquity: number | null;
  cashAndCashEquivalents: number | null;
  totalDebt: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  inventory: number | null;
  receivables: number | null;
}

interface CashflowItem {
  date: string;
  periodType?: string;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
}

interface FinancialsPeriod {
  income: IncomeItem[];
  balance: BalanceItem[];
  cashflow: CashflowItem[];
}

interface FinancialsData {
  quarterly: FinancialsPeriod;
  annual: FinancialsPeriod;
  earningsChart: {
    yearly?: { date: number; revenue: number; earnings: number }[];
    quarterly?: { date: string; revenue: number; earnings: number }[];
  } | null;
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
  const { symbols: watchSymbols, addSymbols, removeSymbol } = useWatchlist();

  const [activeRange, setActiveRange] = useState<string>('daily');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [financials, setFinancials] = useState<FinancialsData | null>(null);
  const [financialsLoading, setFinancialsLoading] = useState(true);

  const liveQuote = (symbol ? quotes[symbol] : null) || null;
  const rangeConfig = CHART_RANGES.find((r) => r.key === activeRange);

  const fetchChart = useCallback(async () => {
    if (!symbol || !rangeConfig) return;
    setChartLoading(true);
    try {
      const res = await apiFetch(
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
    apiFetch(`/api/stock/${encodeURIComponent(symbol)}/detail`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    setFinancialsLoading(true);
    apiFetch(`/api/stock/${encodeURIComponent(symbol)}/financials`)
      .then((r) => r.json())
      .then((d) => setFinancials(d))
      .catch(() => {})
      .finally(() => setFinancialsLoading(false));
  }, [symbol]);

  const priceData = detail?.price;
  const name = liveQuote?.name || priceData?.shortName || priceData?.longName || symbol || '';
  const price = liveQuote?.current_price ?? priceData?.regularMarketPrice ?? 0;
  const change = liveQuote?.change ?? priceData?.regularMarketChange ?? 0;
  const changePct = liveQuote?.change_percent ?? (priceData?.regularMarketChangePercent ?? 0) * 100;
  const isUp = change >= 0;
  const trend = isUp ? 'up' : 'down';
  const sign = isUp ? '+' : '';
  const chartType = 'candle';

  const upperSymbol = (symbol ?? '').toUpperCase();
  const isWatched = watchSymbols.some((s) => s.toUpperCase() === upperSymbol);

  const handleToggleWatch = useCallback(() => {
    if (!upperSymbol) return;
    if (isWatched) {
      removeSymbol(upperSymbol);
    } else {
      addSymbols([upperSymbol]);
    }
  }, [upperSymbol, isWatched, addSymbols, removeSymbol]);

  return (
    <div className="stock-detail">
      <div className="stock-detail__header">
        <div className="stock-detail__header-left">
          <button className="stock-detail__back" onClick={() => navigate(-1)}>
            ← 返回
          </button>
          <h2 className="stock-detail__name">{name}</h2>
          <span className="stock-detail__symbol">{symbol}</span>
          {priceData?.exchange && (
            <span className="stock-detail__exchange">{priceData.exchange}</span>
          )}
          <button
            className={`stock-detail__watch-btn ${isWatched ? 'stock-detail__watch-btn--active' : ''}`}
            onClick={handleToggleWatch}
            disabled={!upperSymbol}
          >
            {isWatched ? '★ 已监控' : '☆ 加入监控'}
          </button>
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
              timezone={chartData.meta?.timezone}
              liveTurnoverRate={liveQuote?.turnover_rate ?? null}
              livePeRatio={liveQuote?.pe_ratio ?? null}
            />
          ) : (
            <div className="stock-detail__chart-loading">暂无图表数据</div>
          )}
        </div>
      </div>

      <div className="stock-detail__panels">
        <FundamentalPanel detail={detail} liveQuote={liveQuote} loading={detailLoading} />
        <div className="stock-detail__side-panels">
          {symbol && <StockPattern key={symbol} symbol={symbol} />}
          <AnalystPanel detail={detail} loading={detailLoading} />
        </div>
      </div>

      <ShortInterestPanel detail={detail} loading={detailLoading} />

      <FinancialReportPanel financials={financials} loading={financialsLoading} />

      {detail?.news && detail.news.length > 0 && (
        <div className="events-panel">
          <h3 className="events-panel__title">相关新闻</h3>
          <div className="events-panel__list">
            {detail.news.map((n, i) => (
              <a
                key={i}
                className="events-panel__item"
                href={n.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="events-panel__date">
                  {n.publishTime ? new Date(n.publishTime).toLocaleDateString('zh-CN') : ''}
                </span>
                <span className="events-panel__text">{n.title}</span>
                {n.publisher && <span className="events-panel__source">{n.publisher}</span>}
                <span className="events-panel__arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {symbol && <StockInteraction key={symbol} symbol={symbol} />}
    </div>
  );
}

function fmtAbs(v: number | null | undefined): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e8) return (v / 1e8).toFixed(2) + '亿';
  if (Math.abs(v) >= 1e4) return (v / 1e4).toFixed(2) + '万';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  if (Math.abs(v) >= 1e8) return sign + (v / 1e8).toFixed(2) + '亿';
  if (Math.abs(v) >= 1e4) return sign + (v / 1e4).toFixed(0) + '万';
  return sign + v.toFixed(0);
}

function MoneyflowItem({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  const isUp = value >= 0;
  return (
    <div className="fund-panel__item">
      <span className="fund-panel__label">{label}</span>
      <span className={`fund-panel__value fund-panel__value--${isUp ? 'up' : 'down'}`}>
        {fmtMoney(value)}
      </span>
    </div>
  );
}

function FundamentalPanel({ detail, liveQuote, loading }: FundamentalPanelProps) {
  if (loading) return <div className="fund-panel fund-panel--loading">加载中...</div>;

  const sd = detail?.summaryDetail;
  const fd = detail?.financialData;
  const p = detail?.price;
  const mf = detail?.moneyflow;

  // 价格指标
  const priceItems: { label: string; value: string }[] = [
    { label: '今开', value: fmt(p?.regularMarketOpen) },
    { label: '昨收', value: fmt(p?.regularMarketPreviousClose) },
    { label: '最高', value: fmt(liveQuote?.day_high ?? p?.regularMarketDayHigh) },
    { label: '最低', value: fmt(liveQuote?.day_low ?? p?.regularMarketDayLow) },
    { label: '成交量', value: formatVolume(liveQuote?.volume ?? p?.regularMarketVolume) },
    { label: '市值', value: formatMarketCap(liveQuote?.market_cap ?? p?.marketCap) },
    { label: 'PE (TTM)', value: fmt(sd?.trailingPE) },
    { label: 'PE (动态)', value: fmt(liveQuote?.pe_ratio_dynamic) },
    { label: 'PE (静态)', value: fmt(liveQuote?.pe_ratio_static) },
    { label: 'PB', value: fmt(sd?.priceToBook) },
    {
      label: '股息率',
      value:
        liveQuote?.dividend_yield != null
          ? (liveQuote.dividend_yield * 100).toFixed(2) + '%'
          : sd?.dividendYield != null
            ? (sd.dividendYield * 100).toFixed(2) + '%'
            : '—',
    },
    { label: '52周高', value: fmt(sd?.fiftyTwoWeekHigh) },
    { label: '52周低', value: fmt(sd?.fiftyTwoWeekLow) },
  ];

  // 盈利能力（百分比）
  const profitItems: { label: string; value: string }[] = [
    { label: 'ROE', value: pctFmt(fd?.returnOnEquity) },
    { label: 'ROE(平均)', value: pctFmt(fd?.roeAvg) },
    { label: 'ROE(扣非)', value: pctFmt(fd?.roeNet) },
    { label: 'ROA', value: pctFmt(fd?.roa) },
    { label: 'ROIC', value: pctFmt(fd?.roic) },
    { label: '毛利率', value: pctFmt(fd?.grossMargins) },
    { label: '净利率', value: pctFmt(fd?.profitMargins) },
    { label: '营业利润率', value: pctFmt(fd?.operatingMargins) },
    { label: '息税前利润率', value: pctFmt(fd?.ebitMargin) },
  ];

  // 成长能力
  const growthItems: { label: string; value: string }[] = [
    { label: '营收增长', value: pctFmt(fd?.revenueGrowth) },
    { label: '净利增长', value: pctFmt(fd?.earningsGrowth) },
  ];

  // 财务风险
  const riskItems: { label: string; value: string }[] = [
    { label: '流动比率', value: fmt(fd?.currentRatio) },
    { label: '速动比率', value: fmt(fd?.quickRatio) },
    { label: '资产负债率', value: pctFmt(fd?.debtRatio) },
    { label: '权益乘数', value: fmt(fd?.equityMultiplier) },
    { label: '现金比率', value: fmt(fd?.cashRatio) },
  ];

  // 营运能力
  const turnItems: { label: string; value: string }[] = [
    { label: '应收周转率', value: fmt(fd?.arTurn) },
    { label: '应收周转天', value: fmt(fd?.arDays) },
    { label: '存货周转率', value: fmt(fd?.invTurn) },
    { label: '存货周转天', value: fmt(fd?.invDays) },
    { label: '总资产周转率', value: fmt(fd?.taTurn) },
  ];

  // 每股指标
  const perShareItems: { label: string; value: string }[] = [
    { label: 'EPS(基本)', value: fmt(fd?.basicEPS) },
    { label: 'EPS(稀释)', value: fmt(fd?.dilutedEPS) },
    { label: '每股净资产', value: fmt(fd?.bps) },
    { label: '每股经营现金流', value: fmt(fd?.ocfps) },
    { label: '每股自由现金流', value: fmt(fd?.fcps) },
    { label: '每股未分配利润', value: fmt(fd?.udpps) },
  ];

  // 绝对值
  const absItems: { label: string; value: string }[] = [
    { label: '营收', value: fmtAbs(fd?.revenue) },
    { label: '营业成本', value: fmtAbs(fd?.cost) },
    { label: '净利润', value: fmtAbs(fd?.netProfit) },
    { label: '归母净利', value: fmtAbs(fd?.netProfitParent) },
    { label: '扣非净利', value: fmtAbs(fd?.netProfitDeducted) },
    { label: '股东权益', value: fmtAbs(fd?.equity) },
    { label: '经营现金流', value: fmtAbs(fd?.ocf) },
  ];

  const renderGroup = (title: string, items: { label: string; value: string }[]) => {
    const visible = items.filter((i) => i.value !== '—');
    if (visible.length === 0) return null;
    return (
      <div className="fund-panel__group">
        <h4 className="fund-panel__group-title">{title}</h4>
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
  };

  return (
    <div className="fund-panel">
      <h3 className="fund-panel__title">基本面</h3>
      {renderGroup('价格指标', priceItems)}
      {renderGroup('盈利能力', profitItems)}
      {renderGroup('成长能力', growthItems)}
      {renderGroup('财务风险', riskItems)}
      {renderGroup('营运能力', turnItems)}
      {renderGroup('每股指标', perShareItems)}
      {renderGroup('绝对值', absItems)}

      {/* 资金流向（东财 fflow daykline） */}
      {mf && (
        <div className="fund-panel__group">
          <h4 className="fund-panel__group-title">
            资金流向 <span className="fund-panel__date">({mf.date})</span>
          </h4>
          <div className="fund-panel__grid">
            <MoneyflowItem label="主力净流入" value={mf.netFlow} />
            <MoneyflowItem label="超大单净流入" value={mf.superNet} />
            <MoneyflowItem label="大单净流入" value={mf.largeNet} />
            <MoneyflowItem label="中单净流入" value={mf.mediumNet} />
            <MoneyflowItem label="小单净流入" value={mf.smallNet} />
          </div>
        </div>
      )}
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
    (fd?.recommendationKey && REC_LABELS[fd.recommendationKey]) || fd?.recommendationKey || '—';

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
      {
        label: '持股机构数',
        value: mh.institutionsCount != null ? String(mh.institutionsCount) : '—',
      },
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

  const shortPct = shortPctFloat != null ? Math.min(shortPctFloat * 100, 100) : 0;
  const longPct = 100 - shortPct;

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
          <div className="short-panel__dual-bar">
            <div className="short-panel__dual-bar-long" style={{ width: `${longPct}%` }} />
            <div className="short-panel__dual-bar-short" style={{ width: `${shortPct}%` }} />
          </div>
          <div className="short-panel__bar-labels">
            <span className="short-panel__bar-label-long">做多 {longPct.toFixed(2)}%</span>
            <span className="short-panel__bar-label-short">做空 {shortPct.toFixed(2)}%</span>
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
            <span
              className="short-panel__value"
              style={item.color ? { color: item.color } : undefined}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type FinPeriodTab = 'quarterly' | 'annual';

function fmtFinDate(d: string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function fmtFinNum(v: number | null): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e8) return sign + (abs / 1e8).toFixed(2) + '亿';
  if (abs >= 1e4) return sign + (abs / 1e4).toFixed(2) + '万';
  return v.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function calcMargin(numerator: number | null, denominator: number | null): string {
  if (numerator == null || denominator == null || denominator === 0) return '—';
  return ((numerator / denominator) * 100).toFixed(2) + '%';
}

interface FinancialReportPanelProps {
  financials: FinancialsData | null;
  loading: boolean;
}

function FinancialReportPanel({ financials, loading }: FinancialReportPanelProps) {
  const [periodTab, setPeriodTab] = useState<FinPeriodTab>('quarterly');
  const [sheetTab, setSheetTab] = useState<FinSheetTab>('income');

  const periodData = financials?.[periodTab];

  const hasAnyData =
    periodData &&
    (periodData.income.length > 0 ||
      periodData.balance.length > 0 ||
      periodData.cashflow.length > 0);

  if (loading) {
    return (
      <div className="fin-panel fin-panel--loading">
        <div className="fin-panel__sk-text">财务数据加载中...</div>
      </div>
    );
  }

  if (!financials || !hasAnyData) return null;

  return (
    <div className="fin-panel">
      <div className="fin-panel__header">
        <h3 className="fin-panel__title">财务报表</h3>
        <div className="fin-panel__period-tabs">
          {(['quarterly', 'annual'] as const).map((p) => (
            <button
              key={p}
              className={`fin-panel__period-btn ${periodTab === p ? 'fin-panel__period-btn--active' : ''}`}
              onClick={() => setPeriodTab(p)}
            >
              {p === 'quarterly' ? '季报' : '年报'}
            </button>
          ))}
        </div>
      </div>

      <div className="fin-panel__sheet-tabs">
        {SHEET_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`fin-panel__sheet-btn ${sheetTab === key ? 'fin-panel__sheet-btn--active' : ''}`}
            onClick={() => setSheetTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {sheetTab === 'income' && <IncomeTable items={periodData?.income ?? []} />}
      {sheetTab === 'balance' && <BalanceTable items={periodData?.balance ?? []} />}
      {sheetTab === 'cashflow' && <CashflowTable items={periodData?.cashflow ?? []} />}
    </div>
  );
}

function IncomeTable({ items }: { items: IncomeItem[] }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [items],
  );

  if (sorted.length === 0) return <div className="fin-panel__empty">暂无利润表数据</div>;

  const rows: {
    label: string;
    key: string;
    getter: (r: IncomeItem) => string;
    highlight?: boolean;
  }[] = [
    {
      label: '营业收入',
      key: 'revenue',
      getter: (r) => fmtFinNum(r.totalRevenue),
      highlight: true,
    },
    { label: '营业成本', key: 'cost', getter: (r) => fmtFinNum(r.costOfRevenue) },
    { label: '毛利润', key: 'gross', getter: (r) => fmtFinNum(r.grossProfit), highlight: true },
    { label: '毛利率', key: 'gm', getter: (r) => calcMargin(r.grossProfit, r.totalRevenue) },
    { label: '研发费用', key: 'rd', getter: (r) => fmtFinNum(r.researchAndDevelopment) },
    {
      label: '销售及管理费',
      key: 'sga',
      getter: (r) => fmtFinNum(r.sellingGeneralAndAdministration),
    },
    { label: '营业利润', key: 'opIncome', getter: (r) => fmtFinNum(r.operatingIncome) },
    {
      label: '营业利润率',
      key: 'om',
      getter: (r) => calcMargin(r.operatingIncome, r.totalRevenue),
    },
    { label: '净利润', key: 'net', getter: (r) => fmtFinNum(r.netIncome), highlight: true },
    { label: '净利率', key: 'nm', getter: (r) => calcMargin(r.netIncome, r.totalRevenue) },
    { label: 'EBITDA', key: 'ebitda', getter: (r) => fmtFinNum(r.ebitda) },
    {
      label: '每股收益 (稀释)',
      key: 'eps',
      getter: (r) => (r.dilutedEPS != null ? r.dilutedEPS.toFixed(2) : '—'),
    },
  ];

  return <FinTable dates={sorted.map((r) => r.date)} rows={rows} data={sorted} />;
}

function BalanceTable({ items }: { items: BalanceItem[] }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [items],
  );

  if (sorted.length === 0) return <div className="fin-panel__empty">暂无资产负债表数据</div>;

  const rows: {
    label: string;
    key: string;
    getter: (r: BalanceItem) => string;
    highlight?: boolean;
  }[] = [
    { label: '总资产', key: 'ta', getter: (r) => fmtFinNum(r.totalAssets), highlight: true },
    { label: '流动资产', key: 'ca', getter: (r) => fmtFinNum(r.currentAssets) },
    { label: '现金及等价物', key: 'cash', getter: (r) => fmtFinNum(r.cashAndCashEquivalents) },
    { label: '应收账款', key: 'recv', getter: (r) => fmtFinNum(r.receivables) },
    { label: '存货', key: 'inv', getter: (r) => fmtFinNum(r.inventory) },
    {
      label: '总负债',
      key: 'tl',
      getter: (r) => fmtFinNum(r.totalLiabilitiesNetMinorityInterest),
      highlight: true,
    },
    { label: '流动负债', key: 'cl', getter: (r) => fmtFinNum(r.currentLiabilities) },
    { label: '总债务', key: 'debt', getter: (r) => fmtFinNum(r.totalDebt) },
    {
      label: '股东权益',
      key: 'eq',
      getter: (r) => fmtFinNum(r.stockholdersEquity),
      highlight: true,
    },
    {
      label: '资产负债率',
      key: 'dar',
      getter: (r) => calcMargin(r.totalLiabilitiesNetMinorityInterest, r.totalAssets),
    },
    {
      label: '流动比率',
      key: 'cr',
      getter: (r) =>
        r.currentAssets != null && r.currentLiabilities != null && r.currentLiabilities !== 0
          ? (r.currentAssets / r.currentLiabilities).toFixed(2)
          : '—',
    },
  ];

  return <FinTable dates={sorted.map((r) => r.date)} rows={rows} data={sorted} />;
}

function CashflowTable({ items }: { items: CashflowItem[] }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [items],
  );

  if (sorted.length === 0) return <div className="fin-panel__empty">暂无现金流量表数据</div>;

  const rows: {
    label: string;
    key: string;
    getter: (r: CashflowItem) => string;
    highlight?: boolean;
  }[] = [
    {
      label: '经营活动现金流',
      key: 'opcf',
      getter: (r) => fmtFinNum(r.operatingCashFlow),
      highlight: true,
    },
    { label: '资本开支', key: 'capex', getter: (r) => fmtFinNum(r.capitalExpenditure) },
    { label: '自由现金流', key: 'fcf', getter: (r) => fmtFinNum(r.freeCashFlow), highlight: true },
    { label: '投资活动现金流', key: 'invcf', getter: (r) => fmtFinNum(r.investingCashFlow) },
    { label: '筹资活动现金流', key: 'fincf', getter: (r) => fmtFinNum(r.financingCashFlow) },
  ];

  return <FinTable dates={sorted.map((r) => r.date)} rows={rows} data={sorted} />;
}

interface FinTableProps<T> {
  dates: string[];
  rows: { label: string; key: string; getter: (r: T) => string; highlight?: boolean }[];
  data: T[];
}

function FinTable<T>({ dates, rows, data }: FinTableProps<T>) {
  return (
    <div className="fin-panel__table-wrap">
      <table className="fin-panel__table">
        <thead>
          <tr>
            <th className="fin-panel__th fin-panel__th--label">指标</th>
            {dates.map((d) => (
              <th key={d} className="fin-panel__th">
                {fmtFinDate(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.highlight ? 'fin-panel__tr--highlight' : ''}>
              <td className="fin-panel__td fin-panel__td--label">{row.label}</td>
              {data.map((item, i) => (
                <td key={dates[i]} className="fin-panel__td">
                  {row.getter(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

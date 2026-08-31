export interface QuoteData {
  symbol: string;
  name: string;
  market: string;
  currency: string;
  current_price: number;
  change: number;
  change_percent: number;
  open_price: number;
  prev_close: number;
  day_high: number;
  day_low: number;
  volume: number;
  avg_volume: number;
  turnover: number;
  turnover_rate: number;
  volume_ratio: number;
  market_cap: number;
  pe_ratio: number | null;
  pe_ratio_dynamic?: number | null;
  pe_ratio_static?: number | null;
  pb_ratio?: number | null;
  dividend_yield?: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  sixty_day_avg?: number | null;
  two_hundred_fifty_day_avg?: number | null;
  roe?: number | null;
  gross_margin?: number | null;
  net_margin?: number | null;
  operating_margin?: number | null;
  revenue_growth?: number | null;
  earnings_growth?: number | null;
  timestamp: string;
  fetchError?: string | null;
  market_state?: string | null;
  pre_market_price?: number | null;
  pre_market_change?: number | null;
  pre_market_change_percent?: number | null;
  post_market_price?: number | null;
  post_market_change?: number | null;
  post_market_change_percent?: number | null;
}

export type QuoteMap = Record<string, QuoteData>;

export interface MarketStatus {
  market: string;
  isOpen: boolean;
}

export interface AlertItem {
  id?: number;
  ruleId?: number;
  symbol: string;
  message: string;
  triggeredAt?: string;
  quoteSnapshot?: unknown;
  _read?: boolean;
}

export interface AlertRule {
  id: number;
  ruleId?: number;
  symbol: string;
  type: string;
  threshold: number;
  enabled: boolean;
  cooldownMinutes: number;
  triggered: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WatchlistItem {
  id: number;
  symbol: string;
  name: string;
  market: string;
}

export interface ChartQuote {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  turnover?: number | null;
}

export interface ChartMeta {
  symbol: string;
  currency: string;
  exchangeName: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  timezone: string;
}

export interface ChartData {
  meta: ChartMeta;
  quotes: ChartQuote[];
}

export type FlashDirection = 'up' | 'down' | null;

export interface MoneyFlowItem {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  turnover: number;
  marketCap: number | null;
  netFlow: number;
  flowIntensity: number;
  largeNetFlow: number;
  largeInflow: number;
  largeOutflow: number;
  exchange: string;
}

export interface MoneyFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  largeInflow: number;
  largeOutflow: number;
  largeNetFlow: number;
  mediumInflow: number;
  mediumOutflow: number;
  mediumNetFlow: number;
  smallInflow: number;
  smallOutflow: number;
  smallNetFlow: number;
}

export interface MoneyFlowTimeline {
  time: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  cumulativeNetFlow: number;
}

export interface MoneyFlowLargeBar {
  time: string;
  volume: number;
  amount: number;
  direction: 'buy' | 'sell';
  price: number;
}

export interface MoneyFlowDetail {
  symbol: string;
  name: string;
  summary: MoneyFlowSummary;
  timeline: MoneyFlowTimeline[];
  largeBars: MoneyFlowLargeBar[];
}

// =================== Backtest ===================

export interface BacktestTrade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  holdDays: number;
  exitReason: 'signal' | 'stop_loss' | 'take_profit' | 'max_hold' | 'end';
}

export interface BacktestStats {
  totalReturn: number;
  benchmarkReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgHoldDays: number;
  avgPnlPercent: number;
  maxWin: number;
  maxLoss: number;
}

export interface BacktestResult {
  symbol: string;
  symbolName: string;
  trades: BacktestTrade[];
  equity: { date: string; value: number }[];
  benchmark: { date: string; value: number }[];
  stats: BacktestStats;
}

// =================== Sector Rotation ===================

export interface SectorRotationItem {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change1d: number;
  change5d: number;
  change1m: number;
  change3m: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  rsScore: number;
  momentum: number;
}

export interface SectorHeatmapItem {
  symbol: string;
  name: string;
  sector: string;
  change1d: number;
  change5d: number;
  change1m: number;
  marketCap: number | null;
}

// =================== Pattern Recognition ===================

export interface PatternSignal {
  type: string;
  label: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  date: string;
  price: number;
  description: string;
  strength: number;
}

export interface SupportResistance {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  touchCount: number;
}

export interface PatternResult {
  symbol: string;
  patterns: PatternSignal[];
  supports: SupportResistance[];
  trendLines: {
    startDate: string;
    startPrice: number;
    endDate: string;
    endPrice: number;
    type: 'up' | 'down';
  }[];
}

// =================== Market Sentiment ===================

// =================== Review ===================

export interface MaStatus {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
  alignment: 'bullish' | 'bearish' | 'mixed';
}

export interface TechnicalSignals {
  macd: { dif: number | null; dea: number | null; hist: number | null; signal: string };
  kdj: { k: number | null; d: number | null; j: number | null; signal: string };
  rsi: number | null;
  boll: { position: number | null; width: number | null };
}

export interface AnomalyTag {
  type: string;
  label: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface ReviewScore {
  total: number;
  trend: number;
  volume: number;
  technical: number;
  moneyFlow: number;
  pattern: number;
  diagnosis: string;
}

export interface WatchlistReviewItem {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  amplitude: number;
  volume: number;
  turnover: number;
  turnoverRate: number | null;
  volumeRatio: number | null;
  avgVolume: number | null;
  volMa5Ratio: number | null;
  netFlow: number;
  largeNetFlow: number;
  maStatus: MaStatus;
  technicals: TechnicalSignals;
  patterns: PatternSignal[];
  anomalies: AnomalyTag[];
  score: ReviewScore;
}

export interface VolumePricePoint {
  date: string;
  close: number;
  volume: number;
  obv: number;
  divergence: 'none' | 'top' | 'bottom';
}

export interface StockReviewDetail {
  symbol: string;
  name: string;
  market: string;
  quote: {
    price: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    prevClose: number;
    volume: number;
    turnover: number;
    turnoverRate: number | null;
    volumeRatio: number | null;
    marketCap: number | null;
    pe: number | null;
  };
  maStatus: MaStatus;
  technicals: TechnicalSignals;
  patterns: PatternSignal[];
  supports: SupportResistance[];
  trendLines: { startDate: string; startPrice: number; endDate: string; endPrice: number; type: 'up' | 'down' }[];
  anomalies: AnomalyTag[];
  score: ReviewScore;
  moneyFlow: {
    netFlow: number;
    largeNetFlow: number;
    timeline: MoneyFlowTimeline[];
  } | null;
  chartBars: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>;
  volumePrice: VolumePricePoint[];
}

// =================== Market Sentiment ===================

export interface SentimentGauge {
  score: number;
  level: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  label: string;
  components: { name: string; score: number; weight: number }[];
}

export interface VixData {
  current: number;
  change: number;
  changePercent: number;
  level: 'low' | 'medium' | 'high' | 'extreme';
}

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  advanceRatio: number;
  aboveMa20Pct: number;
  aboveMa50Pct: number;
  newHighs: number;
  newLows: number;
}

export interface VolumeAnalysis {
  totalVolume: number;
  avgVolume: number;
  volumeRatio: number;
  volumeLevel: 'shrink' | 'normal' | 'expand' | 'surge';
}

export interface SentimentResult {
  gauge: SentimentGauge;
  vix: VixData | null;
  breadth: MarketBreadth;
  volume: VolumeAnalysis;
  indices: { symbol: string; name: string; price: number; change: number; changePercent: number }[];
  putCallRatio: number | null;
  timestamp: string;
}

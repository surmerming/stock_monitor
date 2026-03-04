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
  week_52_high: number | null;
  week_52_low: number | null;
  timestamp: string;
  fetchError?: string | null;
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

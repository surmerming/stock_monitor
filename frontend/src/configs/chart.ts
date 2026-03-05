export const CHART_COLORS = {
  up: '#e8364e',
  down: '#00a86b',
  bg: '#ffffff',
  text: '#1a1a2e',
  textDim: '#8892a4',
  grid: '#f0f2f5',
  crosshair: '#9b9da3',
  line: '#5b8def',
};

export interface MAConfig {
  period: number;
  color: string;
  label: string;
}

export const MA_PERIODS: MAConfig[] = [
  { period: 5, color: '#f5a623', label: 'MA5' },
  { period: 10, color: '#5b8def', label: 'MA10' },
  { period: 20, color: '#e8364e', label: 'MA20' },
  { period: 60, color: '#00a86b', label: 'MA60' },
];

export const CHART_RANGES = [
  { key: '1d', label: '分时', interval: '1m' },
  { key: '5d', label: '5日', interval: '5m' },
  { key: 'daily', label: '日K', interval: '1d' },
  { key: 'weekly', label: '周K', interval: '1wk' },
  { key: 'monthly', label: '月K', interval: '1mo' },
  { key: 'quarterly', label: '季K', interval: '3mo' },
  { key: 'yearly', label: '年K', interval: '1y' },
];

export const REC_LABELS: Record<string, string> = {
  buy: '买入',
  strongBuy: '强烈买入',
  hold: '持有',
  sell: '卖出',
  strongSell: '强烈卖出',
  underperform: '跑输',
  outperform: '跑赢',
};

export type FinSheetTab = 'income' | 'balance' | 'cashflow';

export const SHEET_TABS: { key: FinSheetTab; label: string }[] = [
  { key: 'income', label: '利润表' },
  { key: 'balance', label: '资产负债表' },
  { key: 'cashflow', label: '现金流量表' },
];

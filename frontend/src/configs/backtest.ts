export interface BacktestScreenerFilter {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: number;
  value2?: number;
}

export const BACKTEST_PRESET_STRATEGIES = [
  {
    name: 'MACD金叉买入',
    filters: [
      { field: 'macdGoldenCross', operator: 'gte' as const, value: 1 },
      { field: 'volMa5Ratio', operator: 'gte' as const, value: 1.2 },
    ],
  },
  {
    name: 'KDJ超卖反弹',
    filters: [
      { field: 'kdjJ', operator: 'lte' as const, value: 0 },
      { field: 'kdjK', operator: 'lte' as const, value: 20 },
    ],
  },
  {
    name: '布林带下轨买入',
    filters: [
      { field: 'bollPosition', operator: 'lte' as const, value: 10 },
      { field: 'changePercent', operator: 'gte' as const, value: 0 },
    ],
  },
  {
    name: '均线多头排列',
    filters: [
      { field: 'ma5Bias', operator: 'gte' as const, value: 0 },
      { field: 'ma10Bias', operator: 'gte' as const, value: 0 },
      { field: 'ma20Bias', operator: 'gte' as const, value: 0 },
    ],
  },
  {
    name: '放量突破',
    filters: [
      { field: 'changePercent', operator: 'gte' as const, value: 2 },
      { field: 'volMa5Ratio', operator: 'gte' as const, value: 2 },
    ],
  },
];

export const BACKTEST_INDICATOR_OPTIONS = [
  { key: 'macdGoldenCross', label: 'MACD金叉' },
  { key: 'macdDeathCross', label: 'MACD死叉' },
  { key: 'kdjGoldenCross', label: 'KDJ金叉' },
  { key: 'kdjK', label: 'KDJ-K值' },
  { key: 'kdjJ', label: 'KDJ-J值' },
  { key: 'bollPosition', label: '布林位置' },
  { key: 'ma5Bias', label: 'MA5偏离%' },
  { key: 'ma10Bias', label: 'MA10偏离%' },
  { key: 'ma20Bias', label: 'MA20偏离%' },
  { key: 'ma60Bias', label: 'MA60偏离%' },
  { key: 'volMa5Ratio', label: '量比(vs MA5)' },
  { key: 'changePercent', label: '涨跌幅%' },
  { key: 'sarBull', label: 'SAR方向' },
  { key: 'macdHist', label: 'MACD柱' },
];

export const BACKTEST_OPERATORS: { key: BacktestScreenerFilter['operator']; label: string }[] = [
  { key: 'gte', label: '≥' },
  { key: 'gt', label: '>' },
  { key: 'lte', label: '≤' },
  { key: 'lt', label: '<' },
  { key: 'between', label: '介于' },
];

export const EXIT_LABELS: Record<string, string> = {
  signal: '信号消失',
  stop_loss: '止损',
  take_profit: '止盈',
  max_hold: '持仓到期',
  end: '回测结束',
};

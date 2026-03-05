export type MoneyFlowSortKey = 'netFlow' | 'largeNetFlow' | 'volumeRatio' | 'turnover';
export type MoneyFlowMarketFilter = 'all' | 'us' | 'cn' | 'hk';

export const MONEYFLOW_MARKET_TABS: { key: MoneyFlowMarketFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'us', label: '美股' },
  { key: 'cn', label: 'A股' },
  { key: 'hk', label: '港股' },
];

export const MONEYFLOW_SORT_OPTIONS: { key: MoneyFlowSortKey; label: string }[] = [
  { key: 'netFlow', label: '净流入' },
  { key: 'largeNetFlow', label: '大额净流入' },
  { key: 'volumeRatio', label: '量比' },
  { key: 'turnover', label: '成交额' },
];

export const MONEYFLOW_REFRESH_INTERVAL = 3 * 60 * 1000;

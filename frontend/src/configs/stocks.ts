import type { QuoteData } from '../types';

export const STOCKS_VIEW_KEY = 'stock-monitor-view';

export const STOCKS_MARKET_TABS = [
  { key: 'all', label: '全部' },
  { key: 'A股', label: 'A股' },
  { key: '港股', label: '港股' },
  { key: '美股', label: '美股' },
];

export type StockSortKey = 'change_percent' | 'market_cap' | 'pe_ratio';

export const SORTABLE_COLS: Record<
  StockSortKey,
  { label: string; getter: (d: QuoteData | null) => number }
> = {
  change_percent: {
    label: '涨跌幅',
    getter: (d) => d?.change_percent ?? -Infinity,
  },
  market_cap: {
    label: '总市值',
    getter: (d) => d?.market_cap ?? -Infinity,
  },
  pe_ratio: {
    label: '市盈率',
    getter: (d) => (d?.pe_ratio != null ? d.pe_ratio : Infinity),
  },
};

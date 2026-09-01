export interface ScannerTabDef {
  key: string;
  label: string;
  endpoint: string;
  markets?: string[]; // 该榜单支持的市场，缺省为全部
}

export const SCANNER_MARKETS: { key: string; label: string }[] = [
  { key: 'a_share', label: 'A股' },
  { key: 'hk', label: '港股' },
  { key: 'us', label: '美股' },
];

export const SCANNER_TABS: ScannerTabDef[] = [
  { key: 'gainers', label: '涨幅榜', endpoint: '/api/scanner/gainers' },
  { key: 'losers', label: '跌幅榜', endpoint: '/api/scanner/losers' },
  { key: 'active', label: '活跃榜', endpoint: '/api/scanner/active' },
  { key: 'trending', label: '热搜榜', endpoint: '/api/scanner/trending' },
  { key: 'limitup', label: '涨停板', endpoint: '/api/scanner/limit-up', markets: ['a_share'] },
];

export const SCANNER_REFRESH_INTERVAL = 2 * 60 * 1000;

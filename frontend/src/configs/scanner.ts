export interface ScannerTabDef {
  key: string;
  label: string;
  endpoint: string;
}

export const SCANNER_TABS: ScannerTabDef[] = [
  { key: 'gainers', label: '涨幅榜', endpoint: '/api/scanner/gainers' },
  { key: 'losers', label: '跌幅榜', endpoint: '/api/scanner/losers' },
  { key: 'active', label: '活跃榜', endpoint: '/api/scanner/active' },
  { key: 'trending', label: '热搜榜', endpoint: '/api/scanner/trending' },
];

export const SCANNER_REFRESH_INTERVAL = 2 * 60 * 1000;

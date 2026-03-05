export interface NavItem {
  to: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '总览' },
  { to: '/market', label: '大盘' },
  { to: '/stocks', label: '个股' },
  { to: '/industry', label: '行业' },
  { to: '/scanner', label: '雷达' },
  { to: '/moneyflow', label: '资金' },
  { to: '/strategy', label: '选股' },
  { to: '/backtest', label: '回测' },
  { to: '/sector', label: '板块' },
  { to: '/pattern', label: '形态' },
  { to: '/sentiment', label: '情绪' },
  { to: '/review', label: '复盘' },
  { to: '/settings', label: '设置' },
];

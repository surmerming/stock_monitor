import { NavLink } from 'react-router-dom';
import AlertBell from './AlertBell';
import './AppHeader.less';

const NAV_ITEMS = [
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
  { to: '/settings', label: '设置' },
];

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand">
          <span className="app-header__logo">📊</span>
          <span className="app-header__title">Stock Monitor</span>
        </div>
        <nav className="app-header__nav">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `app-header__link${isActive ? ' app-header__link--active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="app-header__actions">
          <AlertBell />
        </div>
      </div>
    </header>
  );
}

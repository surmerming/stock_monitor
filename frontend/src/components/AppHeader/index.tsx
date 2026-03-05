import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AlertBell from '../AlertBell';
import { NAV_ITEMS } from '../../configs/navigation';
import './style.less';

export default function AppHeader() {
  const { user, logout } = useAuth();

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
          {user && (
            <div className="app-header__user">
              <span className="app-header__user-name">{user.displayName || user.username}</span>
              <button className="app-header__logout" onClick={logout}>
                退出
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

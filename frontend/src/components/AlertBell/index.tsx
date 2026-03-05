import { useEffect, useRef, useState } from 'react';
import { useQuoteSSE } from '../../hooks/useQuoteSSE';
import './style.less';

export default function AlertBell() {
  const { alerts, unreadAlertCount, markAlertsRead } = useQuoteSSE();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadAlertCount > 0) {
      markAlertsRead();
    }
  };

  return (
    <div className="alert-bell" ref={ref}>
      <button className="alert-bell__btn" onClick={handleToggle}>
        <svg
          className="alert-bell__icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadAlertCount > 0 && (
          <span className="alert-bell__badge">
            {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
          </span>
        )}
      </button>

      {open && (
        <div className="alert-bell__panel">
          <div className="alert-bell__panel-header">
            <span>预警通知</span>
            {alerts.length > 0 && (
              <button className="alert-bell__clear" onClick={markAlertsRead}>
                全部已读
              </button>
            )}
          </div>
          <div className="alert-bell__panel-body">
            {alerts.length === 0 ? (
              <div className="alert-bell__empty">暂无预警通知</div>
            ) : (
              alerts.slice(0, 30).map((a, i) => (
                <div
                  key={a.id || i}
                  className={`alert-bell__item${a._read === false ? ' alert-bell__item--unread' : ''}`}
                >
                  {a._read === false && <span className="alert-bell__item-dot" />}
                  <div className="alert-bell__item-msg">{a.message}</div>
                  <div className="alert-bell__item-meta">
                    <span className="alert-bell__item-symbol">{a.symbol}</span>
                    <span className="alert-bell__item-time">
                      {a.triggeredAt ? new Date(a.triggeredAt).toLocaleTimeString('zh-CN') : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

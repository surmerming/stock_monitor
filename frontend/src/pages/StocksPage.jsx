import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import StockCard from '../components/StockCard';
import StockTable from '../components/StockTable';
import { useStockPolling } from '../hooks/useStockPolling';
import { useWatchlist } from '../hooks/useWatchlist';
import { groupByMarket } from '../utils/format';
import './StocksPage.less';

const POLL_INTERVAL = 3 * 60;
const VIEW_KEY = 'stock-monitor-view';

const MARKET_TABS = [
  { key: 'all', label: '全部' },
  { key: 'A股', label: 'A股' },
  { key: '港股', label: '港股' },
  { key: '美股', label: '美股' },
];

export default function StocksPage() {
  const { symbols, loaded, removeSymbol: removeFromDB } = useWatchlist();
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_KEY) || 'card');
  const [activeMarket, setActiveMarket] = useState('all');
  const countdownRef = useRef(null);

  const { quotes, loading, error, refresh, removeSymbol: removeQuote } = useStockPolling(symbols);

  const startCountdown = useCallback(() => {
    clearInterval(countdownRef.current);

    let remaining = POLL_INTERVAL;
    const tick = () => {
      setCountdown(remaining);
      remaining = remaining <= 1 ? POLL_INTERVAL : remaining - 1;
    };

    const immediate = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    countdownRef.current = id;

    return () => {
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (symbols.length === 0) return;
    return startCountdown();
  }, [symbols, startCountdown]);

  const handleRemove = useCallback(
    (sym) => {
      removeFromDB(sym);
      removeQuote(sym);
    },
    [removeFromDB, removeQuote],
  );

  const handleRefresh = useCallback(() => {
    refresh();
    startCountdown();
  }, [refresh, startCountdown]);

  const toggleView = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_KEY, mode);
  }, []);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const marketGroups = useMemo(() => groupByMarket(symbols, quotes), [symbols, quotes]);

  const availableMarkets = useMemo(
    () => new Set(marketGroups.map(([market]) => market)),
    [marketGroups],
  );

  const filteredGroups = useMemo(
    () =>
      activeMarket === 'all'
        ? marketGroups
        : marketGroups.filter(([market]) => market === activeMarket),
    [marketGroups, activeMarket],
  );

  const marketCounts = useMemo(() => {
    const counts = { all: 0 };
    for (const [market, items] of marketGroups) {
      counts[market] = items.length;
      counts.all += items.length;
    }
    return counts;
  }, [marketGroups]);

  if (!loaded) {
    return (
      <div className="stocks-page">
        <div className="stocks-page__empty">
          <div className="stocks-page__empty-text">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="stocks-page">
      {error && <div className="stocks-page__error">请求失败: {error}</div>}

      {symbols.length === 0 ? (
        <div className="stocks-page__empty">
          <div className="stocks-page__empty-icon">📈</div>
          <p className="stocks-page__empty-text">
            还没有监控任何股票
            <br />
            前往{' '}
            <Link to="/settings" className="stocks-page__link">
              设置
            </Link>{' '}
            添加股票代码开始监控
          </p>
        </div>
      ) : (
        <>
          <div className="stocks-page__toolbar">
            <div className="stocks-page__market-tabs">
              {MARKET_TABS.filter((tab) => tab.key === 'all' || availableMarkets.has(tab.key)).map(
                ({ key, label }) => (
                  <button
                    key={key}
                    className={`stocks-page__market-tab ${activeMarket === key ? 'stocks-page__market-tab--active' : ''}`}
                    onClick={() => setActiveMarket(key)}
                  >
                    {label}
                    {marketCounts[key] != null && (
                      <span className="stocks-page__market-tab-count">{marketCounts[key]}</span>
                    )}
                  </button>
                ),
              )}
            </div>
            <div className="stocks-page__status">
              <div className="stocks-page__view-toggle">
                <button
                  className={`stocks-page__view-btn ${viewMode === 'card' ? 'stocks-page__view-btn--active' : ''}`}
                  onClick={() => toggleView('card')}
                  title="卡片视图"
                >
                  ▦
                </button>
                <button
                  className={`stocks-page__view-btn ${viewMode === 'table' ? 'stocks-page__view-btn--active' : ''}`}
                  onClick={() => toggleView('table')}
                  title="列表视图"
                >
                  ☰
                </button>
              </div>
              <span>
                监控 <strong>{symbols.length}</strong> 只 · 下次刷新{' '}
                <span className="stocks-page__countdown">{formatCountdown(countdown)}</span>
              </span>
              <button
                className="stocks-page__refresh-btn"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? '刷新中...' : '立即刷新'}
              </button>
            </div>
          </div>

          <div className="stocks-page__content">
            {filteredGroups.map(([, items]) =>
              viewMode === 'card' ? (
                <div className="stocks-page__grid" key={items[0]?.sym}>
                  {items.map(({ sym, data }) => (
                    <StockCard key={sym} symbol={sym} data={data} onRemove={handleRemove} />
                  ))}
                </div>
              ) : (
                <StockTable key={items[0]?.sym} items={items} onRemove={handleRemove} />
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

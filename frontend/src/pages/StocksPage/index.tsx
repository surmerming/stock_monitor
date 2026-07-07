import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StockCard from '../../components/StockCard';
import StockTable from '../../components/StockTable';
import { useQuoteSSE } from '../../hooks/useQuoteSSE';
import { useWatchlist } from '../../hooks/useWatchlist';
import { groupByMarket } from '../../utils/format';
import { STOCKS_VIEW_KEY, STOCKS_MARKET_TABS } from '../../configs/stocks';
import './style.less';

type ViewMode = 'card' | 'table';

export default function StocksPage() {
  const { symbols, loaded, removeSymbol: removeFromDB } = useWatchlist();
  const { quotes: allQuotes, connected, lastUpdate } = useQuoteSSE();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(STOCKS_VIEW_KEY) as ViewMode) || 'card',
  );
  const [activeMarket, setActiveMarket] = useState<string>('all');

  const quotes = useMemo(() => {
    const filtered: Record<string, (typeof allQuotes)[string]> = {};
    for (const sym of symbols) {
      if (allQuotes[sym]) filtered[sym] = allQuotes[sym];
    }
    return filtered;
  }, [symbols, allQuotes]);

  const handleRemove = useCallback(
    (sym: string) => {
      removeFromDB(sym);
    },
    [removeFromDB],
  );

  const toggleView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(STOCKS_VIEW_KEY, mode);
  }, []);

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
    const counts: Record<string, number> = { all: 0 };
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
              {STOCKS_MARKET_TABS.filter(
                (tab) => tab.key === 'all' || availableMarkets.has(tab.key),
              ).map(({ key, label }) => (
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
              ))}
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
                监控 <strong>{symbols.length}</strong> 只
              </span>
              <span
                className={`stocks-page__conn ${connected ? 'stocks-page__conn--on' : 'stocks-page__conn--off'}`}
              >
                {connected ? '● 实时' : '○ 断开'}
              </span>
              {lastUpdate && (
                <span className="stocks-page__update">
                  {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
                </span>
              )}
            </div>
          </div>

          <div className="stocks-page__content">
            {filteredGroups.map(([, items]) =>
              viewMode === 'card' ? (
                <div className="stocks-page__grid" key={items[0]?.sym}>
                  {items.map(({ sym, data }) => (
                    <StockCard
                      key={sym}
                      symbol={sym}
                      data={data}
                      onRemove={handleRemove}
                      onClick={() => navigate(`/stock/${encodeURIComponent(sym)}`)}
                    />
                  ))}
                </div>
              ) : (
                <StockTable
                  key={items[0]?.sym}
                  items={items}
                  onSymbolClick={(sym) => navigate(`/stock/${encodeURIComponent(sym)}`)}
                />
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

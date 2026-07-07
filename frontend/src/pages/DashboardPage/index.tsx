import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuoteSSE } from '../../hooks/useQuoteSSE';
import { useWatchlist } from '../../hooks/useWatchlist';
import type { QuoteMap } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import { DASHBOARD_INDICES, HEATMAP_SECTORS } from '../../configs/dashboard';
import './style.less';

interface ScannerItem {
  symbol: string;
  name: string;
  change: number;
  changePercent: number;
}

interface ScanDataState {
  gainers: ScannerItem[];
  losers: ScannerItem[];
  active: ScannerItem[];
}

function getHeatColor(pct: number | null | undefined): string {
  if (pct == null) return '#e0e0e0';
  const clamped = Math.max(-5, Math.min(5, pct));
  if (clamped >= 0) {
    const intensity = clamped / 5;
    const r = Math.round(232 + (232 - 232) * intensity);
    const g = Math.round(232 - 180 * intensity);
    const b = Math.round(232 - 180 * intensity);
    return `rgb(${r},${g},${b})`;
  }
  const intensity = Math.abs(clamped) / 5;
  const r = Math.round(232 - 180 * intensity);
  const g = Math.round(232 - 60 * intensity);
  const b = Math.round(232 - 180 * intensity);
  return `rgb(${r},${g},${b})`;
}

interface ScanBoardProps {
  title: string;
  items: ScannerItem[];
}

export default function DashboardPage() {
  const { quotes, marketStatus, connected, lastUpdate, alerts, unreadAlertCount } = useQuoteSSE();
  const { symbols: watchlistSymbols } = useWatchlist();
  const navigate = useNavigate();
  const [scanData, setScanData] = useState<ScanDataState>({
    gainers: [],
    losers: [],
    active: [],
  });

  useEffect(() => {
    async function fetchScanData() {
      try {
        const [g, l, a] = await Promise.all([
          apiFetch('/api/scanner/gainers?count=5').then((r) => r.json()),
          apiFetch('/api/scanner/losers?count=5').then((r) => r.json()),
          apiFetch('/api/scanner/active?count=5').then((r) => r.json()),
        ]);
        setScanData({
          gainers: Array.isArray(g) ? g : [],
          losers: Array.isArray(l) ? l : [],
          active: Array.isArray(a) ? a : [],
        });
      } catch {
        // keep stale
      }
    }
    fetchScanData();
    const timer = setInterval(fetchScanData, 2 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const tradingMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const s of marketStatus)
      map[s.market] = (s as { market: string; isTrading?: boolean }).isTrading ?? false;
    return map;
  }, [marketStatus]);

  const watchlistItems = useMemo(() => {
    return watchlistSymbols
      .map((sym) => ({ sym, data: quotes[sym] }))
      .filter((x): x is { sym: string; data: NonNullable<QuoteMap[string]> } => !!x.data)
      .sort((a, b) => Math.abs(b.data.change_percent) - Math.abs(a.data.change_percent));
  }, [watchlistSymbols, quotes]);

  return (
    <div className="dashboard">
      {alerts.length > 0 && (
        <div className="dashboard__alerts">
          <span className="dashboard__alerts-icon">🔔</span>
          <div className="dashboard__alerts-list">
            {alerts.slice(0, 3).map((a, i) => (
              <span key={a.id || i} className="dashboard__alert-item">
                {a.message}
              </span>
            ))}
          </div>
          {unreadAlertCount > 3 && (
            <span className="dashboard__alerts-more">+{unreadAlertCount - 3} 条</span>
          )}
        </div>
      )}

      <div className="dashboard__section">
        <div className="dashboard__section-header">
          <h3 className="dashboard__section-title">大盘指数</h3>
          <span className={`dashboard__conn ${connected ? 'dashboard__conn--on' : ''}`}>
            {connected ? '● 实时' : '○ 断开'}
          </span>
        </div>
        <div className="dashboard__indices-grid">
          {DASHBOARD_INDICES.map((idx) => {
            const d = quotes[idx.symbol];
            if (!d) {
              return (
                <div key={idx.symbol} className="mini-index mini-index--loading">
                  <span className="mini-index__name">{idx.name}</span>
                </div>
              );
            }
            const isUp = d.change >= 0;
            const trend = isUp ? 'up' : 'down';
            const sign = isUp ? '+' : '';
            return (
              <div key={idx.symbol} className={`mini-index mini-index--${trend}`}>
                <div className="mini-index__top">
                  <span className="mini-index__name">{idx.name}</span>
                  <span
                    className={`mini-index__badge ${tradingMap[idx.market] ? 'mini-index__badge--on' : ''}`}
                  >
                    {tradingMap[idx.market] ? '盘中' : '休'}
                  </span>
                </div>
                <div className="mini-index__price">{d.current_price.toFixed(2)}</div>
                <div className={`mini-index__change mini-index__change--${trend}`}>
                  {sign}
                  {d.change_percent.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {watchlistItems.length > 0 && (
        <div className="dashboard__section">
          <div className="dashboard__section-header">
            <h3 className="dashboard__section-title">自选监控</h3>
            <button className="dashboard__more-btn" onClick={() => navigate('/stocks')}>
              查看全部 →
            </button>
          </div>
          <div className="dashboard__watchlist-grid">
            {watchlistItems.slice(0, 12).map(({ sym, data: d }) => {
              const isUp = d.change >= 0;
              const trend = isUp ? 'up' : 'down';
              const sign = isUp ? '+' : '';
              return (
                <div
                  key={sym}
                  className={`watch-chip watch-chip--${trend}`}
                  onClick={() => navigate(`/stock/${encodeURIComponent(sym)}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="watch-chip__name">{d.name || sym}</span>
                  <span className={`watch-chip__pct watch-chip__pct--${trend}`}>
                    {sign}
                    {d.change_percent.toFixed(2)}%
                  </span>
                  <span className="watch-chip__price">{d.current_price.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="dashboard__section">
        <div className="dashboard__section-header">
          <h3 className="dashboard__section-title">行业热力图</h3>
        </div>
        <div className="dashboard__heatmap-grid">
          {HEATMAP_SECTORS.map((s) => {
            const d = quotes[s.symbol];
            const pct = d?.change_percent ?? null;
            const bg = getHeatColor(pct);
            const isUp = pct != null && pct >= 0;
            return (
              <div
                key={s.symbol}
                className="heat-cell"
                style={{ background: bg }}
                title={`${s.name} ${pct != null ? (isUp ? '+' : '') + pct.toFixed(2) + '%' : ''}`}
              >
                <span className="heat-cell__name">{s.name}</span>
                <span
                  className={`heat-cell__pct ${pct != null ? (isUp ? 'heat-cell__pct--up' : 'heat-cell__pct--down') : ''}`}
                >
                  {pct != null ? `${isUp ? '+' : ''}${pct.toFixed(2)}%` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dashboard__row dashboard__row--boards">
        <ScanBoard title="涨幅榜" items={scanData.gainers} />
        <ScanBoard title="跌幅榜" items={scanData.losers} />
        <ScanBoard title="活跃榜" items={scanData.active} />
      </div>

      {lastUpdate && (
        <div className="dashboard__footer">
          更新于 {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
        </div>
      )}
    </div>
  );
}

function ScanBoard({ title, items }: ScanBoardProps) {
  const navigate = useNavigate();
  return (
    <div className="scan-board">
      <div className="scan-board__header">
        <h4 className="scan-board__title">{title}</h4>
        <button className="scan-board__more" onClick={() => navigate('/scanner')}>
          更多
        </button>
      </div>
      {items.length === 0 ? (
        <div className="scan-board__empty">加载中...</div>
      ) : (
        <div className="scan-board__list">
          {items.slice(0, 5).map((item, i) => {
            const isUp = item.change >= 0;
            const trend = isUp ? 'up' : 'down';
            const sign = isUp ? '+' : '';
            return (
              <div
                key={item.symbol}
                className="scan-board__item"
                onClick={() => navigate(`/stock/${encodeURIComponent(item.symbol)}`)}
                style={{ cursor: 'pointer' }}
              >
                <span className="scan-board__rank">{i + 1}</span>
                <div className="scan-board__info">
                  <span className="scan-board__name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="scan-board__symbol">{item.symbol}</span>
                </div>
                <span className={`scan-board__pct scan-board__pct--${trend}`}>
                  {sign}
                  {item.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

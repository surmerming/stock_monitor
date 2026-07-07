import { useState, useEffect, useCallback } from 'react';
import type {
  WatchlistReviewItem,
  StockReviewDetail,
  SentimentResult,
  SectorRotationItem,
} from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import MarketOverview from './MarketOverview';
import SectorRanking from './SectorRanking';
import ReviewTable from './ReviewTable';
import StockReviewPanel from './StockReviewPanel';
import TradeJournal from './TradeJournal';
import ReviewNotes from './ReviewNotes';
import StockComparison from './StockComparison';
import ReviewCalendar from './ReviewCalendar';
import './style.less';

type TabKey = 'overview' | 'stocks' | 'compare' | 'journal' | 'notes' | 'calendar';

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [reviewItems, setReviewItems] = useState<WatchlistReviewItem[]>([]);
  const [marketData, setMarketData] = useState<{
    sentiment: SentimentResult | null;
    sectorRanking: { gainers: SectorRotationItem[]; losers: SectorRotationItem[] };
  } | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [stockDetail, setStockDetail] = useState<StockReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReviewData = useCallback(async () => {
    try {
      setLoading(true);
      const [marketRes, watchlistRes] = await Promise.all([
        apiFetch('/api/review/market-overview'),
        apiFetch('/api/review/watchlist-summary'),
      ]);

      if (marketRes.ok) {
        setMarketData(await marketRes.json());
      }
      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        setReviewItems(data.items || []);
      }
      setError('');
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewData();
  }, [fetchReviewData]);

  const handleSelectStock = useCallback(async (symbol: string) => {
    setSelectedSymbol(symbol);
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/review/stock/${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.error) setStockDetail(data);
        else setStockDetail(null);
      }
    } catch {
      setStockDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSymbol(null);
    setStockDetail(null);
  }, []);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: '复盘总览' },
    { key: 'stocks', label: '个股复盘' },
    { key: 'compare', label: '对比分析' },
    { key: 'journal', label: '交易日志' },
    { key: 'notes', label: '复盘笔记' },
    { key: 'calendar', label: '复盘日历' },
  ];

  return (
    <div className="rv-page">
      <div className="rv-page__header">
        <h2 className="rv-page__title">每日复盘工作台</h2>
        <div className="rv-page__actions">
          <span className="rv-page__date">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </span>
          <button className="rv-page__refresh" onClick={fetchReviewData} disabled={loading}>
            {loading ? '加载中...' : '刷新数据'}
          </button>
        </div>
      </div>

      <div className="rv-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`rv-tabs__item ${activeTab === tab.key ? 'rv-tabs__item--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="rv-error">{error}</div>}

      <div className="rv-content">
        {activeTab === 'overview' && (
          <div className="rv-overview">
            <MarketOverview data={marketData} loading={loading} />
            <SectorRanking data={marketData?.sectorRanking ?? null} loading={loading} />
            <div className="rv-overview__watchlist">
              <h3 className="rv-section-title">自选股快览</h3>
              <ReviewTable
                items={reviewItems}
                loading={loading}
                onSelect={handleSelectStock}
                compact
              />
            </div>
          </div>
        )}

        {activeTab === 'stocks' && (
          <div className="rv-stocks">
            <ReviewTable items={reviewItems} loading={loading} onSelect={handleSelectStock} />
            {selectedSymbol && (
              <StockReviewPanel
                symbol={selectedSymbol}
                detail={stockDetail}
                loading={detailLoading}
                onClose={handleCloseDetail}
              />
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <StockComparison watchlistSymbols={reviewItems.map((i) => i.symbol)} />
        )}

        {activeTab === 'journal' && <TradeJournal />}
        {activeTab === 'notes' && <ReviewNotes />}
        {activeTab === 'calendar' && <ReviewCalendar />}
      </div>
    </div>
  );
}

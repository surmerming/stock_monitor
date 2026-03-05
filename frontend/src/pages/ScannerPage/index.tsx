import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlist } from '../../hooks/useWatchlist';
import { formatVolume, formatMarketCap } from '../../utils/format';
import { apiFetch } from '../../utils/apiFetch';
import { SCANNER_TABS, SCANNER_REFRESH_INTERVAL } from '../../configs/scanner';
import './style.less';

interface ScannerItem {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
}

interface TrendingGroup {
  region: string;
  regionName?: string;
  items?: ScannerItem[];
}

type ScannerTabKey = 'gainers' | 'losers' | 'active' | 'trending';

interface ScreenerTableProps {
  data: ScannerItem[] | null;
  loading: boolean;
  tab: ScannerTabKey;
  onAdd: (symbol: string) => void;
}

interface TrendingViewProps {
  data: TrendingGroup[] | null;
  loading: boolean;
  onAdd: (symbol: string) => void;
}

export default function ScannerPage() {
  const [activeTab, setActiveTab] = useState<ScannerTabKey>('gainers');
  const [data, setData] = useState<ScannerItem[] | TrendingGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { addSymbols } = useWatchlist();

  const fetchData = useCallback(async () => {
    const tab = SCANNER_TABS.find((t) => t.key === activeTab);
    if (!tab) return;
    setLoading(true);
    try {
      const res = await apiFetch(tab.endpoint);
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setData(null);
    fetchData();
    const timer = setInterval(fetchData, SCANNER_REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleAddToWatchlist = async (symbol: string) => {
    try {
      await addSymbols([symbol]);
    } catch {
      // ignore
    }
  };

  return (
    <div className="scanner-page">
      <div className="scanner-page__header">
        <h2 className="scanner-page__title">异动雷达</h2>
        <div className="scanner-page__meta">
          {lastUpdate && (
            <span className="scanner-page__update">
              更新于 {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
          )}
          <button className="scanner-page__refresh" onClick={fetchData} disabled={loading}>
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="scanner-page__tabs">
        {SCANNER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`scanner-page__tab ${activeTab === tab.key ? 'scanner-page__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key as ScannerTabKey)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="scanner-page__body">
        {activeTab === 'trending' ? (
          <TrendingView
            data={data as TrendingGroup[] | null}
            loading={loading}
            onAdd={handleAddToWatchlist}
          />
        ) : (
          <ScreenerTable
            data={data as ScannerItem[] | null}
            loading={loading}
            tab={activeTab}
            onAdd={handleAddToWatchlist}
          />
        )}
      </div>
    </div>
  );
}

function ScreenerTable({ data, loading, tab, onAdd }: ScreenerTableProps) {
  const navigate = useNavigate();
  if (loading && !data) {
    return <div className="scanner-page__loading">加载中...</div>;
  }
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="scanner-page__empty">暂无数据</div>;
  }

  return (
    <div className="scanner-table">
      <div className="scanner-table__head">
        <span className="scanner-table__col scanner-table__col--rank">#</span>
        <span className="scanner-table__col scanner-table__col--symbol">代码</span>
        <span className="scanner-table__col scanner-table__col--name">名称</span>
        <span className="scanner-table__col scanner-table__col--price">价格</span>
        <span className="scanner-table__col scanner-table__col--change">涨跌幅</span>
        <span className="scanner-table__col scanner-table__col--volume">
          {tab === 'active' ? '成交量' : '成交量'}
        </span>
        <span className="scanner-table__col scanner-table__col--cap">市值</span>
        <span className="scanner-table__col scanner-table__col--action" />
      </div>
      {data.map((item, i) => {
        const price = item.price ?? 0;
        const change = item.change ?? 0;
        const changePct = item.changePercent ?? 0;
        const isUp = change >= 0;
        const trend = isUp ? 'up' : 'down';
        const sign = isUp ? '+' : '';
        return (
          <div
            key={item.symbol}
            className={`scanner-table__row scanner-table__row--${trend}`}
            onClick={() => navigate(`/stock/${encodeURIComponent(item.symbol)}`)}
            style={{ cursor: 'pointer' }}
          >
            <span className="scanner-table__col scanner-table__col--rank">{i + 1}</span>
            <span className="scanner-table__col scanner-table__col--symbol">{item.symbol}</span>
            <span className="scanner-table__col scanner-table__col--name" title={item.name}>
              {item.name}
            </span>
            <span className="scanner-table__col scanner-table__col--price">{price.toFixed(2)}</span>
            <span
              className={`scanner-table__col scanner-table__col--change scanner-table__${trend}`}
            >
              {sign}
              {changePct.toFixed(2)}%
            </span>
            <span className="scanner-table__col scanner-table__col--volume">
              {formatVolume(item.volume)}
            </span>
            <span className="scanner-table__col scanner-table__col--cap">
              {formatMarketCap(item.marketCap)}
            </span>
            <span className="scanner-table__col scanner-table__col--action">
              <button
                className="scanner-table__add-btn"
                onClick={() => onAdd(item.symbol)}
                title="加入自选"
              >
                +
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrendingView({ data, loading, onAdd }: TrendingViewProps) {
  const navigate = useNavigate();
  if (loading && !data) {
    return <div className="scanner-page__loading">加载中...</div>;
  }
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="scanner-page__empty">暂无热搜数据</div>;
  }

  return (
    <div className="trending-view">
      {data.map((group) => (
        <div key={group.region} className="trending-view__group">
          <h3 className="trending-view__region">{group.regionName || group.region}</h3>
          {!group.items || group.items.length === 0 ? (
            <p className="trending-view__empty">暂无数据</p>
          ) : (
            <div className="scanner-table">
              <div className="scanner-table__head">
                <span className="scanner-table__col scanner-table__col--rank">#</span>
                <span className="scanner-table__col scanner-table__col--symbol">代码</span>
                <span className="scanner-table__col scanner-table__col--name">名称</span>
                <span className="scanner-table__col scanner-table__col--price">价格</span>
                <span className="scanner-table__col scanner-table__col--change">涨跌幅</span>
                <span className="scanner-table__col scanner-table__col--volume">成交量</span>
                <span className="scanner-table__col scanner-table__col--action" />
              </div>
              {group.items.map((item, i) => {
                const price = item.price ?? 0;
                const change = item.change ?? 0;
                const changePct = item.changePercent ?? 0;
                const isUp = change >= 0;
                const trend = isUp ? 'up' : 'down';
                const sign = isUp ? '+' : '';
                return (
                  <div
                    key={item.symbol}
                    className={`scanner-table__row scanner-table__row--${trend}`}
                    onClick={() => navigate(`/stock/${encodeURIComponent(item.symbol)}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="scanner-table__col scanner-table__col--rank">{i + 1}</span>
                    <span className="scanner-table__col scanner-table__col--symbol">
                      {item.symbol}
                    </span>
                    <span className="scanner-table__col scanner-table__col--name" title={item.name}>
                      {item.name}
                    </span>
                    <span className="scanner-table__col scanner-table__col--price">
                      {price.toFixed(2)}
                    </span>
                    <span
                      className={`scanner-table__col scanner-table__col--change scanner-table__${trend}`}
                    >
                      {sign}
                      {changePct.toFixed(2)}%
                    </span>
                    <span className="scanner-table__col scanner-table__col--volume">
                      {formatVolume(item.volume)}
                    </span>
                    <span className="scanner-table__col scanner-table__col--action">
                      <button
                        className="scanner-table__add-btn"
                        onClick={() => onAdd(item.symbol)}
                        title="加入自选"
                      >
                        +
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

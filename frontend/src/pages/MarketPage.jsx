import { useCallback, useEffect, useRef, useState } from 'react';
import { formatVolume, formatTurnover } from '../utils/format';
import './MarketPage.less';

const INDICES = [
  { symbol: '^GSPC', name: '标普500', market: '美股' },
  { symbol: '^DJI', name: '道琼斯', market: '美股' },
  { symbol: '^IXIC', name: '纳斯达克', market: '美股' },
  { symbol: '000001.SS', name: '上证指数', market: 'A股' },
  { symbol: '399001.SZ', name: '深证成指', market: 'A股' },
  { symbol: '399006.SZ', name: '创业板指', market: 'A股' },
  { symbol: '^HSI', name: '恒生指数', market: '港股' },
  { symbol: '^HSCE', name: '国企指数', market: '港股' },
  { symbol: '^HSCC', name: '红筹指数', market: '港股' },
];

const POLL_INTERVAL = 60 * 1000;

export default function MarketPage() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);

  const fetchIndices = useCallback(async () => {
    try {
      setLoading(true);
      const symbols = INDICES.map((i) => i.symbol).join(',');
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const updated = {};
      for (const item of json.quotes) {
        if (item.data) updated[item.symbol] = item.data;
      }
      setData(updated);
      setLastUpdate(new Date());
    } catch {
      // silently retry next cycle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndices();
    timerRef.current = setInterval(fetchIndices, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchIndices]);

  const grouped = [
    { label: 'A股', items: INDICES.filter((i) => i.market === 'A股') },
    { label: '港股', items: INDICES.filter((i) => i.market === '港股') },
    { label: '美股', items: INDICES.filter((i) => i.market === '美股') },
  ];

  return (
    <div className="market-page">
      <div className="market-page__header">
        <h2 className="market-page__title">大盘指数</h2>
        {lastUpdate && (
          <span className="market-page__update">
            更新于 {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
        )}
      </div>

      {grouped.map(({ label, items }) => (
        <div key={label} className="market-page__section">
          <h3 className="market-page__section-title">{label}</h3>
          <div className="market-page__grid">
            {items.map((idx) => {
              const d = data[idx.symbol];
              return (
                <IndexCard key={idx.symbol} name={idx.name} data={d} loading={loading && !d} />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function IndexCard({ name, data, loading }) {
  if (loading || !data) {
    return (
      <div className="index-card index-card--loading">
        <div className="index-card__name">{name}</div>
        <div className="index-card__skeleton" />
      </div>
    );
  }

  const isUp = data.change >= 0;
  const trend = isUp ? 'up' : 'down';
  const sign = isUp ? '+' : '';

  return (
    <div className={`index-card index-card--${trend}`}>
      <div className="index-card__top">
        <span className="index-card__name">{name}</span>
        <span className="index-card__symbol">{data.symbol}</span>
      </div>
      <div className="index-card__price">{data.current_price.toFixed(2)}</div>
      <div className={`index-card__change index-card__change--${trend}`}>
        <span>
          {sign}
          {data.change.toFixed(2)}
        </span>
        <span className="index-card__pct">
          {sign}
          {data.change_percent.toFixed(2)}%
        </span>
      </div>
      <div className="index-card__meta">
        <div className="index-card__meta-item">
          <span className="index-card__meta-label">成交量</span>
          <span>{formatVolume(data.volume)}</span>
        </div>
        <div className="index-card__meta-item">
          <span className="index-card__meta-label">成交额</span>
          <span>{formatTurnover(data.turnover)}</span>
        </div>
        <div className="index-card__meta-item">
          <span className="index-card__meta-label">今开</span>
          <span>{data.open_price.toFixed(2)}</span>
        </div>
        <div className="index-card__meta-item">
          <span className="index-card__meta-label">昨收</span>
          <span>{data.prev_close.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

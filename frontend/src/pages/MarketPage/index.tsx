import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuoteSSE } from '../../hooks/useQuoteSSE';
import { formatVolume, formatTurnover } from '../../utils/format';
import type { QuoteData, FlashDirection } from '../../types';
import { MARKET_CATEGORIES, MARKET_INDICES } from '../../configs/market';
import './style.less';

interface IndexCardProps {
  name: string;
  data: QuoteData | null | undefined;
  loading: boolean;
  symbol: string;
}

export default function MarketPage() {
  const { quotes, marketStatus, connected, lastUpdate } = useQuoteSSE();

  const tradingMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const s of marketStatus) {
      map[s.market] = (s as { market: string; isTrading?: boolean }).isTrading ?? false;
    }
    return map;
  }, [marketStatus]);

  const CATEGORY_TRADING: Record<string, string> = {
    A股指数: 'A股',
    港股指数: '港股',
    美股指数: '美股',
  };

  const grouped = MARKET_CATEGORIES.map((cat) => ({
    label: cat,
    items: MARKET_INDICES.filter((i) => i.category === cat),
    tradingKey: CATEGORY_TRADING[cat],
  }));

  const hasData = MARKET_INDICES.some((idx) => quotes[idx.symbol]);

  return (
    <div className="market-page">
      <div className="market-page__header">
        <h2 className="market-page__title">大盘指数</h2>
        <div className="market-page__status">
          {lastUpdate && (
            <span className="market-page__update">
              更新于 {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
          )}
          <span
            className={`market-page__conn ${connected ? 'market-page__conn--on' : 'market-page__conn--off'}`}
          >
            {connected ? '● 实时' : '○ 断开'}
          </span>
        </div>
      </div>

      {grouped.map(({ label, items, tradingKey }) => (
        <div key={label} className="market-page__section">
          <h3 className="market-page__section-title">
            {label}
            {tradingKey && tradingMap[tradingKey] != null && (
              <span
                className={`market-page__trading-badge ${tradingMap[tradingKey] ? 'market-page__trading-badge--on' : 'market-page__trading-badge--off'}`}
              >
                {tradingMap[tradingKey] ? '交易中' : '休市'}
              </span>
            )}
          </h3>
          <div className="market-page__grid">
            {items.map((idx) => {
              const d = quotes[idx.symbol];
              return (
                <IndexCard
                  key={idx.symbol}
                  name={idx.name}
                  data={d}
                  loading={!hasData && !d}
                  symbol={idx.symbol}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function IndexCard({ name, data, loading, symbol: rawSymbol }: IndexCardProps) {
  const navigate = useNavigate();
  const [flash, setFlash] = useState<FlashDirection>(null);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data?.current_price) return;
    if (prevPriceRef.current != null && prevPriceRef.current !== data.current_price) {
      const dir: FlashDirection = data.current_price > prevPriceRef.current ? 'up' : 'down';
      const t = setTimeout(() => {
        setFlash(dir);
        setTimeout(() => setFlash(null), 1500);
      }, 0);
      prevPriceRef.current = data.current_price;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = data.current_price;
  }, [data?.current_price]);

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
    <div
      className={`index-card index-card--${trend}${flash ? ` index-card--flash-${flash}` : ''}`}
      onClick={() => navigate(`/stock/${encodeURIComponent(rawSymbol || data.symbol)}`)}
      style={{ cursor: 'pointer' }}
    >
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

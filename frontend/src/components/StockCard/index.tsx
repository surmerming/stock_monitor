import { useEffect, useRef, useState } from 'react';
import {
  formatVolume,
  formatMarketCap,
  formatTurnover,
  formatPercent,
  formatRatio,
} from '../../utils/format';
import type { QuoteData } from '../../types';
import type { FlashDirection } from '../../types';
import './style.less';

interface StockCardProps {
  data: QuoteData | null;
  symbol: string;
  onRemove: (sym: string) => void;
  onClick?: () => void;
}

export default function StockCard({ data, symbol, onRemove, onClick }: StockCardProps) {
  const [flash, setFlash] = useState<FlashDirection>(null);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data?.current_price) return;
    if (prevPriceRef.current != null && prevPriceRef.current !== data.current_price) {
      const dir = data.current_price > prevPriceRef.current ? 'up' : 'down';
      setFlash(dir);
      const t = setTimeout(() => setFlash(null), 1500);
      prevPriceRef.current = data.current_price;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = data.current_price;
  }, [data?.current_price]);

  if (!data) {
    return (
      <div className="stock-card stock-card--skeleton">
        <div className="stock-card__header">
          <div className="stock-card__title">
            <span className="stock-card__sk stock-card__sk--name" />
            <span className="stock-card__sk stock-card__sk--symbol" />
          </div>
          <button className="stock-card__remove" onClick={() => onRemove(symbol)} title="移除">
            ×
          </button>
        </div>
        <div className="stock-card__price-row">
          <span className="stock-card__sk stock-card__sk--price" />
          <span className="stock-card__sk stock-card__sk--change" />
        </div>
        <div className="stock-card__grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="stock-card__field" key={i}>
              <span className="stock-card__sk stock-card__sk--label" />
              <span className="stock-card__sk stock-card__sk--value" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.fetchError) {
    return (
      <div className="stock-card stock-card--error">
        <div className="stock-card__header">
          <span className="stock-card__symbol">{symbol}</span>
          <button className="stock-card__remove" onClick={() => onRemove(symbol)} title="移除">
            ×
          </button>
        </div>
        <div className="stock-card__error-msg">{data.fetchError}</div>
      </div>
    );
  }

  const isUp = data.change >= 0;
  const trend = isUp ? 'up' : 'down';
  const arrow = isUp ? '▲' : '▼';
  const sign = isUp ? '+' : '';

  return (
    <div
      className={`stock-card stock-card--${trend}${flash ? ` stock-card--flash-${flash}` : ''}`}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="stock-card__header">
        <div className="stock-card__title" onClick={onClick}>
          <span className="stock-card__name">{data.name}</span>
          <span className="stock-card__symbol">{data.symbol}</span>
        </div>
        <button className="stock-card__remove" onClick={() => onRemove(symbol)} title="移除">
          ×
        </button>
      </div>

      <div className="stock-card__price-row" onClick={onClick}>
        <span className="stock-card__price">
          {data.currency} {data.current_price.toFixed(2)}
        </span>
        <span className={`stock-card__change stock-card__change--${trend}`}>
          {arrow} {sign}
          {data.change.toFixed(2)} ({sign}
          {data.change_percent.toFixed(2)}%)
        </span>
      </div>

      <ExtendedHoursBar data={data} />

      <div className="stock-card__grid">
        <div className="stock-card__field">
          <span className="stock-card__label">今开</span>
          <span className="stock-card__value">{data.open_price.toFixed(2)}</span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">昨收</span>
          <span className="stock-card__value">{data.prev_close.toFixed(2)}</span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">最高</span>
          <span className="stock-card__value stock-card__value--high">
            {data.day_high.toFixed(2)}
          </span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">最低</span>
          <span className="stock-card__value stock-card__value--low">
            {data.day_low.toFixed(2)}
          </span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">成交量</span>
          <span className="stock-card__value">{formatVolume(data.volume)}</span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">成交额</span>
          <span className="stock-card__value">{formatTurnover(data.turnover)}</span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">换手率</span>
          <span className="stock-card__value">{formatPercent(data.turnover_rate)}</span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">量比</span>
          <span className="stock-card__value">{formatRatio(data.volume_ratio)}</span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">均量</span>
          <span className="stock-card__value">{formatVolume(data.avg_volume)}</span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">总市值</span>
          <span className="stock-card__value">{formatMarketCap(data.market_cap)}</span>
        </div>
        <div className="stock-card__field">
          <span className="stock-card__label">市盈率</span>
          <span className="stock-card__value">
            {data.pe_ratio != null && Number.isFinite(data.pe_ratio) ? data.pe_ratio.toFixed(2) : '—'}
          </span>
        </div>
        {data.week_52_high && (
          <>
            <div className="stock-card__field">
              <span className="stock-card__label">52周高</span>
              <span className="stock-card__value stock-card__value--high">
                {data.week_52_high.toFixed(2)}
              </span>
            </div>
            <div className="stock-card__field">
              <span className="stock-card__label">52周低</span>
              <span className="stock-card__value stock-card__value--low">
                {data.week_52_low?.toFixed(2) ?? '—'}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="stock-card__footer">
        更新于 {new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
      </div>
    </div>
  );
}

function ExtendedHoursBar({ data }: { data: QuoteData }) {
  const state = data.market_state;
  const hasPre = state === 'PRE' && data.pre_market_price != null;
  const hasPost = (state === 'POST' || state === 'CLOSED') && data.post_market_price != null;

  if (!hasPre && !hasPost) return null;

  const price = hasPre ? data.pre_market_price! : data.post_market_price!;
  const change = hasPre ? data.pre_market_change! : data.post_market_change!;
  const pct = hasPre ? data.pre_market_change_percent! : data.post_market_change_percent!;
  const label = hasPre ? '盘前' : '盘后';
  const isUp = change >= 0;
  const trend = isUp ? 'up' : 'down';
  const sign = isUp ? '+' : '';

  return (
    <div className={`stock-card__extended stock-card__extended--${trend}`}>
      <span className="stock-card__extended-label">{label}</span>
      <span className="stock-card__extended-price">{price.toFixed(2)}</span>
      <span className={`stock-card__extended-change stock-card__extended-change--${trend}`}>
        {sign}
        {change.toFixed(2)} ({sign}
        {pct.toFixed(2)}%)
      </span>
    </div>
  );
}

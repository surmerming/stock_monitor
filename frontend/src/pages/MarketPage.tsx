import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuoteSSE } from '../hooks/useQuoteSSE';
import { formatVolume, formatTurnover } from '../utils/format';
import type { QuoteData, FlashDirection } from '../types';
import './MarketPage.less';

interface IndexDef {
  symbol: string;
  name: string;
  category: string;
}

const CATEGORIES = [
  'A股指数', '港股指数', '美股指数',
  'A股行业指数', '大宗商品', '利率债券', '外汇宏观',
];

const INDICES: IndexDef[] = [
  // ─── A股指数 ───
  { symbol: '000001.SS', name: '上证指数', category: 'A股指数' },
  { symbol: '399001.SZ', name: '深证成指', category: 'A股指数' },
  { symbol: '399006.SZ', name: '创业板指', category: 'A股指数' },
  { symbol: '000300.SS', name: '沪深300', category: 'A股指数' },
  { symbol: '399005.SZ', name: '中小100', category: 'A股指数' },

  // ─── 港股指数 ───
  { symbol: '^HSI', name: '恒生指数', category: '港股指数' },
  { symbol: '^HSCE', name: '国企指数', category: '港股指数' },
  { symbol: 'HSTECH.HK', name: '恒生科技指数', category: '港股指数' },
  { symbol: '^HSCC', name: '恒生红筹指数', category: '港股指数' },
  { symbol: '^HSNU', name: '恒生公用事业', category: '港股指数' },

  // ─── 美股指数 ───
  { symbol: '^GSPC', name: '标普500', category: '美股指数' },
  { symbol: '^DJI', name: '道琼斯', category: '美股指数' },
  { symbol: '^IXIC', name: '纳斯达克', category: '美股指数' },

  // ─── A股行业指数 ───
  { symbol: '399997.SZ', name: '中证白酒', category: 'A股行业指数' },
  { symbol: '399967.SZ', name: '中证国防军工', category: 'A股行业指数' },
  { symbol: '399395.SZ', name: '有色金属', category: 'A股行业指数' },

  // ─── 大宗商品 ───
  { symbol: 'GC=F', name: '黄金', category: '大宗商品' },
  { symbol: 'SI=F', name: '白银', category: '大宗商品' },
  { symbol: 'CL=F', name: '原油', category: '大宗商品' },
  { symbol: 'HG=F', name: '铜', category: '大宗商品' },
  { symbol: 'NG=F', name: '天然气', category: '大宗商品' },

  // ─── 利率债券 ───
  { symbol: '^TNX', name: '美10年国债', category: '利率债券' },
  { symbol: '^TYX', name: '美30年国债', category: '利率债券' },
  { symbol: '^FVX', name: '美5年国债', category: '利率债券' },
  { symbol: '^IRX', name: '美3月国债', category: '利率债券' },

  // ─── 外汇宏观 ───
  { symbol: 'DX-Y.NYB', name: '美元指数', category: '外汇宏观' },
  { symbol: 'CNY=X', name: '美元/人民币', category: '外汇宏观' },
  { symbol: '^VIX', name: 'VIX恐慌指数', category: '外汇宏观' },
  { symbol: 'BTC-USD', name: '比特币', category: '外汇宏观' },
];

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
    'A股指数': 'A股',
    '港股指数': '港股',
    '美股指数': '美股',
  };

  const grouped = CATEGORIES.map((cat) => ({
    label: cat,
    items: INDICES.filter((i) => i.category === cat),
    tradingKey: CATEGORY_TRADING[cat],
  }));

  const hasData = INDICES.some((idx) => quotes[idx.symbol]);

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

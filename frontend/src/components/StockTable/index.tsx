import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatVolume,
  formatMarketCap,
  formatTurnover,
  formatPercent,
  formatRatio,
} from '../../utils/format';
import type { QuoteData } from '../../types';
import type { FlashDirection } from '../../types';
import { SORTABLE_COLS, type StockSortKey } from '../../configs/stocks';
import './style.less';

interface SortIndicatorProps {
  active: boolean;
  direction: 'asc' | 'desc';
}

function SortIndicator({ active, direction }: SortIndicatorProps) {
  return (
    <span className={`stock-table__sort-icon${active ? ' stock-table__sort-icon--active' : ''}`}>
      {active ? (direction === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

interface StockTableItem {
  sym: string;
  data: QuoteData | null;
}

interface StockTableProps {
  items: StockTableItem[];
  onSymbolClick?: (sym: string) => void;
}

export default function StockTable({ items, onSymbolClick }: StockTableProps) {
  const [sortKey, setSortKey] = useState<StockSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: StockSortKey) => {
    if (sortKey === key) {
      if (sortDir === 'desc') setSortDir('asc');
      else {
        setSortKey(null);
        setSortDir('desc');
      }
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const { getter } = SORTABLE_COLS[sortKey];
    const sorted = [...items].sort((a, b) => {
      const va = getter(a.data);
      const vb = getter(b.data);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return sorted;
  }, [items, sortKey, sortDir]);

  const thSortable = (key: StockSortKey, extraClass = '') => ({
    className: `stock-table__th stock-table__th--sortable ${extraClass}`.trim(),
    onClick: () => handleSort(key),
  });

  return (
    <div className="stock-table-wrap">
      <table className="stock-table">
        <thead>
          <tr>
            <th className="stock-table__th stock-table__th--name">名称</th>
            <th className="stock-table__th stock-table__th--price">最新价</th>
            <th className="stock-table__th stock-table__th--change">涨跌额</th>
            <th {...thSortable('change_percent', 'stock-table__th--pct')}>
              涨跌幅
              <SortIndicator active={sortKey === 'change_percent'} direction={sortDir} />
            </th>
            <th className="stock-table__th">今开</th>
            <th className="stock-table__th">最高</th>
            <th className="stock-table__th">最低</th>
            <th className="stock-table__th">成交量</th>
            <th className="stock-table__th">成交额</th>
            <th className="stock-table__th">换手率</th>
            <th className="stock-table__th">量比</th>
            <th {...thSortable('market_cap')}>
              总市值
              <SortIndicator active={sortKey === 'market_cap'} direction={sortDir} />
            </th>
            <th {...thSortable('pe_ratio')}>
              市盈率
              <SortIndicator active={sortKey === 'pe_ratio'} direction={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(({ sym, data }) => (
            <StockRow key={sym} sym={sym} data={data} onSymbolClick={onSymbolClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonCell() {
  return <span className="stock-table__sk" />;
}

interface StockRowProps {
  sym: string;
  data: QuoteData | null;
  onSymbolClick?: (sym: string) => void;
}

function StockRow({ sym, data, onSymbolClick }: StockRowProps) {
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
      <tr className="stock-table__row stock-table__row--skeleton">
        <td className="stock-table__td stock-table__td--name">
          <span className="stock-table__sk stock-table__sk--name" />
          <span className="stock-table__sk stock-table__sk--symbol" />
        </td>
        {Array.from({ length: 12 }).map((_, i) => (
          <td className="stock-table__td" key={i}>
            <SkeletonCell />
          </td>
        ))}
      </tr>
    );
  }

  if (data.fetchError) {
    return (
      <tr className="stock-table__row stock-table__row--error">
        <td className="stock-table__td stock-table__td--name">
          <span className="stock-table__symbol">{sym}</span>
        </td>
        <td className="stock-table__td" colSpan={12}>
          <span className="stock-table__error">{data.fetchError}</span>
        </td>
      </tr>
    );
  }

  const isUp = data.change >= 0;
  const trend = isUp ? 'up' : 'down';
  const sign = isUp ? '+' : '';

  return (
    <tr
      className={`stock-table__row stock-table__row--${trend}${flash ? ` stock-table__row--flash-${flash}` : ''}`}
      style={onSymbolClick ? { cursor: 'pointer' } : undefined}
    >
      <td className="stock-table__td stock-table__td--name" onClick={() => onSymbolClick?.(sym)}>
        <span className="stock-table__name-text">{data.name}</span>
        <span className="stock-table__symbol">{data.symbol}</span>
      </td>
      <td className={`stock-table__td stock-table__td--mono stock-table__td--${trend}`}>
        <span>
          {data.currency} {data.current_price.toFixed(2)}
        </span>
        <ExtendedHoursInline data={data} />
      </td>
      <td className={`stock-table__td stock-table__td--mono stock-table__td--${trend}`}>
        {sign}
        {data.change.toFixed(2)}
      </td>
      <td className={`stock-table__td stock-table__td--mono stock-table__td--${trend}`}>
        {sign}
        {data.change_percent.toFixed(2)}%
      </td>
      <td className="stock-table__td stock-table__td--mono">{data.open_price.toFixed(2)}</td>
      <td className="stock-table__td stock-table__td--mono stock-table__td--up-subtle">
        {data.day_high.toFixed(2)}
      </td>
      <td className="stock-table__td stock-table__td--mono stock-table__td--down-subtle">
        {data.day_low.toFixed(2)}
      </td>
      <td className="stock-table__td stock-table__td--mono">{formatVolume(data.volume)}</td>
      <td className="stock-table__td stock-table__td--mono">{formatTurnover(data.turnover)}</td>
      <td className="stock-table__td stock-table__td--mono">{formatPercent(data.turnover_rate)}</td>
      <td className="stock-table__td stock-table__td--mono">{formatRatio(data.volume_ratio)}</td>
      <td className="stock-table__td stock-table__td--mono">{formatMarketCap(data.market_cap)}</td>
      <td className="stock-table__td stock-table__td--mono">
        {data.pe_ratio != null && Number.isFinite(data.pe_ratio) ? data.pe_ratio.toFixed(2) : '—'}
      </td>
    </tr>
  );
}

function ExtendedHoursInline({ data }: { data: QuoteData }) {
  const state = data.market_state;
  const hasPre = state === 'PRE' && data.pre_market_price != null;
  const hasPost = (state === 'POST' || state === 'CLOSED') && data.post_market_price != null;

  if (!hasPre && !hasPost) return null;

  const pct = hasPre ? data.pre_market_change_percent! : data.post_market_change_percent!;
  const label = hasPre ? '盘前' : '盘后';
  const isUp = pct >= 0;
  const sign = isUp ? '+' : '';

  return (
    <span className={`stock-table__ext stock-table__ext--${isUp ? 'up' : 'down'}`}>
      {label} {sign}
      {pct.toFixed(2)}%
    </span>
  );
}

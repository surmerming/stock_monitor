import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatVolume,
  formatMarketCap,
  formatTurnover,
  formatPercent,
  formatRatio,
} from '../utils/format';
import type { QuoteData } from '../types';
import type { FlashDirection } from '../types';
import './StockTable.less';

type SortKey = 'change_percent' | 'market_cap' | 'pe_ratio';

const SORTABLE_COLS: Record<
  SortKey,
  { label: string; getter: (d: QuoteData | null) => number }
> = {
  change_percent: { label: '涨跌幅', getter: (d) => d?.change_percent ?? -Infinity },
  market_cap: { label: '总市值', getter: (d) => d?.market_cap ?? -Infinity },
  pe_ratio: { label: '市盈率', getter: (d) => (d?.pe_ratio != null ? d.pe_ratio : Infinity) },
};

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
  onRemove: (sym: string) => void;
  onSymbolClick?: (sym: string) => void;
}

export default function StockTable({ items, onRemove, onSymbolClick }: StockTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
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

  const thSortable = (key: SortKey, extraClass = '') => ({
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
            <th className="stock-table__th stock-table__th--action"></th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(({ sym, data }) => (
            <StockRow
              key={sym}
              sym={sym}
              data={data}
              onRemove={onRemove}
              onSymbolClick={onSymbolClick}
            />
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
  onRemove: (sym: string) => void;
  onSymbolClick?: (sym: string) => void;
}

function StockRow({ sym, data, onRemove, onSymbolClick }: StockRowProps) {
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
        <td className="stock-table__td stock-table__td--action">
          <button className="stock-table__remove" onClick={() => onRemove(sym)}>
            ×
          </button>
        </td>
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
        <td className="stock-table__td stock-table__td--action">
          <button className="stock-table__remove" onClick={() => onRemove(sym)}>
            ×
          </button>
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
        {data.currency} {data.current_price.toFixed(2)}
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
        {data.pe_ratio ? data.pe_ratio.toFixed(2) : '—'}
      </td>
      <td className="stock-table__td stock-table__td--action">
        <button className="stock-table__remove" onClick={() => onRemove(sym)}>
          ×
        </button>
      </td>
    </tr>
  );
}

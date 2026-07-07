import { useState, useMemo, type ReactNode } from 'react';
import type { WatchlistReviewItem } from '../../types';
import { formatVolume, formatTurnover } from '../../utils/format';

interface Props {
  items: WatchlistReviewItem[];
  loading: boolean;
  onSelect: (symbol: string) => void;
  compact?: boolean;
}

type SortKey =
  | 'changePercent'
  | 'amplitude'
  | 'volume'
  | 'volumeRatio'
  | 'volMa5Ratio'
  | 'netFlow'
  | 'score'
  | 'turnover'
  | 'turnoverRate';

const COLUMNS: { key: SortKey; label: string; compact?: boolean }[] = [
  { key: 'changePercent', label: '涨跌幅' },
  { key: 'amplitude', label: '振幅' },
  { key: 'volume', label: '成交量' },
  { key: 'turnover', label: '成交额' },
  { key: 'volumeRatio', label: '量比' },
  { key: 'volMa5Ratio', label: '5日量比' },
  { key: 'turnoverRate', label: '换手率' },
  { key: 'netFlow', label: '净流入' },
  { key: 'score', label: '评分' },
];

function getScoreColor(score: number): string {
  if (score >= 75) return '#e74c3c';
  if (score >= 60) return '#e67e22';
  if (score >= 40) return '#f5a623';
  if (score >= 25) return '#95a5a6';
  return '#27ae60';
}

function getSignalClass(direction: string): string {
  if (direction === 'bullish') return 'rv-tag--bull';
  if (direction === 'bearish') return 'rv-tag--bear';
  return 'rv-tag--neutral';
}

export default function ReviewTable({ items, loading, onSelect, compact }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === 'score') {
        va = a.score.total;
        vb = b.score.total;
      } else {
        va = (a as any)[sortKey] ?? 0;
        vb = (b as any)[sortKey] ?? 0;
      }
      return sortDesc ? vb - va : va - vb;
    });
    return compact ? arr.slice(0, 10) : arr;
  }, [items, sortKey, sortDesc, compact]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  if (loading && items.length === 0) {
    return <div className="rv-table rv-skeleton">加载复盘数据中...</div>;
  }

  if (items.length === 0) {
    return <div className="rv-table rv-empty">暂无自选股数据，请先在「个股」页面添加自选股</div>;
  }

  const visibleCols = compact
    ? COLUMNS.filter((c) => ['changePercent', 'volumeRatio', 'netFlow', 'score'].includes(c.key))
    : COLUMNS;

  return (
    <div className="rv-table">
      <table className="rv-table__el">
        <thead>
          <tr>
            <th className="rv-table__th rv-table__th--fixed">股票</th>
            <th className="rv-table__th">现价</th>
            {visibleCols.map((col) => (
              <th
                key={col.key}
                className={`rv-table__th rv-table__th--sortable ${sortKey === col.key ? 'rv-table__th--sorted' : ''}`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="rv-table__sort-arrow">{sortDesc ? '▼' : '▲'}</span>
                )}
              </th>
            ))}
            <th className="rv-table__th">均线</th>
            <th className="rv-table__th">MACD</th>
            <th className="rv-table__th">KDJ</th>
            {!compact && <th className="rv-table__th">异动</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const isUp = item.change >= 0;
            const cls = isUp ? 'rv-table__val--up' : 'rv-table__val--down';

            return (
              <tr key={item.symbol} className="rv-table__row" onClick={() => onSelect(item.symbol)}>
                <td className="rv-table__td rv-table__td--stock">
                  <div className="rv-table__stock-info">
                    <span className="rv-table__stock-name">{item.name}</span>
                    <span className="rv-table__stock-code">{item.symbol}</span>
                  </div>
                </td>
                <td className={`rv-table__td ${cls}`}>{item.price.toFixed(2)}</td>
                {visibleCols.map((col) => {
                  let content: ReactNode;
                  let cellCls = 'rv-table__td';

                  switch (col.key) {
                    case 'changePercent':
                      cellCls += ` ${cls}`;
                      content = `${isUp ? '+' : ''}${item.changePercent.toFixed(2)}%`;
                      break;
                    case 'amplitude':
                      content = `${item.amplitude.toFixed(2)}%`;
                      break;
                    case 'volume':
                      content = formatVolume(item.volume);
                      break;
                    case 'turnover':
                      content = formatTurnover(item.turnover);
                      break;
                    case 'volumeRatio':
                      content = item.volumeRatio?.toFixed(2) ?? '—';
                      break;
                    case 'volMa5Ratio':
                      content = item.volMa5Ratio?.toFixed(2) ?? '—';
                      break;
                    case 'turnoverRate':
                      content = item.turnoverRate ? `${item.turnoverRate.toFixed(2)}%` : '—';
                      break;
                    case 'netFlow': {
                      const nf = item.netFlow;
                      cellCls +=
                        nf > 0 ? ' rv-table__val--up' : nf < 0 ? ' rv-table__val--down' : '';
                      content = formatTurnover(nf);
                      break;
                    }
                    case 'score':
                      content = (
                        <span
                          className="rv-table__score"
                          style={{ background: getScoreColor(item.score.total) }}
                        >
                          {item.score.total}
                        </span>
                      );
                      break;
                    default:
                      content = '—';
                  }
                  return (
                    <td key={col.key} className={cellCls}>
                      {content}
                    </td>
                  );
                })}
                <td className="rv-table__td">
                  <span
                    className={`rv-tag ${item.maStatus.alignment === 'bullish' ? 'rv-tag--bull' : item.maStatus.alignment === 'bearish' ? 'rv-tag--bear' : 'rv-tag--neutral'}`}
                  >
                    {item.maStatus.alignment === 'bullish'
                      ? '多头'
                      : item.maStatus.alignment === 'bearish'
                        ? '空头'
                        : '交织'}
                  </span>
                </td>
                <td className="rv-table__td">
                  <span
                    className={`rv-tag ${item.technicals.macd.signal === '金叉' || item.technicals.macd.signal === '多头' ? 'rv-tag--bull' : item.technicals.macd.signal === '死叉' || item.technicals.macd.signal === '空头' ? 'rv-tag--bear' : 'rv-tag--neutral'}`}
                  >
                    {item.technicals.macd.signal}
                  </span>
                </td>
                <td className="rv-table__td">
                  <span
                    className={`rv-tag ${item.technicals.kdj.signal === '金叉' ? 'rv-tag--bull' : item.technicals.kdj.signal === '死叉' || item.technicals.kdj.signal === '超买' ? 'rv-tag--bear' : item.technicals.kdj.signal === '超卖' ? 'rv-tag--bull' : 'rv-tag--neutral'}`}
                  >
                    {item.technicals.kdj.signal}
                  </span>
                </td>
                {!compact && (
                  <td className="rv-table__td rv-table__td--tags">
                    {item.anomalies.slice(0, 3).map((a, i) => (
                      <span
                        key={i}
                        className={`rv-tag ${getSignalClass(a.direction)}`}
                        title={a.description}
                      >
                        {a.label}
                      </span>
                    ))}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import {
  formatVolume,
  formatMarketCap,
  formatTurnover,
  formatPercent,
  formatRatio,
} from '../utils/format';
import './StockTable.less';

export default function StockTable({ items, onRemove }) {
  return (
    <div className="stock-table-wrap">
      <table className="stock-table">
        <thead>
          <tr>
            <th className="stock-table__th stock-table__th--name">名称</th>
            <th className="stock-table__th stock-table__th--price">最新价</th>
            <th className="stock-table__th stock-table__th--change">涨跌额</th>
            <th className="stock-table__th stock-table__th--pct">涨跌幅</th>
            <th className="stock-table__th">今开</th>
            <th className="stock-table__th">最高</th>
            <th className="stock-table__th">最低</th>
            <th className="stock-table__th">成交量</th>
            <th className="stock-table__th">成交额</th>
            <th className="stock-table__th">换手率</th>
            <th className="stock-table__th">量比</th>
            <th className="stock-table__th">总市值</th>
            <th className="stock-table__th">市盈率</th>
            <th className="stock-table__th stock-table__th--action"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ sym, data }) => (
            <StockRow key={sym} sym={sym} data={data} onRemove={onRemove} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonCell() {
  return <span className="stock-table__sk" />;
}

function StockRow({ sym, data, onRemove }) {
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
    <tr className={`stock-table__row stock-table__row--${trend}`}>
      <td className="stock-table__td stock-table__td--name">
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

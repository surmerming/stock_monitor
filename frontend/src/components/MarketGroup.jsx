import { getMarketColor } from '../utils/format';
import './MarketGroup.less';

export default function MarketGroup({ market, count, children }) {
  const color = getMarketColor(market);

  return (
    <section className="market-group">
      <div className="market-group__header">
        <span className="market-group__badge" style={{ background: color }}>
          {market}
        </span>
        <span className="market-group__count">{count} 只</span>
        <div className="market-group__line" style={{ borderColor: color }} />
      </div>
      <div className="market-group__body">{children}</div>
    </section>
  );
}

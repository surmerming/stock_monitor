import type { SectorRotationItem } from '../../types';

interface Props {
  data: { gainers: SectorRotationItem[]; losers: SectorRotationItem[] } | null;
  loading: boolean;
}

export default function SectorRanking({ data, loading }: Props) {
  if (loading && !data) {
    return <div className="rv-sectors rv-skeleton">加载板块数据中...</div>;
  }
  if (!data) {
    return null;
  }

  return (
    <div className="rv-sectors">
      <h3 className="rv-section-title">板块涨跌排行</h3>
      <div className="rv-sectors__grid">
        <div className="rv-sectors__col">
          <h4 className="rv-sectors__col-title rv-sectors__col-title--up">领涨板块</h4>
          <div className="rv-sectors__list">
            {data.gainers.slice(0, 10).map((s, i) => (
              <div key={s.symbol} className="rv-sectors__item rv-sectors__item--up">
                <span className="rv-sectors__rank">{i + 1}</span>
                <span className="rv-sectors__name">{s.name}</span>
                <span className="rv-sectors__change">+{s.change1d.toFixed(2)}%</span>
                <div className="rv-sectors__bar">
                  <div
                    className="rv-sectors__bar-fill rv-sectors__bar-fill--up"
                    style={{ width: `${Math.min(100, Math.abs(s.change1d) * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rv-sectors__col">
          <h4 className="rv-sectors__col-title rv-sectors__col-title--down">领跌板块</h4>
          <div className="rv-sectors__list">
            {data.losers.slice(0, 10).map((s, i) => (
              <div key={s.symbol} className="rv-sectors__item rv-sectors__item--down">
                <span className="rv-sectors__rank">{i + 1}</span>
                <span className="rv-sectors__name">{s.name}</span>
                <span className="rv-sectors__change">{s.change1d.toFixed(2)}%</span>
                <div className="rv-sectors__bar">
                  <div
                    className="rv-sectors__bar-fill rv-sectors__bar-fill--down"
                    style={{ width: `${Math.min(100, Math.abs(s.change1d) * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

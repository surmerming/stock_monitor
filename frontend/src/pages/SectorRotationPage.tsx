import { useState, useEffect, useCallback } from 'react';
import type { SectorRotationItem, SectorHeatmapItem } from '../types';
import { formatVolume } from '../utils/format';
import './SectorRotationPage.less';

const MARKETS = ['美股', 'A股', '港股'];
const PERIOD_TABS = [
  { key: '1d', label: '日涨幅' },
  { key: '5d', label: '周涨幅' },
  { key: '1m', label: '月涨幅' },
  { key: '3m', label: '季涨幅' },
];

function getChangeKey(period: string): keyof SectorRotationItem {
  switch (period) {
    case '5d': return 'change5d';
    case '1m': return 'change1m';
    case '3m': return 'change3m';
    default: return 'change1d';
  }
}

function heatColor(val: number): string {
  if (val >= 5) return '#c0392b';
  if (val >= 3) return '#e74c3c';
  if (val >= 1) return '#e8364e';
  if (val > 0) return '#f5a0a8';
  if (val === 0) return '#bdc3c7';
  if (val > -1) return '#82d9a5';
  if (val > -3) return '#00a86b';
  if (val > -5) return '#1e8449';
  return '#145a32';
}

export default function SectorRotationPage() {
  const [market, setMarket] = useState('美股');
  const [period, setPeriod] = useState('1d');
  const [rotation, setRotation] = useState<SectorRotationItem[]>([]);
  const [heatmap, setHeatmap] = useState<SectorHeatmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'rotation' | 'heatmap'>('rotation');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rotRes, heatRes] = await Promise.all([
        fetch(`/api/sector/rotation?market=${encodeURIComponent(market)}`),
        fetch(`/api/sector/heatmap?market=${encodeURIComponent(market)}`),
      ]);
      if (rotRes.ok) setRotation(await rotRes.json());
      if (heatRes.ok) setHeatmap(await heatRes.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [market]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedRotation = [...rotation].sort((a, b) => {
    const key = getChangeKey(period);
    return (b[key] as number) - (a[key] as number);
  });

  const heatPeriodKey = period === '5d' ? 'change5d' : period === '1m' ? 'change1m' : 'change1d';

  return (
    <div className="sr-page">
      <div className="sr-page__header">
        <h2 className="sr-page__title">板块轮动</h2>
        <div className="sr-page__controls">
          {MARKETS.map((m) => (
            <button
              key={m}
              className={`sr-page__market-btn ${market === m ? 'sr-page__market-btn--active' : ''}`}
              onClick={() => setMarket(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="sr-page__tabs">
        <button className={`sr-tab ${tab === 'rotation' ? 'sr-tab--active' : ''}`} onClick={() => setTab('rotation')}>
          轮动排行
        </button>
        <button className={`sr-tab ${tab === 'heatmap' ? 'sr-tab--active' : ''}`} onClick={() => setTab('heatmap')}>
          板块热力图
        </button>
      </div>

      {tab === 'rotation' && (
        <>
          <div className="sr-periods">
            {PERIOD_TABS.map((p) => (
              <button
                key={p.key}
                className={`sr-period ${period === p.key ? 'sr-period--active' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading && rotation.length === 0 && (
            <div className="sr-loading">加载中...</div>
          )}

          <div className="sr-table">
            <div className="sr-table__head">
              <span className="sr-table__col sr-table__col--rank">#</span>
              <span className="sr-table__col sr-table__col--name">板块</span>
              <span className="sr-table__col sr-table__col--chg">日涨幅</span>
              <span className="sr-table__col sr-table__col--chg">周涨幅</span>
              <span className="sr-table__col sr-table__col--chg">月涨幅</span>
              <span className="sr-table__col sr-table__col--chg">季涨幅</span>
              <span className="sr-table__col sr-table__col--score">RS评分</span>
              <span className="sr-table__col sr-table__col--vol">量比</span>
              <span className="sr-table__col sr-table__col--bar">强度</span>
            </div>
            {sortedRotation.map((item, i) => (
              <div key={item.symbol} className="sr-table__row">
                <span className="sr-table__col sr-table__col--rank">
                  <span className={`sr-rank ${i < 3 ? 'sr-rank--top' : ''}`}>{i + 1}</span>
                </span>
                <span className="sr-table__col sr-table__col--name">
                  <span className="sr-table__sector">{item.name}</span>
                  <span className="sr-table__symbol">{item.symbol}</span>
                </span>
                <ChangeCell value={item.change1d} />
                <ChangeCell value={item.change5d} />
                <ChangeCell value={item.change1m} />
                <ChangeCell value={item.change3m} />
                <span className="sr-table__col sr-table__col--score">
                  <span className={`sr-score ${item.rsScore >= 0 ? 'sr-score--up' : 'sr-score--down'}`}>
                    {item.rsScore.toFixed(1)}
                  </span>
                </span>
                <span className="sr-table__col sr-table__col--vol">
                  {item.volumeRatio.toFixed(2)}
                </span>
                <span className="sr-table__col sr-table__col--bar">
                  <div className="sr-bar">
                    <div
                      className={`sr-bar__fill ${item.momentum >= 0 ? 'sr-bar__fill--up' : 'sr-bar__fill--down'}`}
                      style={{ width: `${Math.min(100, Math.abs(item.momentum) * 5)}%` }}
                    />
                  </div>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'heatmap' && (
        <div className="sr-heatmap">
          <div className="sr-heatmap__periods">
            {PERIOD_TABS.filter(p => p.key !== '3m').map((p) => (
              <button
                key={p.key}
                className={`sr-period ${period === p.key ? 'sr-period--active' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="sr-heatmap__grid">
            {heatmap.map((item) => {
              const val = item[heatPeriodKey as keyof SectorHeatmapItem] as number;
              return (
                <div
                  key={item.symbol}
                  className="sr-heat-cell"
                  style={{ background: heatColor(val) }}
                >
                  <div className="sr-heat-cell__name">{item.name}</div>
                  <div className="sr-heat-cell__val">
                    {val >= 0 ? '+' : ''}{val.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
          <div className="sr-heatmap__legend">
            <span style={{ color: '#145a32' }}>跌 ≥5%</span>
            <span style={{ color: '#00a86b' }}>跌 1~5%</span>
            <span style={{ color: '#bdc3c7' }}>平</span>
            <span style={{ color: '#e8364e' }}>涨 1~5%</span>
            <span style={{ color: '#c0392b' }}>涨 ≥5%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeCell({ value }: { value: number }) {
  const isUp = value >= 0;
  return (
    <span className={`sr-table__col sr-table__col--chg sr-chg--${isUp ? 'up' : 'down'}`}>
      {isUp ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

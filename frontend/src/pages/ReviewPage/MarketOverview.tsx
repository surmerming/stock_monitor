import type { SentimentResult, SectorRotationItem } from '../../types';
import { formatVolume } from '../../utils/format';

interface Props {
  data: {
    sentiment: SentimentResult | null;
    sectorRanking: { gainers: SectorRotationItem[]; losers: SectorRotationItem[] };
  } | null;
  loading: boolean;
}

const LEVEL_LABEL: Record<string, string> = {
  extreme_fear: '极度恐惧',
  fear: '恐惧',
  neutral: '中性',
  greed: '贪婪',
  extreme_greed: '极度贪婪',
};

const LEVEL_COLOR: Record<string, string> = {
  extreme_fear: '#e74c3c',
  fear: '#e67e22',
  neutral: '#f5a623',
  greed: '#2ecc71',
  extreme_greed: '#27ae60',
};

export default function MarketOverview({ data, loading }: Props) {
  if (loading && !data) {
    return <div className="rv-market rv-skeleton">加载市场数据中...</div>;
  }
  if (!data?.sentiment) {
    return <div className="rv-market rv-empty">暂无市场数据</div>;
  }

  const { sentiment } = data;
  const gaugeColor = LEVEL_COLOR[sentiment.gauge.level] || '#f5a623';

  return (
    <div className="rv-market">
      <h3 className="rv-section-title">今日市场总览</h3>

      <div className="rv-market__grid">
        {/* Sentiment Gauge */}
        <div className="rv-market__card rv-market__card--gauge">
          <div className="rv-market__gauge">
            <div className="rv-market__gauge-score" style={{ color: gaugeColor }}>
              {sentiment.gauge.score}
            </div>
            <div className="rv-market__gauge-label" style={{ color: gaugeColor }}>
              {LEVEL_LABEL[sentiment.gauge.level] || sentiment.gauge.label}
            </div>
            <div className="rv-market__gauge-bar">
              <div
                className="rv-market__gauge-fill"
                style={{ width: `${sentiment.gauge.score}%`, background: gaugeColor }}
              />
            </div>
          </div>
        </div>

        {/* Indices */}
        <div className="rv-market__card rv-market__card--indices">
          <h4 className="rv-market__card-title">主要指数</h4>
          <div className="rv-market__indices">
            {sentiment.indices.map((idx) => {
              const isUp = idx.changePercent >= 0;
              return (
                <div key={idx.symbol} className={`rv-market__index rv-market__index--${isUp ? 'up' : 'down'}`}>
                  <span className="rv-market__index-name">{idx.name}</span>
                  <span className="rv-market__index-price">{idx.price.toFixed(2)}</span>
                  <span className="rv-market__index-change">
                    {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breadth */}
        <div className="rv-market__card">
          <h4 className="rv-market__card-title">市场宽度</h4>
          <div className="rv-market__breadth">
            <div className="rv-market__breadth-row">
              <span className="rv-market__breadth-up">▲ {sentiment.breadth.advancers}</span>
              <div className="rv-market__breadth-bar">
                <div
                  className="rv-market__breadth-fill"
                  style={{ width: `${sentiment.breadth.advanceRatio}%` }}
                />
              </div>
              <span className="rv-market__breadth-down">▼ {sentiment.breadth.decliners}</span>
            </div>
            <div className="rv-market__breadth-stats">
              <span>MA50上方: {sentiment.breadth.aboveMa50Pct.toFixed(0)}%</span>
              <span>新高: {sentiment.breadth.newHighs}</span>
              <span>新低: {sentiment.breadth.newLows}</span>
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="rv-market__card">
          <h4 className="rv-market__card-title">成交量分析</h4>
          <div className="rv-market__volume">
            <div className="rv-market__volume-main">
              <span className="rv-market__volume-val">{formatVolume(sentiment.volume.totalVolume)}</span>
              <span className={`rv-market__volume-level rv-market__volume-level--${sentiment.volume.volumeLevel}`}>
                量比 {sentiment.volume.volumeRatio.toFixed(2)}
              </span>
            </div>
            <div className="rv-market__volume-avg">
              均量: {formatVolume(sentiment.volume.avgVolume)}
            </div>
          </div>
        </div>

        {/* VIX */}
        {sentiment.vix && (
          <div className="rv-market__card">
            <h4 className="rv-market__card-title">VIX 恐慌指数</h4>
            <div className={`rv-market__vix rv-market__vix--${sentiment.vix.level}`}>
              <span className="rv-market__vix-val">{sentiment.vix.current.toFixed(2)}</span>
              <span className={`rv-market__vix-change ${sentiment.vix.change >= 0 ? 'up' : 'down'}`}>
                {sentiment.vix.change >= 0 ? '+' : ''}{sentiment.vix.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

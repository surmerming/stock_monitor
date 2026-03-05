import { useState, useEffect, useCallback } from 'react';
import type { SentimentResult } from '../../types';
import { formatVolume } from '../../utils/format';
import { apiFetch } from '../../utils/apiFetch';
import { LEVEL_CONFIG, VIX_LEVEL_LABEL, VOL_LEVEL_LABEL } from '../../configs/sentiment';
import './style.less';

export default function SentimentPage() {
  const [data, setData] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch('/api/sentiment');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError('');
    } catch (err: any) {
      setError(err.message || '获取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="st-page">
        <div className="st-page__header">
          <h2 className="st-page__title">市场情绪仪表盘</h2>
        </div>
        <div className="st-loading">加载中...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="st-page">
        <div className="st-page__header">
          <h2 className="st-page__title">市场情绪仪表盘</h2>
        </div>
        <div className="st-error">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const gaugeConfig = LEVEL_CONFIG[data.gauge.level] || LEVEL_CONFIG.neutral;

  return (
    <div className="st-page">
      <div className="st-page__header">
        <h2 className="st-page__title">市场情绪仪表盘</h2>
        <span className="st-page__time">
          更新于 {new Date(data.timestamp).toLocaleTimeString('zh-CN')}
        </span>
      </div>

      {/* Fear & Greed Gauge */}
      <div className="st-gauge" style={{ background: gaugeConfig.bg }}>
        <div className="st-gauge__score" style={{ color: gaugeConfig.color }}>
          {data.gauge.score}
        </div>
        <div className="st-gauge__label" style={{ color: gaugeConfig.color }}>
          {data.gauge.label}
        </div>
        <div className="st-gauge__bar">
          <div className="st-gauge__bar-track">
            <div
              className="st-gauge__bar-fill"
              style={{ width: `${data.gauge.score}%`, background: gaugeConfig.color }}
            />
            <div className="st-gauge__bar-labels">
              <span>极度恐惧</span>
              <span>恐惧</span>
              <span>中性</span>
              <span>贪婪</span>
              <span>极度贪婪</span>
            </div>
          </div>
        </div>
        <div className="st-gauge__components">
          {data.gauge.components.map((c) => (
            <div key={c.name} className="st-comp">
              <div className="st-comp__header">
                <span className="st-comp__name">{c.name}</span>
                <span className="st-comp__score">{c.score.toFixed(0)}</span>
              </div>
              <div className="st-comp__bar">
                <div
                  className="st-comp__bar-fill"
                  style={{
                    width: `${c.score}%`,
                    background: c.score >= 60 ? '#27ae60' : c.score >= 40 ? '#f5a623' : '#e74c3c',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="st-grid">
        {/* VIX */}
        {data.vix && (
          <div className="st-card">
            <h4 className="st-card__title">VIX 恐慌指数</h4>
            <div className={`st-vix st-vix--${data.vix.level}`}>
              <div className="st-vix__value">{data.vix.current.toFixed(2)}</div>
              <div
                className={`st-vix__change ${data.vix.change >= 0 ? 'st-vix__change--up' : 'st-vix__change--down'}`}
              >
                {data.vix.change >= 0 ? '+' : ''}
                {data.vix.change.toFixed(2)}({data.vix.changePercent >= 0 ? '+' : ''}
                {data.vix.changePercent.toFixed(2)}%)
              </div>
              <div className="st-vix__level">{VIX_LEVEL_LABEL[data.vix.level]}</div>
            </div>
            <div className="st-vix__scale">
              <div className="st-vix__scale-bar">
                <div
                  className="st-vix__scale-marker"
                  style={{ left: `${Math.min(100, (data.vix.current / 40) * 100)}%` }}
                />
              </div>
              <div className="st-vix__scale-labels">
                <span>0</span>
                <span>15</span>
                <span>20</span>
                <span>30</span>
                <span>40+</span>
              </div>
            </div>
          </div>
        )}

        {/* Breadth */}
        <div className="st-card">
          <h4 className="st-card__title">市场宽度</h4>
          <div className="st-breadth">
            <div className="st-breadth__row">
              <span className="st-breadth__label">上涨</span>
              <span className="st-breadth__val st-breadth__val--up">{data.breadth.advancers}</span>
              <div className="st-breadth__bar">
                <div
                  className="st-breadth__bar-up"
                  style={{ width: `${data.breadth.advanceRatio}%` }}
                />
              </div>
              <span className="st-breadth__val st-breadth__val--down">
                {data.breadth.decliners}
              </span>
              <span className="st-breadth__label">下跌</span>
            </div>
            <div className="st-breadth__stats">
              <div className="st-breadth__stat">
                <span className="st-breadth__stat-label">50日线上方</span>
                <span className="st-breadth__stat-val">
                  {data.breadth.aboveMa50Pct.toFixed(0)}%
                </span>
              </div>
              <div className="st-breadth__stat">
                <span className="st-breadth__stat-label">创新高</span>
                <span className="st-breadth__stat-val st-breadth__stat-val--up">
                  {data.breadth.newHighs}
                </span>
              </div>
              <div className="st-breadth__stat">
                <span className="st-breadth__stat-label">创新低</span>
                <span className="st-breadth__stat-val st-breadth__stat-val--down">
                  {data.breadth.newLows}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="st-card">
          <h4 className="st-card__title">成交量分析 (SPY)</h4>
          <div className="st-volume">
            <div className="st-volume__main">
              <div className="st-volume__value">{formatVolume(data.volume.totalVolume)}</div>
              <div className="st-volume__ratio">
                量比 <strong>{data.volume.volumeRatio.toFixed(2)}</strong>
              </div>
              <div className={`st-volume__level st-volume__level--${data.volume.volumeLevel}`}>
                {VOL_LEVEL_LABEL[data.volume.volumeLevel]}
              </div>
            </div>
            <div className="st-volume__avg">均量: {formatVolume(data.volume.avgVolume)}</div>
          </div>
        </div>
      </div>

      {/* Indices */}
      <div className="st-indices">
        <h4 className="st-indices__title">主要指数</h4>
        <div className="st-indices__grid">
          {data.indices.map((idx) => {
            const isUp = idx.changePercent >= 0;
            return (
              <div key={idx.symbol} className={`st-index st-index--${isUp ? 'up' : 'down'}`}>
                <div className="st-index__name">{idx.name}</div>
                <div className="st-index__price">{idx.price.toFixed(2)}</div>
                <div className="st-index__change">
                  {isUp ? '+' : ''}
                  {idx.changePercent.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

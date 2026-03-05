import { useState, useCallback, useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineSeries } from 'lightweight-charts';
import type { BacktestResult, BacktestTrade } from '../../types';
import { formatTurnover } from '../../utils/format';
import { apiFetch } from '../../utils/apiFetch';
import {
  BACKTEST_PRESET_STRATEGIES,
  BACKTEST_INDICATOR_OPTIONS,
  BACKTEST_OPERATORS,
  EXIT_LABELS,
  type BacktestScreenerFilter,
} from '../../configs/backtest';
import './style.less';

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function BacktestPage() {
  const defaults = getDefaultDates();
  const [symbol, setSymbol] = useState('AAPL');
  const [filters, setFilters] = useState<BacktestScreenerFilter[]>(
    BACKTEST_PRESET_STRATEGIES[0].filters,
  );
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [positionSize, setPositionSize] = useState(100);
  const [stopLoss, setStopLoss] = useState<number | ''>('');
  const [takeProfit, setTakeProfit] = useState<number | ''>('');
  const [holdDays, setHoldDays] = useState<number | ''>(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState('');
  const [activePreset, setActivePreset] = useState(BACKTEST_PRESET_STRATEGIES[0].name);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const addFilter = () => {
    setFilters([...filters, { field: 'macdGoldenCross', operator: 'gte', value: 1 }]);
  };

  const updateFilter = (index: number, patch: Partial<BacktestScreenerFilter>) => {
    setFilters(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const loadPreset = (preset: (typeof BACKTEST_PRESET_STRATEGIES)[0]) => {
    setFilters([...preset.filters]);
    setActivePreset(preset.name);
  };

  const runBacktest = useCallback(async () => {
    if (!symbol.trim() || filters.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.trim(),
          filters,
          startDate,
          endDate,
          initialCapital,
          positionSize,
          stopLoss: stopLoss || undefined,
          takeProfit: takeProfit || undefined,
          holdDays: holdDays || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || '回测失败');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [
    symbol,
    filters,
    startDate,
    endDate,
    initialCapital,
    positionSize,
    stopLoss,
    takeProfit,
    holdDays,
  ]);

  useEffect(() => {
    if (!result || !chartContainerRef.current) return;
    const el = chartContainerRef.current;
    el.innerHTML = '';

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#8892a4',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#f0f2f5' },
        horzLines: { color: '#f0f2f5' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#f0f2f5' },
      timeScale: { borderColor: '#f0f2f5', timeVisible: false },
    });

    const equitySeries = chart.addSeries(LineSeries, {
      color: '#5b8def',
      lineWidth: 2,
      title: '策略净值',
    });
    equitySeries.setData(
      result.equity.map((e) => ({
        time: e.date as string,
        value: e.value,
      })),
    );

    const benchSeries = chart.addSeries(LineSeries, {
      color: '#9b9da3',
      lineWidth: 1,
      lineStyle: 2,
      title: '基准(买入持有)',
    });
    benchSeries.setData(
      result.benchmark.map((e) => ({
        time: e.date as string,
        value: e.value,
      })),
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [result]);

  return (
    <div className="bt-page">
      <div className="bt-page__header">
        <h2 className="bt-page__title">策略回测</h2>
      </div>

      <div className="bt-page__body">
        <aside className="bt-page__sidebar">
          <div className="bt-sidebar">
            <h4 className="bt-sidebar__heading">预设策略</h4>
            {BACKTEST_PRESET_STRATEGIES.map((s) => (
              <button
                key={s.name}
                className={`bt-sidebar__item ${activePreset === s.name ? 'bt-sidebar__item--active' : ''}`}
                onClick={() => loadPreset(s)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="bt-page__main">
          <div className="bt-config">
            <div className="bt-config__row">
              <label className="bt-config__label">股票代码</label>
              <input
                className="bt-config__input"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="如 AAPL, 600519.SS"
              />
            </div>
            <div className="bt-config__row">
              <label className="bt-config__label">回测区间</label>
              <input
                className="bt-config__input bt-config__input--date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="bt-config__sep">至</span>
              <input
                className="bt-config__input bt-config__input--date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="bt-config__row">
              <label className="bt-config__label">初始资金</label>
              <input
                className="bt-config__input"
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(+e.target.value)}
              />
              <label className="bt-config__label">仓位%</label>
              <input
                className="bt-config__input bt-config__input--sm"
                type="number"
                value={positionSize}
                min={10}
                max={100}
                onChange={(e) => setPositionSize(+e.target.value)}
              />
            </div>
            <div className="bt-config__row">
              <label className="bt-config__label">止损%</label>
              <input
                className="bt-config__input bt-config__input--sm"
                type="number"
                value={stopLoss}
                placeholder="可选"
                onChange={(e) => setStopLoss(e.target.value ? +e.target.value : '')}
              />
              <label className="bt-config__label">止盈%</label>
              <input
                className="bt-config__input bt-config__input--sm"
                type="number"
                value={takeProfit}
                placeholder="可选"
                onChange={(e) => setTakeProfit(e.target.value ? +e.target.value : '')}
              />
              <label className="bt-config__label">最大持仓天数</label>
              <input
                className="bt-config__input bt-config__input--sm"
                type="number"
                value={holdDays}
                placeholder="可选"
                onChange={(e) => setHoldDays(e.target.value ? +e.target.value : '')}
              />
            </div>
          </div>

          <div className="bt-filters">
            <div className="bt-filters__head">
              <h4 className="bt-filters__title">买入条件</h4>
              <button className="bt-filters__add" onClick={addFilter}>
                + 添加指标
              </button>
            </div>
            {filters.map((f, i) => (
              <div key={i} className="bt-filter-row">
                <select
                  className="bt-filter-row__field"
                  value={f.field}
                  onChange={(e) => updateFilter(i, { field: e.target.value })}
                >
                  {BACKTEST_INDICATOR_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  className="bt-filter-row__op"
                  value={f.operator}
                  onChange={(e) =>
                    updateFilter(i, {
                      operator: e.target.value as BacktestScreenerFilter['operator'],
                    })
                  }
                >
                  {BACKTEST_OPERATORS.map((op) => (
                    <option key={op.key} value={op.key}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <input
                  className="bt-filter-row__val"
                  type="number"
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: +e.target.value })}
                />
                {f.operator === 'between' && (
                  <>
                    <span className="bt-filter-row__sep">~</span>
                    <input
                      className="bt-filter-row__val"
                      type="number"
                      value={f.value2 ?? 0}
                      onChange={(e) => updateFilter(i, { value2: +e.target.value })}
                    />
                  </>
                )}
                <button className="bt-filter-row__del" onClick={() => removeFilter(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            className="bt-page__run"
            onClick={runBacktest}
            disabled={loading || !symbol.trim() || filters.length === 0}
          >
            {loading ? '回测中，请稍候...' : '开始回测'}
          </button>

          {error && <div className="bt-page__error">{error}</div>}

          {result && (
            <div className="bt-result">
              <h3 className="bt-result__title">
                {result.symbolName} ({result.symbol}) 回测结果
              </h3>

              <div className="bt-stats">
                <StatCard
                  label="总收益"
                  value={`${result.stats.totalReturn >= 0 ? '+' : ''}${result.stats.totalReturn.toFixed(2)}%`}
                  trend={result.stats.totalReturn >= 0 ? 'up' : 'down'}
                />
                <StatCard
                  label="基准收益"
                  value={`${result.stats.benchmarkReturn >= 0 ? '+' : ''}${result.stats.benchmarkReturn.toFixed(2)}%`}
                  trend={result.stats.benchmarkReturn >= 0 ? 'up' : 'down'}
                />
                <StatCard
                  label="年化收益"
                  value={`${result.stats.annualizedReturn >= 0 ? '+' : ''}${result.stats.annualizedReturn.toFixed(2)}%`}
                  trend={result.stats.annualizedReturn >= 0 ? 'up' : 'down'}
                />
                <StatCard
                  label="最大回撤"
                  value={`-${result.stats.maxDrawdown.toFixed(2)}%`}
                  trend="down"
                />
                <StatCard label="夏普比率" value={result.stats.sharpeRatio.toFixed(2)} />
                <StatCard
                  label="胜率"
                  value={`${result.stats.winRate.toFixed(1)}%`}
                  trend={result.stats.winRate >= 50 ? 'up' : 'down'}
                />
                <StatCard
                  label="盈亏比"
                  value={
                    result.stats.profitFactor === Infinity
                      ? '∞'
                      : result.stats.profitFactor.toFixed(2)
                  }
                />
                <StatCard label="交易次数" value={`${result.stats.totalTrades}`} />
                <StatCard label="平均持仓" value={`${result.stats.avgHoldDays.toFixed(1)}天`} />
                <StatCard
                  label="平均盈亏"
                  value={`${result.stats.avgPnlPercent >= 0 ? '+' : ''}${result.stats.avgPnlPercent.toFixed(2)}%`}
                  trend={result.stats.avgPnlPercent >= 0 ? 'up' : 'down'}
                />
                <StatCard
                  label="最大单笔盈利"
                  value={`+${result.stats.maxWin.toFixed(2)}%`}
                  trend="up"
                />
                <StatCard
                  label="最大单笔亏损"
                  value={`${result.stats.maxLoss.toFixed(2)}%`}
                  trend="down"
                />
              </div>

              <div className="bt-chart">
                <h4 className="bt-chart__title">净值曲线</h4>
                <div ref={chartContainerRef} className="bt-chart__canvas" />
              </div>

              {result.trades.length > 0 && (
                <div className="bt-trades">
                  <h4 className="bt-trades__title">交易明细 ({result.trades.length}笔)</h4>
                  <div className="bt-trades__table">
                    <div className="bt-trades__head">
                      <span className="bt-trades__col bt-trades__col--idx">#</span>
                      <span className="bt-trades__col bt-trades__col--date">买入日期</span>
                      <span className="bt-trades__col bt-trades__col--price">买入价</span>
                      <span className="bt-trades__col bt-trades__col--date">卖出日期</span>
                      <span className="bt-trades__col bt-trades__col--price">卖出价</span>
                      <span className="bt-trades__col bt-trades__col--pnl">盈亏%</span>
                      <span className="bt-trades__col bt-trades__col--pnl">盈亏额</span>
                      <span className="bt-trades__col bt-trades__col--hold">持仓天</span>
                      <span className="bt-trades__col bt-trades__col--reason">退出原因</span>
                    </div>
                    {result.trades.map((t, i) => (
                      <TradeRow key={i} trade={t} index={i + 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className={`bt-stat ${trend ? `bt-stat--${trend}` : ''}`}>
      <div className="bt-stat__label">{label}</div>
      <div className="bt-stat__value">{value}</div>
    </div>
  );
}

function TradeRow({ trade, index }: { trade: BacktestTrade; index: number }) {
  const isWin = trade.pnl > 0;
  const trend = isWin ? 'up' : 'down';
  return (
    <div className={`bt-trades__row bt-trades__row--${trend}`}>
      <span className="bt-trades__col bt-trades__col--idx">{index}</span>
      <span className="bt-trades__col bt-trades__col--date">{trade.entryDate}</span>
      <span className="bt-trades__col bt-trades__col--price">{trade.entryPrice.toFixed(2)}</span>
      <span className="bt-trades__col bt-trades__col--date">{trade.exitDate}</span>
      <span className="bt-trades__col bt-trades__col--price">{trade.exitPrice.toFixed(2)}</span>
      <span className={`bt-trades__col bt-trades__col--pnl bt-trades__${trend}`}>
        {isWin ? '+' : ''}
        {trade.pnlPercent.toFixed(2)}%
      </span>
      <span className={`bt-trades__col bt-trades__col--pnl bt-trades__${trend}`}>
        {isWin ? '+' : ''}
        {formatTurnover(trade.pnl)}
      </span>
      <span className="bt-trades__col bt-trades__col--hold">{trade.holdDays}</span>
      <span className="bt-trades__col bt-trades__col--reason">
        {EXIT_LABELS[trade.exitReason] || trade.exitReason}
      </span>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlist } from '../hooks/useWatchlist';
import { formatVolume, formatTurnover } from '../utils/format';
import type { MoneyFlowItem, MoneyFlowDetail } from '../types';
import './MoneyFlowPage.less';

type SortKey = 'netFlow' | 'largeNetFlow' | 'volumeRatio' | 'turnover';
type MarketFilter = 'all' | 'us' | 'cn' | 'hk';

const MARKET_TABS: { key: MarketFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'us', label: '美股' },
  { key: 'cn', label: 'A股' },
  { key: 'hk', label: '港股' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'netFlow', label: '净流入' },
  { key: 'largeNetFlow', label: '大额净流入' },
  { key: 'volumeRatio', label: '量比' },
  { key: 'turnover', label: '成交额' },
];

const REFRESH_INTERVAL = 3 * 60 * 1000;

function marketCssKey(m: string): string {
  if (m === 'A股') return 'cn';
  if (m === '港股') return 'hk';
  return 'us';
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MoneyFlowPage() {
  const [market, setMarket] = useState<MarketFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('netFlow');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [data, setData] = useState<MoneyFlowItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
  const [detail, setDetail] = useState<MoneyFlowDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { addSymbols } = useWatchlist();
  const navigate = useNavigate();

  const isCurrentDay = selectedDate === todayStr();

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (market !== 'all') params.set('market', market);
      if (!isCurrentDay) params.set('date', selectedDate);
      const qs = params.toString();
      const res = await fetch(`/api/moneyflow/overview${qs ? `?${qs}` : ''}`);
      const json: MoneyFlowItem[] = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, [market, selectedDate, isCurrentDay]);

  useEffect(() => {
    setData(null);
    setDetailSymbol(null);
    fetchOverview();
    if (isCurrentDay) {
      const timer = setInterval(fetchOverview, REFRESH_INTERVAL);
      return () => clearInterval(timer);
    }
  }, [fetchOverview, isCurrentDay]);

  const fetchDetail = useCallback(
    async (symbol: string) => {
      setDetailSymbol(symbol);
      setDetail(null);
      setDetailLoading(true);
      try {
        const params = isCurrentDay ? '' : `?date=${selectedDate}`;
        const res = await fetch(
          `/api/moneyflow/${encodeURIComponent(symbol)}${params}`,
        );
        const json: MoneyFlowDetail = await res.json();
        setDetail(json);
      } catch {
        // ignore
      } finally {
        setDetailLoading(false);
      }
    },
    [selectedDate, isCurrentDay],
  );

  const sortedData = data
    ? [...data].sort((a, b) => {
        if (sortKey === 'volumeRatio') return b.volumeRatio - a.volumeRatio;
        if (sortKey === 'turnover') return b.turnover - a.turnover;
        if (sortKey === 'largeNetFlow') return Math.abs(b.largeNetFlow) - Math.abs(a.largeNetFlow);
        return Math.abs(b.netFlow) - Math.abs(a.netFlow);
      })
    : null;

  const handleAddToWatchlist = async (symbol: string) => {
    try {
      await addSymbols([symbol]);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mf-page">
      <div className="mf-page__header">
        <h2 className="mf-page__title">资金流向</h2>
        <div className="mf-page__meta">
          {lastUpdate && (
            <span className="mf-page__update">
              更新于 {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
          )}
          <button className="mf-page__refresh" onClick={fetchOverview} disabled={loading}>
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="mf-page__filters">
        <div className="mf-page__filters-left">
          <div className="mf-page__markets">
            {MARKET_TABS.map((t) => (
              <button
                key={t.key}
                className={`mf-page__market-btn ${market === t.key ? 'mf-page__market-btn--active' : ''}`}
                onClick={() => setMarket(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mf-page__date-picker">
            <input
              type="date"
              className="mf-page__date-input"
              value={selectedDate}
              max={todayStr()}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            {!isCurrentDay && (
              <button
                className="mf-page__date-today"
                onClick={() => setSelectedDate(todayStr())}
              >
                回到今天
              </button>
            )}
          </div>
        </div>
        <div className="mf-page__sorts">
          <span className="mf-page__sort-label">排序：</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`mf-page__sort-btn ${sortKey === opt.key ? 'mf-page__sort-btn--active' : ''}`}
              onClick={() => setSortKey(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mf-page__body">
        <div className={`mf-page__list ${detailSymbol ? 'mf-page__list--narrow' : ''}`}>
          {loading && !data ? (
            <div className="mf-page__loading">加载中...</div>
          ) : !sortedData || sortedData.length === 0 ? (
            <div className="mf-page__empty">暂无数据</div>
          ) : (
            <FlowTable
              data={sortedData}
              onSelect={fetchDetail}
              selectedSymbol={detailSymbol}
              onAdd={handleAddToWatchlist}
              onNavigate={(sym) => navigate(`/stock/${encodeURIComponent(sym)}`)}
            />
          )}
        </div>

        {detailSymbol && (
          <div className="mf-page__detail">
            <div className="mf-page__detail-header">
              <h3 className="mf-page__detail-title">
                {detail?.name || detailSymbol} 资金明细
              </h3>
              <button
                className="mf-page__detail-close"
                onClick={() => setDetailSymbol(null)}
              >
                ✕
              </button>
            </div>
            {detailLoading ? (
              <div className="mf-page__loading">加载中...</div>
            ) : detail ? (
              <FlowDetail detail={detail} />
            ) : (
              <div className="mf-page__empty">无法获取资金明细</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface FlowTableProps {
  data: MoneyFlowItem[];
  onSelect: (symbol: string) => void;
  selectedSymbol: string | null;
  onAdd: (symbol: string) => void;
  onNavigate: (symbol: string) => void;
}

function FlowTable({ data, onSelect, selectedSymbol, onAdd, onNavigate }: FlowTableProps) {
  return (
    <div className="mf-table">
      <div className="mf-table__head">
        <span className="mf-table__col mf-table__col--rank">#</span>
        <span className="mf-table__col mf-table__col--market">市场</span>
        <span className="mf-table__col mf-table__col--symbol">代码</span>
        <span className="mf-table__col mf-table__col--name">名称</span>
        <span className="mf-table__col mf-table__col--price">价格</span>
        <span className="mf-table__col mf-table__col--change">涨跌幅</span>
        <span className="mf-table__col mf-table__col--flow">净流入</span>
        <span className="mf-table__col mf-table__col--large">大额净流入</span>
        <span className="mf-table__col mf-table__col--vol">量比</span>
        <span className="mf-table__col mf-table__col--turnover">成交额</span>
        <span className="mf-table__col mf-table__col--action" />
      </div>
      {data.map((item, i) => {
        const isUp = item.change >= 0;
        const trend = isUp ? 'up' : 'down';
        const sign = isUp ? '+' : '';
        const flowPositive = item.netFlow >= 0;
        const largeFlowPositive = item.largeNetFlow >= 0;
        const selected = selectedSymbol === item.symbol;
        return (
          <div
            key={item.symbol}
            className={`mf-table__row ${selected ? 'mf-table__row--selected' : ''}`}
            onClick={() => onSelect(item.symbol)}
          >
            <span className="mf-table__col mf-table__col--rank">{i + 1}</span>
            <span className="mf-table__col mf-table__col--market">
              <span className={`mf-table__market-tag mf-table__market-tag--${marketCssKey(item.market)}`}>
                {item.market || '—'}
              </span>
            </span>
            <span
              className="mf-table__col mf-table__col--symbol"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(item.symbol);
              }}
            >
              {item.symbol}
            </span>
            <span className="mf-table__col mf-table__col--name" title={item.name}>
              {item.name}
            </span>
            <span className="mf-table__col mf-table__col--price">
              {item.price.toFixed(2)}
            </span>
            <span className={`mf-table__col mf-table__col--change mf-table__${trend}`}>
              {sign}{item.changePercent.toFixed(2)}%
            </span>
            <span
              className={`mf-table__col mf-table__col--flow ${flowPositive ? 'mf-table__inflow' : 'mf-table__outflow'}`}
            >
              {flowPositive ? '+' : ''}{formatTurnover(item.netFlow)}
            </span>
            <span
              className={`mf-table__col mf-table__col--large ${largeFlowPositive ? 'mf-table__inflow' : 'mf-table__outflow'}`}
            >
              {largeFlowPositive ? '+' : ''}{formatTurnover(item.largeNetFlow)}
            </span>
            <span
              className={`mf-table__col mf-table__col--vol ${item.volumeRatio >= 1.5 ? 'mf-table__hot' : ''}`}
            >
              {item.volumeRatio.toFixed(2)}
            </span>
            <span className="mf-table__col mf-table__col--turnover">
              {formatTurnover(item.turnover)}
            </span>
            <span className="mf-table__col mf-table__col--action">
              <button
                className="mf-table__add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(item.symbol);
                }}
                title="加入自选"
              >
                +
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FlowDetail({ detail }: { detail: MoneyFlowDetail }) {
  const { summary, largeBars } = detail;
  const netPositive = summary.netFlow >= 0;
  const largeNetPositive = summary.largeNetFlow >= 0;

  const flowSections = [
    {
      label: '大额资金',
      inflow: summary.largeInflow,
      outflow: summary.largeOutflow,
      net: summary.largeNetFlow,
    },
    {
      label: '中额资金',
      inflow: summary.mediumInflow,
      outflow: summary.mediumOutflow,
      net: summary.mediumNetFlow,
    },
    {
      label: '小额资金',
      inflow: summary.smallInflow,
      outflow: summary.smallOutflow,
      net: summary.smallNetFlow,
    },
  ];

  return (
    <div className="mf-detail">
      <div className="mf-detail__summary">
        <div className="mf-detail__stat mf-detail__stat--main">
          <span className="mf-detail__stat-label">净流入</span>
          <span className={`mf-detail__stat-value ${netPositive ? 'mf-detail__inflow' : 'mf-detail__outflow'}`}>
            {netPositive ? '+' : ''}{formatTurnover(summary.netFlow)}
          </span>
        </div>
        <div className="mf-detail__stat">
          <span className="mf-detail__stat-label">大额净流入</span>
          <span className={`mf-detail__stat-value ${largeNetPositive ? 'mf-detail__inflow' : 'mf-detail__outflow'}`}>
            {largeNetPositive ? '+' : ''}{formatTurnover(summary.largeNetFlow)}
          </span>
        </div>
        <div className="mf-detail__stat">
          <span className="mf-detail__stat-label">总流入</span>
          <span className="mf-detail__stat-value mf-detail__inflow">
            {formatTurnover(summary.totalInflow)}
          </span>
        </div>
        <div className="mf-detail__stat">
          <span className="mf-detail__stat-label">总流出</span>
          <span className="mf-detail__stat-value mf-detail__outflow">
            {formatTurnover(summary.totalOutflow)}
          </span>
        </div>
      </div>

      <div className="mf-detail__breakdown">
        <h4 className="mf-detail__section-title">资金分类</h4>
        {flowSections.map((sec) => {
          const total = summary.totalInflow + summary.totalOutflow;
          const pct = total > 0 ? (sec.inflow / total) * 100 : 0;
          const pctOut = total > 0 ? (sec.outflow / total) * 100 : 0;
          return (
            <div key={sec.label} className="mf-detail__flow-row">
              <span className="mf-detail__flow-label">{sec.label}</span>
              <div className="mf-detail__flow-bar">
                <div className="mf-detail__flow-bar-in" style={{ width: `${pct}%` }} />
                <div className="mf-detail__flow-bar-out" style={{ width: `${pctOut}%` }} />
              </div>
              <div className="mf-detail__flow-values">
                <span className="mf-detail__inflow">{formatTurnover(sec.inflow)}</span>
                <span className="mf-detail__flow-sep">/</span>
                <span className="mf-detail__outflow">{formatTurnover(sec.outflow)}</span>
                <span
                  className={`mf-detail__flow-net ${sec.net >= 0 ? 'mf-detail__inflow' : 'mf-detail__outflow'}`}
                >
                  ({sec.net >= 0 ? '+' : ''}{formatTurnover(sec.net)})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {largeBars.length > 0 && (
        <div className="mf-detail__large-orders">
          <h4 className="mf-detail__section-title">
            大额成交记录
            <span className="mf-detail__section-count">({largeBars.length}笔)</span>
          </h4>
          <div className="mf-detail__orders-list">
            {largeBars.slice(0, 20).map((bar, i) => (
              <div
                key={i}
                className={`mf-detail__order mf-detail__order--${bar.direction}`}
              >
                <span className="mf-detail__order-time">
                  {new Date(bar.time).toLocaleTimeString('zh-CN', { hour12: false })}
                </span>
                <span className={`mf-detail__order-dir ${bar.direction === 'buy' ? 'mf-detail__inflow' : 'mf-detail__outflow'}`}>
                  {bar.direction === 'buy' ? '买入' : '卖出'}
                </span>
                <span className="mf-detail__order-price">{bar.price.toFixed(2)}</span>
                <span className="mf-detail__order-vol">{formatVolume(bar.volume)}</span>
                <span className="mf-detail__order-amt">{formatTurnover(bar.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

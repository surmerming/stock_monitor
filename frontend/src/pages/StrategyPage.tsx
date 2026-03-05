import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlist } from '../hooks/useWatchlist';
import { formatVolume, formatMarketCap } from '../utils/format';
import './StrategyPage.less';

interface ScreenerFilter {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: number;
  value2?: number;
}

interface Strategy {
  id?: number;
  name: string;
  market: string;
  filters: ScreenerFilter[];
  sortField: string;
  sortType: string;
}

interface ResultItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  peTTM: number | null;
  pbRatio: number | null;
  psRatio: number | null;
  dividendYield: number | null;
  avgVolume3m: number | null;
  turnoverRate: number | null;
  week52High: number | null;
  week52Low: number | null;
  exchange: string;
  market: string;
}

interface IndicatorDef {
  key: string;
  label: string;
  unit: string;
}

interface CategoryDef {
  key: string;
  label: string;
  indicators: IndicatorDef[];
}

const INDICATOR_CATEGORIES: CategoryDef[] = [
  {
    key: 'market',
    label: '行情指标',
    indicators: [
      { key: 'price', label: '最新价', unit: '' },
      { key: 'changePercent', label: '涨跌幅', unit: '%' },
      { key: 'amplitude', label: '振幅', unit: '%' },
      { key: 'turnoverRate', label: '换手率', unit: '%' },
      { key: 'volumeRatio', label: '量比', unit: '' },
      { key: 'volume', label: '成交量', unit: '' },
      { key: 'turnover', label: '成交额', unit: '' },
    ],
  },
  {
    key: 'valuation',
    label: '估值指标',
    indicators: [
      { key: 'peTTM', label: '市盈率(TTM)', unit: '倍' },
      { key: 'pbRatio', label: '市净率', unit: '倍' },
      { key: 'psRatio', label: '市销率', unit: '倍' },
      { key: 'marketCap', label: '总市值', unit: '' },
      { key: 'peg', label: 'PEG', unit: '' },
    ],
  },
  {
    key: 'dividend',
    label: '分红指标',
    indicators: [
      { key: 'dividendYield', label: '股息率(TTM)', unit: '%' },
      { key: 'trailingDividendYield', label: '近12月股息率', unit: '%' },
    ],
  },
  {
    key: 'financial',
    label: '财务指标',
    indicators: [
      { key: 'epsTTM', label: '每股收益(TTM)', unit: '' },
      { key: 'revenueTTM', label: '营收(TTM)', unit: '' },
    ],
  },
  {
    key: 'technical',
    label: '技术指标',
    indicators: [
      { key: 'fiftyTwoWeekHighPct', label: '距52周高点', unit: '%' },
      { key: 'fiftyTwoWeekLowPct', label: '距52周低点', unit: '%' },
      { key: 'avgVolume3m', label: '3月日均量', unit: '' },
      { key: 'beta', label: 'Beta', unit: '' },
    ],
  },
  {
    key: 'ta_ma',
    label: 'MA 均线',
    indicators: [
      { key: 'ma5Bias', label: '价格偏离MA5', unit: '%' },
      { key: 'ma10Bias', label: '价格偏离MA10', unit: '%' },
      { key: 'ma20Bias', label: '价格偏离MA20', unit: '%' },
      { key: 'ma60Bias', label: '价格偏离MA60', unit: '%' },
      { key: 'ma120Bias', label: '价格偏离MA120', unit: '%' },
      { key: 'ma250Bias', label: '价格偏离MA250', unit: '%' },
    ],
  },
  {
    key: 'ta_ema',
    label: 'EMA 指数均线',
    indicators: [
      { key: 'ema12Bias', label: '价格偏离EMA12', unit: '%' },
      { key: 'ema26Bias', label: '价格偏离EMA26', unit: '%' },
    ],
  },
  {
    key: 'ta_boll',
    label: 'BOLL 布林带',
    indicators: [
      { key: 'bollPosition', label: '布林位置(0下轨~100上轨)', unit: '%' },
      { key: 'bollWidth', label: '布林带宽', unit: '%' },
    ],
  },
  {
    key: 'ta_sar',
    label: 'SAR 抛物线',
    indicators: [
      { key: 'sarBull', label: 'SAR方向(1=多头/0=空头)', unit: '' },
    ],
  },
  {
    key: 'ta_mavol',
    label: 'MAVOL 均量线',
    indicators: [
      { key: 'volMa5Ratio', label: '量比(vs 5日均量)', unit: '倍' },
      { key: 'volMa10Ratio', label: '量比(vs 10日均量)', unit: '倍' },
    ],
  },
  {
    key: 'ta_kdj',
    label: 'KDJ 随机指标',
    indicators: [
      { key: 'kdjK', label: 'K值', unit: '' },
      { key: 'kdjD', label: 'D值', unit: '' },
      { key: 'kdjJ', label: 'J值', unit: '' },
      { key: 'kdjGoldenCross', label: 'KDJ金叉(1=是)', unit: '' },
      { key: 'kdjDeathCross', label: 'KDJ死叉(1=是)', unit: '' },
    ],
  },
  {
    key: 'ta_macd',
    label: 'MACD 指标',
    indicators: [
      { key: 'macdDif', label: 'DIF', unit: '' },
      { key: 'macdDea', label: 'DEA', unit: '' },
      { key: 'macdHist', label: 'MACD柱', unit: '' },
      { key: 'macdGoldenCross', label: 'MACD金叉(1=是)', unit: '' },
      { key: 'macdDeathCross', label: 'MACD死叉(1=是)', unit: '' },
    ],
  },
  {
    key: 'ta_arbr',
    label: 'ARBR 情绪指标',
    indicators: [
      { key: 'ar', label: 'AR值', unit: '' },
      { key: 'br', label: 'BR值', unit: '' },
    ],
  },
  {
    key: 'ta_cr',
    label: 'CR 能量指标',
    indicators: [
      { key: 'cr', label: 'CR值', unit: '' },
    ],
  },
];

const ALL_INDICATORS = INDICATOR_CATEGORIES.flatMap((c) => c.indicators);

const OPERATORS: { key: ScreenerFilter['operator']; label: string }[] = [
  { key: 'gt', label: '大于' },
  { key: 'gte', label: '≥' },
  { key: 'lt', label: '小于' },
  { key: 'lte', label: '≤' },
  { key: 'between', label: '介于' },
];

const MARKETS = ['全部', '美股', '港股'];

const SORT_OPTIONS = [
  { key: 'marketCap', label: '市值' },
  { key: 'changePercent', label: '涨跌幅' },
  { key: 'volume', label: '成交量' },
  { key: 'peTTM', label: '市盈率' },
  { key: 'dividendYield', label: '股息率' },
  { key: 'price', label: '价格' },
  { key: 'pbRatio', label: '市净率' },
  { key: 'ma20Bias', label: 'MA20偏离' },
  { key: 'kdjK', label: 'KDJ-K值' },
  { key: 'macdHist', label: 'MACD柱' },
  { key: 'bollPosition', label: '布林位置' },
  { key: 'ar', label: 'AR值' },
  { key: 'cr', label: 'CR值' },
];

const PRESET_STRATEGIES: Strategy[] = [
  {
    name: '高股息蓝筹',
    market: '全部',
    filters: [
      { field: 'dividendYield', operator: 'gte', value: 3 },
      { field: 'marketCap', operator: 'gte', value: 10_000_000_000 },
    ],
    sortField: 'dividendYield',
    sortType: 'DESC',
  },
  {
    name: '低估值价值股',
    market: '全部',
    filters: [
      { field: 'peTTM', operator: 'between', value: 0, value2: 15 },
      { field: 'pbRatio', operator: 'lt', value: 2 },
      { field: 'marketCap', operator: 'gte', value: 1_000_000_000 },
    ],
    sortField: 'peTTM',
    sortType: 'ASC',
  },
  {
    name: '强势放量突破',
    market: '全部',
    filters: [
      { field: 'changePercent', operator: 'gte', value: 3 },
      { field: 'volume', operator: 'gte', value: 1_000_000 },
    ],
    sortField: 'changePercent',
    sortType: 'DESC',
  },
  {
    name: '大盘蓝筹股',
    market: '全部',
    filters: [{ field: 'marketCap', operator: 'gte', value: 100_000_000_000 }],
    sortField: 'marketCap',
    sortType: 'DESC',
  },
  {
    name: '超跌反弹机会',
    market: '全部',
    filters: [
      { field: 'fiftyTwoWeekHighPct', operator: 'lte', value: -30 },
      { field: 'changePercent', operator: 'gte', value: 1 },
    ],
    sortField: 'changePercent',
    sortType: 'DESC',
  },
  {
    name: '低PB高股息',
    market: '全部',
    filters: [
      { field: 'pbRatio', operator: 'between', value: 0, value2: 1.5 },
      { field: 'dividendYield', operator: 'gte', value: 2 },
    ],
    sortField: 'dividendYield',
    sortType: 'DESC',
  },
  {
    name: 'MACD金叉放量',
    market: '全部',
    filters: [
      { field: 'macdGoldenCross', operator: 'gte', value: 1 },
      { field: 'volMa5Ratio', operator: 'gte', value: 1.5 },
    ],
    sortField: 'changePercent',
    sortType: 'DESC',
  },
  {
    name: 'KDJ超卖区',
    market: '全部',
    filters: [
      { field: 'kdjJ', operator: 'lte', value: 0 },
      { field: 'kdjK', operator: 'lte', value: 20 },
    ],
    sortField: 'kdjJ',
    sortType: 'ASC',
  },
  {
    name: '布林带下轨反弹',
    market: '全部',
    filters: [
      { field: 'bollPosition', operator: 'lte', value: 10 },
      { field: 'changePercent', operator: 'gte', value: 0 },
    ],
    sortField: 'changePercent',
    sortType: 'DESC',
  },
  {
    name: '均线多头排列',
    market: '全部',
    filters: [
      { field: 'ma5Bias', operator: 'gte', value: 0 },
      { field: 'ma10Bias', operator: 'gte', value: 0 },
      { field: 'ma20Bias', operator: 'gte', value: 0 },
      { field: 'ma60Bias', operator: 'gte', value: 0 },
    ],
    sortField: 'ma5Bias',
    sortType: 'DESC',
  },
];

const PAGE_SIZE = 50;

export default function StrategyPage() {
  const [market, setMarket] = useState('全部');
  const [filters, setFilters] = useState<ScreenerFilter[]>([]);
  const [sortField, setSortField] = useState('marketCap');
  const [sortType, setSortType] = useState<'ASC' | 'DESC'>('DESC');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([]);
  const [strategyName, setStrategyName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(
      INDICATOR_CATEGORIES.filter((c) => !c.key.startsWith('ta_')).map((c) => c.key),
    ),
  );
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const { addSymbols } = useWatchlist();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/screener/strategies')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSavedStrategies(data);
      })
      .catch(() => {});
  }, []);

  const executeScan = useCallback(
    async (pageOffset = 0) => {
      setLoading(true);
      try {
        const body = {
          market,
          filters,
          sortField,
          sortType,
          offset: pageOffset * PAGE_SIZE,
          size: PAGE_SIZE,
        };
        const res = await fetch('/api/screener/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setResults(data.items || []);
        setTotal(data.total || 0);
        setPage(pageOffset);
      } catch {
        // keep stale
      } finally {
        setLoading(false);
      }
    },
    [market, filters, sortField, sortType],
  );

  const addFilter = (field: string) => {
    if (filters.some((f) => f.field === field)) return;
    setFilters([...filters, { field, operator: 'gte', value: 0 }]);
  };

  const updateFilter = (index: number, patch: Partial<ScreenerFilter>) => {
    setFilters(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearFilters = () => {
    setFilters([]);
    setActivePreset(null);
    setResults([]);
    setTotal(0);
  };

  const loadStrategy = (strategy: Strategy, presetName?: string) => {
    setMarket(strategy.market);
    setFilters([...strategy.filters]);
    setSortField(strategy.sortField);
    setSortType(strategy.sortType as 'ASC' | 'DESC');
    setActivePreset(presetName ?? strategy.name);
  };

  const saveStrategy = async () => {
    if (!strategyName.trim()) return;
    try {
      const body = { name: strategyName.trim(), market, filters, sortField, sortType };
      const res = await fetch('/api/screener/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const saved = await res.json();
      setSavedStrategies([saved, ...savedStrategies]);
      setShowSaveDialog(false);
      setStrategyName('');
    } catch {
      // ignore
    }
  };

  const deleteStrategy = async (id: number) => {
    try {
      await fetch(`/api/screener/strategies/${id}`, { method: 'DELETE' });
      setSavedStrategies(savedStrategies.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  };

  const toggleCategory = (key: string) => {
    const next = new Set(expandedCategories);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedCategories(next);
  };

  const handleAdd = async (symbol: string) => {
    try {
      await addSymbols([symbol]);
    } catch {}
  };

  const getIndicatorLabel = (field: string) =>
    ALL_INDICATORS.find((i) => i.key === field)?.label || field;

  const getAvailableIndicators = (categoryKey: string) => {
    const cat = INDICATOR_CATEGORIES.find((c) => c.key === categoryKey);
    if (!cat) return [];
    return cat.indicators.filter((i) => !filters.some((f) => f.field === i.key));
  };

  return (
    <div className="strategy-page">
      <div className="strategy-page__header">
        <h2 className="strategy-page__title">策略选股</h2>
        <div className="strategy-page__actions">
          {filters.length > 0 && (
            <button className="strategy-page__btn" onClick={clearFilters}>
              清空条件
            </button>
          )}
          <button
            className="strategy-page__btn"
            onClick={() => setShowSaveDialog(true)}
            disabled={filters.length === 0}
          >
            保存策略
          </button>
          <button
            className="strategy-page__btn strategy-page__btn--exec"
            onClick={() => executeScan(0)}
            disabled={loading || filters.length === 0}
          >
            {loading ? '筛选中...' : '执行选股'}
          </button>
          {filters.some((f) =>
            [
              'ma5Bias','ma10Bias','ma20Bias','ma60Bias','ma120Bias','ma250Bias',
              'ema12Bias','ema26Bias','bollPosition','bollWidth','sarBull',
              'volMa5Ratio','volMa10Ratio','kdjK','kdjD','kdjJ',
              'kdjGoldenCross','kdjDeathCross','macdDif','macdDea','macdHist',
              'macdGoldenCross','macdDeathCross','ar','br','cr',
            ].includes(f.field),
          ) && (
            <span className="strategy-page__tech-hint">
              含技术指标，需获取历史数据，耗时较长
            </span>
          )}
        </div>
      </div>

      <div className="strategy-page__body">
        {/* Sidebar */}
        <aside className="strategy-page__sidebar">
          <div className="strategy-sidebar">
            <div className="strategy-sidebar__section">
              <h4 className="strategy-sidebar__heading">预设策略</h4>
              {PRESET_STRATEGIES.map((s) => (
                <button
                  key={s.name}
                  className={`strategy-sidebar__item ${activePreset === s.name ? 'strategy-sidebar__item--active' : ''}`}
                  onClick={() => loadStrategy(s, s.name)}
                >
                  {s.name}
                </button>
              ))}
            </div>
            {savedStrategies.length > 0 && (
              <div className="strategy-sidebar__section">
                <h4 className="strategy-sidebar__heading">我的策略</h4>
                {savedStrategies.map((s) => (
                  <div key={s.id} className="strategy-sidebar__item-row">
                    <button
                      className={`strategy-sidebar__item ${activePreset === s.name ? 'strategy-sidebar__item--active' : ''}`}
                      onClick={() => loadStrategy(s)}
                    >
                      {s.name}
                    </button>
                    <button
                      className="strategy-sidebar__delete"
                      onClick={() => s.id && deleteStrategy(s.id)}
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <div className="strategy-page__main">
          {/* Market selector */}
          <div className="strategy-filter__market">
            <span className="strategy-filter__market-label">市场：</span>
            {MARKETS.map((m) => (
              <button
                key={m}
                className={`strategy-filter__market-btn ${market === m ? 'strategy-filter__market-btn--active' : ''}`}
                onClick={() => setMarket(m)}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Filter builder */}
          <div className="strategy-filter">
            {INDICATOR_CATEGORIES.map((cat) => {
              const isExpanded = expandedCategories.has(cat.key);
              const catFilters = filters
                .map((f, i) => ({ ...f, _index: i }))
                .filter((f) => cat.indicators.some((ind) => ind.key === f.field));
              const available = getAvailableIndicators(cat.key);

              return (
                <div key={cat.key} className="strategy-filter__category">
                  <div
                    className="strategy-filter__category-header"
                    onClick={() => toggleCategory(cat.key)}
                  >
                    <span
                      className={`strategy-filter__arrow ${isExpanded ? 'strategy-filter__arrow--expanded' : ''}`}
                    >
                      ▶
                    </span>
                    <span className="strategy-filter__category-label">{cat.label}</span>
                    {catFilters.length > 0 && (
                      <span className="strategy-filter__category-count">
                        {catFilters.length}
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="strategy-filter__category-body">
                      {catFilters.map((f) => (
                        <FilterRow
                          key={f.field}
                          filter={f}
                          label={getIndicatorLabel(f.field)}
                          onUpdate={(patch) => updateFilter(f._index, patch)}
                          onRemove={() => removeFilter(f._index)}
                        />
                      ))}
                      {available.length > 0 && (
                        <div className="strategy-filter__add">
                          <select
                            className="strategy-filter__add-select"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) addFilter(e.target.value);
                            }}
                          >
                            <option value="">+ 添加指标</option>
                            {available.map((ind) => (
                              <option key={ind.key} value={ind.key}>
                                {ind.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sort */}
          <div className="strategy-sort">
            <span className="strategy-sort__label">排序：</span>
            <select
              className="strategy-sort__select"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              className="strategy-sort__dir"
              onClick={() => setSortType((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))}
            >
              {sortType === 'DESC' ? '↓ 降序' : '↑ 升序'}
            </button>
            {filters.length > 0 && (
              <span className="strategy-sort__filter-count">
                已设置 {filters.length} 个筛选条件
              </span>
            )}
          </div>

          {/* Results */}
          <div className="strategy-results">
            {total > 0 && (
              <div className="strategy-results__meta">
                共筛选出 <strong>{total}</strong> 只股票
                {total > PAGE_SIZE && (
                  <span className="strategy-results__page-info">
                    （第 {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} 条）
                  </span>
                )}
              </div>
            )}

            {loading && results.length === 0 && (
              <div className="strategy-results__loading">筛选中，请稍候...</div>
            )}

            {!loading && results.length === 0 && total === 0 && filters.length > 0 && (
              <div className="strategy-results__empty">
                点击 "执行选股" 开始筛选
              </div>
            )}

            {!loading && results.length === 0 && filters.length === 0 && (
              <div className="strategy-results__empty">
                从左侧选择预设策略，或自定义筛选条件
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="strategy-table">
                  <div className="strategy-table__head">
                    <span className="strategy-table__col strategy-table__col--rank">#</span>
                    <span className="strategy-table__col strategy-table__col--symbol">代码</span>
                    <span className="strategy-table__col strategy-table__col--name">名称</span>
                    <span className="strategy-table__col strategy-table__col--price">价格</span>
                    <span className="strategy-table__col strategy-table__col--change">涨跌幅</span>
                    <span className="strategy-table__col strategy-table__col--volume">成交量</span>
                    <span className="strategy-table__col strategy-table__col--cap">市值</span>
                    <span className="strategy-table__col strategy-table__col--pe">PE(TTM)</span>
                    <span className="strategy-table__col strategy-table__col--pb">PB</span>
                    <span className="strategy-table__col strategy-table__col--div">股息率</span>
                    <span className="strategy-table__col strategy-table__col--action" />
                  </div>
                  {results.map((item, i) => {
                    const isUp = item.change >= 0;
                    const trend = isUp ? 'up' : 'down';
                    const sign = isUp ? '+' : '';
                    return (
                      <div
                        key={item.symbol}
                        className={`strategy-table__row strategy-table__row--${trend}`}
                        onClick={() =>
                          navigate(`/stock/${encodeURIComponent(item.symbol)}`)
                        }
                      >
                        <span className="strategy-table__col strategy-table__col--rank">
                          {page * PAGE_SIZE + i + 1}
                        </span>
                        <span className="strategy-table__col strategy-table__col--symbol">
                          {item.symbol}
                        </span>
                        <span
                          className="strategy-table__col strategy-table__col--name"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span className="strategy-table__col strategy-table__col--price">
                          {item.price.toFixed(2)}
                        </span>
                        <span
                          className={`strategy-table__col strategy-table__col--change strategy-table__${trend}`}
                        >
                          {sign}
                          {item.changePercent.toFixed(2)}%
                        </span>
                        <span className="strategy-table__col strategy-table__col--volume">
                          {formatVolume(item.volume)}
                        </span>
                        <span className="strategy-table__col strategy-table__col--cap">
                          {formatMarketCap(item.marketCap)}
                        </span>
                        <span className="strategy-table__col strategy-table__col--pe">
                          {item.peTTM != null ? item.peTTM.toFixed(1) : '—'}
                        </span>
                        <span className="strategy-table__col strategy-table__col--pb">
                          {item.pbRatio != null ? item.pbRatio.toFixed(2) : '—'}
                        </span>
                        <span className="strategy-table__col strategy-table__col--div">
                          {item.dividendYield != null
                            ? `${item.dividendYield.toFixed(2)}%`
                            : '—'}
                        </span>
                        <span className="strategy-table__col strategy-table__col--action">
                          <button
                            className="strategy-table__add-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdd(item.symbol);
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

                {total > PAGE_SIZE && (
                  <div className="strategy-pagination">
                    <button
                      className="strategy-pagination__btn"
                      disabled={page === 0 || loading}
                      onClick={() => executeScan(page - 1)}
                    >
                      上一页
                    </button>
                    <span className="strategy-pagination__info">
                      {page + 1} / {Math.ceil(total / PAGE_SIZE)}
                    </span>
                    <button
                      className="strategy-pagination__btn"
                      disabled={(page + 1) * PAGE_SIZE >= total || loading}
                      onClick={() => executeScan(page + 1)}
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="strategy-dialog__overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="strategy-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="strategy-dialog__title">保存策略</h3>
            <input
              className="strategy-dialog__input"
              placeholder="请输入策略名称"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveStrategy()}
            />
            <div className="strategy-dialog__footer">
              <button
                className="strategy-dialog__btn strategy-dialog__btn--cancel"
                onClick={() => setShowSaveDialog(false)}
              >
                取消
              </button>
              <button
                className="strategy-dialog__btn strategy-dialog__btn--save"
                onClick={saveStrategy}
                disabled={!strategyName.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRow({
  filter,
  label,
  onUpdate,
  onRemove,
}: {
  filter: ScreenerFilter;
  label: string;
  onUpdate: (patch: Partial<ScreenerFilter>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="filter-row">
      <span className="filter-row__label">{label}</span>
      <select
        className="filter-row__operator"
        value={filter.operator}
        onChange={(e) =>
          onUpdate({ operator: e.target.value as ScreenerFilter['operator'] })
        }
      >
        {OPERATORS.map((op) => (
          <option key={op.key} value={op.key}>
            {op.label}
          </option>
        ))}
      </select>
      <input
        className="filter-row__value"
        type="number"
        value={filter.value}
        onChange={(e) => onUpdate({ value: +e.target.value })}
      />
      {filter.operator === 'between' && (
        <>
          <span className="filter-row__sep">~</span>
          <input
            className="filter-row__value"
            type="number"
            value={filter.value2 ?? 0}
            onChange={(e) => onUpdate({ value2: +e.target.value })}
          />
        </>
      )}
      <button className="filter-row__remove" onClick={onRemove} title="移除">
        ×
      </button>
    </div>
  );
}

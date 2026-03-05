import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlist } from '../../hooks/useWatchlist';
import { formatVolume, formatMarketCap } from '../../utils/format';
import { apiFetch } from '../../utils/apiFetch';
import {
  INDICATOR_CATEGORIES,
  ALL_INDICATORS,
  OPERATORS,
  SCREENER_MARKETS,
  SCREENER_SORT_OPTIONS,
  PRESET_STRATEGIES,
  PAGE_SIZE,
  type ScreenerFilter,
  type Strategy,
  type IndicatorDef,
  type CategoryDef,
} from '../../configs/screener';
import './style.less';

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
    new Set(INDICATOR_CATEGORIES.filter((c) => !c.key.startsWith('ta_')).map((c) => c.key)),
  );
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const { addSymbols } = useWatchlist();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/screener/strategies')
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
        const res = await apiFetch('/api/screener/scan', {
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
      const res = await apiFetch('/api/screener/strategies', {
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
      await apiFetch(`/api/screener/strategies/${id}`, { method: 'DELETE' });
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
    } catch {
      /* ignore */
    }
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
              'ma5Bias',
              'ma10Bias',
              'ma20Bias',
              'ma60Bias',
              'ma120Bias',
              'ma250Bias',
              'ema12Bias',
              'ema26Bias',
              'bollPosition',
              'bollWidth',
              'sarBull',
              'volMa5Ratio',
              'volMa10Ratio',
              'kdjK',
              'kdjD',
              'kdjJ',
              'kdjGoldenCross',
              'kdjDeathCross',
              'macdDif',
              'macdDea',
              'macdHist',
              'macdGoldenCross',
              'macdDeathCross',
              'ar',
              'br',
              'cr',
            ].includes(f.field),
          ) && (
            <span className="strategy-page__tech-hint">含技术指标，需获取历史数据，耗时较长</span>
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
            {SCREENER_MARKETS.map((m) => (
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
                      <span className="strategy-filter__category-count">{catFilters.length}</span>
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
              {SCREENER_SORT_OPTIONS.map((opt) => (
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
              <div className="strategy-results__empty">点击 "执行选股" 开始筛选</div>
            )}

            {!loading && results.length === 0 && filters.length === 0 && (
              <div className="strategy-results__empty">从左侧选择预设策略，或自定义筛选条件</div>
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
                        onClick={() => navigate(`/stock/${encodeURIComponent(item.symbol)}`)}
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
                          {item.dividendYield != null ? `${item.dividendYield.toFixed(2)}%` : '—'}
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
        onChange={(e) => onUpdate({ operator: e.target.value as ScreenerFilter['operator'] })}
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

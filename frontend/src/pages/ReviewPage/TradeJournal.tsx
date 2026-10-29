import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { formatTurnover, formatPrice, formatDateTime } from '../../utils/format';
import { useQuoteSSE } from '../../hooks/useQuoteSSE';

function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface Trade {
  id: number;
  symbol: string;
  stockName: string;
  direction: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  tradeTime: string;
  notes: string;
  takeProfit: number | null;
  stopLoss: number | null;
}

interface HoldingSummary {
  symbol: string;
  stockName: string;
  remainingQuantity: number;
  averageCost: number;
  totalCost: number;
}

interface BuyLot {
  id: number;
  symbol: string;
  stockName: string;
  price: number;
  quantity: number;
  remaining: number;
  tradeTime: string;
  takeProfit: number | null;
  stopLoss: number | null;
  notes: string;
}

interface TradeStats {
  totalTrades: number;
  winRate: number;
  avgPnlPercent: number;
  totalPnl: number;
  maxWin: number;
  maxLoss: number;
}

interface HoldingSummary {
  symbol: string;
  stockName: string;
  remainingQuantity: number;
  averageCost: number;
  totalCost: number;
}

interface TradeFilter {
  keyword: string;
  startDate: string;
  endDate: string;
}

export default function TradeJournal() {
  const { quotes } = useQuoteSSE();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [holdings, setHoldings] = useState<HoldingSummary[]>([]);
  const [showHoldingsModal, setShowHoldingsModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<HoldingSummary | null>(null);
  const [lots, setLots] = useState<BuyLot[]>([]);
  const [symbolTrades, setSymbolTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    stockName: '',
    symbol: '',
    direction: 'BUY' as 'BUY' | 'SELL',
    price: '',
    quantity: '',
    tradeTime: formatLocalDateTime(new Date()),
    notes: '',
    takeProfit: '',
    stopLoss: '',
  });
  const today = new Date();
  const currentYear = today.getFullYear();
  const [filter, setFilter] = useState<TradeFilter>({
    keyword: '',
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
  });

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.keyword) params.set('keyword', filter.keyword);
      if (filter.startDate) params.set('startDate', filter.startDate);
      if (filter.endDate) params.set('endDate', filter.endDate);

      const queryString = params.toString();
      const [tradesRes, statsRes, holdingsRes] = await Promise.all([
        apiFetch(`/api/trades${queryString ? '?' + queryString : ''}`),
        apiFetch(`/api/trades/stats${queryString ? '?' + queryString : ''}`),
        apiFetch(`/api/trades/holdings${filter.keyword ? '?keyword=' + encodeURIComponent(filter.keyword) : ''}`),
      ]);
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTrades(data.items || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (holdingsRes.ok) {
        setHoldings(await holdingsRes.json());
      }
    } catch {
      // API may not exist yet
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!form.symbol || !form.price || !form.quantity) return;

    // 买入时止盈止损必填
    if (form.direction === 'BUY') {
      if (!form.takeProfit || !form.stopLoss) {
        alert('买入时必须填写止盈价和止损价');
        return;
      }
      const price = parseFloat(form.price);
      const tp = parseFloat(form.takeProfit);
      const sl = parseFloat(form.stopLoss);
      if (tp <= price) {
        alert('止盈价必须大于买入价');
        return;
      }
      if (sl >= price) {
        alert('止损价必须小于买入价');
        return;
      }
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/trades/${editingId}` : '/api/trades';
      const body: any = {
        stockName: form.stockName,
        symbol: form.symbol.toUpperCase(),
        direction: form.direction,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        tradeTime: form.tradeTime,
        notes: form.notes,
      };
      if (form.direction === 'BUY') {
        body.takeProfit = parseFloat(form.takeProfit);
        body.stopLoss = parseFloat(form.stopLoss);
      } else {
        body.takeProfit = null;
        body.stopLoss = null;
      }

      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || '保存失败');
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setForm({
        stockName: '',
        symbol: '',
        direction: 'BUY',
        price: '',
        quantity: '',
        tradeTime: formatLocalDateTime(new Date()),
        notes: '',
        takeProfit: '',
        stopLoss: '',
      });
      fetchTrades();
    } catch {
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/trades/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTrades();
    } catch {
      // handle error
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditingId(trade.id);
    const fmt = (v: number | string | null) => {
      if (v == null) return '';
      const n = typeof v === 'string' ? parseFloat(v) : v;
      return n.toFixed(3);
    };
    setForm({
      stockName: trade.stockName || '',
      symbol: trade.symbol,
      direction: trade.direction,
      price: fmt(trade.price),
      quantity: String(trade.quantity),
      tradeTime: formatLocalDateTime(new Date(trade.tradeTime)),
      notes: trade.notes,
      takeProfit: fmt(trade.takeProfit),
      stopLoss: fmt(trade.stopLoss),
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      stockName: '',
      symbol: '',
      direction: 'BUY',
      price: '',
      quantity: '',
      tradeTime: formatLocalDateTime(new Date()),
      notes: '',
      takeProfit: '',
      stopLoss: '',
    });
    setShowForm(false);
  };

  const handleFilterChange = (key: keyof TradeFilter, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilter = () => {
    setFilter({
      keyword: '',
      startDate: '',
      endDate: '',
    });
  };

  const openHoldingDetail = async (h: HoldingSummary) => {
    setSelectedHolding(h);
    setLots([]);
    setSymbolTrades([]);
    const [lotsRes, tradesRes] = await Promise.all([
      apiFetch(`/api/trades/lots?symbol=${encodeURIComponent(h.symbol)}`),
      apiFetch(`/api/trades?keyword=${encodeURIComponent(h.symbol)}`),
    ]);
    if (lotsRes.ok) {
      const data = await lotsRes.json();
      setLots(data.lots || []);
    }
    if (tradesRes.ok) {
      const data = await tradesRes.json();
      setSymbolTrades(data.items || []);
    }
  };

  return (
    <div className="rv-journal">
      <div className="rv-journal__header">
        <h3 className="rv-section-title">交易日志</h3>
        <div className="rv-journal__header-actions">
          <button
            className="rv-btn rv-btn--ghost rv-btn--with-badge"
            onClick={() => setShowHoldingsModal(true)}
          >
            我的持仓
            {holdings.length > 0 && (
              <span className="rv-btn__badge">{holdings.length}</span>
            )}
          </button>
          <button
            className="rv-btn rv-btn--primary"
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
          >
            {showForm ? '取消' : '+ 记录交易'}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && stats.totalTrades > 0 && (
        <div className="rv-journal__stats">
          <div className="rv-journal__stat">
            <span className="rv-journal__stat-label">总交易</span>
            <span className="rv-journal__stat-val">{stats.totalTrades}</span>
          </div>
          <div className="rv-journal__stat">
            <span className="rv-journal__stat-label">胜率</span>
            <span className="rv-journal__stat-val">{(stats.winRate * 100).toFixed(1)}%</span>
          </div>
          <div className="rv-journal__stat">
            <span className="rv-journal__stat-label">总盈亏</span>
            <span className={`rv-journal__stat-val ${stats.totalPnl >= 0 ? 'up' : 'down'}`}>
              {formatTurnover(stats.totalPnl)}
            </span>
          </div>
          <div className="rv-journal__stat">
            <span className="rv-journal__stat-label">平均收益</span>
            <span className="rv-journal__stat-val">{stats.avgPnlPercent.toFixed(2)}%</span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rv-journal__filter">
        <div className="rv-journal__filter-row">
          <input
            className="rv-input"
            placeholder="搜索股票名称/代码"
            value={filter.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTrades()}
          />
          <span className="rv-journal__filter-separator">—</span>
          <input
            className="rv-input"
            type="date"
            value={filter.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
          <span className="rv-journal__filter-separator">至</span>
          <input
            className="rv-input"
            type="date"
            value={filter.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
          <button className="rv-btn rv-btn--sm rv-btn--primary" onClick={fetchTrades}>
            搜索
          </button>
          {(filter.keyword || filter.startDate || filter.endDate) && (
            <button className="rv-btn rv-btn--sm" onClick={clearFilter}>
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Add Trade Modal */}
      {showForm && (
        <div className="rv-modal" onClick={resetForm}>
          <div className="rv-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="rv-modal__header">
              <h4 className="rv-modal__title">{editingId ? '编辑交易记录' : '新建交易记录'}</h4>
              <button className="rv-modal__close" onClick={resetForm}>
                ×
              </button>
            </div>
            <div className="rv-journal__form">
              <div className="rv-journal__form-row">
                <input
                  className="rv-input"
                  placeholder="股票名称"
                  value={form.stockName}
                  onChange={(e) => setForm({ ...form, stockName: e.target.value })}
                />
                <input
                  className="rv-input"
                  placeholder="股票代码"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                />
                <select
                  className="rv-select"
                  value={form.direction}
                  onChange={(e) =>
                    setForm({ ...form, direction: e.target.value as 'BUY' | 'SELL' })
                  }
                >
                  <option value="BUY">买入</option>
                  <option value="SELL">卖出</option>
                </select>
              </div>
              <div className="rv-journal__form-row">
                <input
                  className="rv-input"
                  type="number"
                  placeholder="价格"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                <input
                  className="rv-input"
                  type="number"
                  placeholder="数量"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
                <input
                  className="rv-input"
                  type="datetime-local"
                  value={form.tradeTime}
                  onChange={(e) => setForm({ ...form, tradeTime: e.target.value })}
                />
              </div>
              {form.direction === 'BUY' && (
                <div className="rv-journal__form-row rv-journal__form-row--tp-sl">
                  <input
                    className="rv-input rv-input--tp"
                    type="number"
                    step="0.01"
                    placeholder="止盈价 *"
                    value={form.takeProfit}
                    onChange={(e) => setForm({ ...form, takeProfit: e.target.value })}
                  />
                  <input
                    className="rv-input rv-input--sl"
                    type="number"
                    step="0.01"
                    placeholder="止损价 *"
                    value={form.stopLoss}
                    onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
                  />
                  <span className="rv-journal__form-hint">买入必须填写止盈止损</span>
                </div>
              )}
              <textarea
                className="rv-textarea"
                rows={3}
                placeholder="备注（支持多行文本）"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="rv-journal__form-row">
                <button className="rv-btn rv-btn--primary" onClick={handleSubmit}>
                  保存
                </button>
                <button className="rv-btn" onClick={resetForm}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 我的持仓 Modal */}
      {showHoldingsModal && (
        <div className="rv-modal" onClick={() => setShowHoldingsModal(false)}>
          <div className="rv-modal__content rv-modal__content--lg" onClick={(e) => e.stopPropagation()}>
            <div className="rv-modal__header">
              <h4 className="rv-modal__title">
                我的持仓
                {filter.keyword && (
                  <span className="rv-modal__title-sub">（"{filter.keyword}" 匹配）</span>
                )}
              </h4>
              <button className="rv-modal__close" onClick={() => setShowHoldingsModal(false)}>
                ×
              </button>
            </div>
            <div className="rv-journal__holdings-body">
              {holdings.length === 0 ? (
                <div className="rv-empty">
                  {filter.keyword
                    ? `没有找到包含 "${filter.keyword}" 的持仓`
                    : '当前没有持仓，买入股票后会自动显示在这里'}
                </div>
              ) : (
                <>
                  <div className="rv-journal__holdings-summary">
                    <div className="rv-journal__holdings-sum-item">
                      <span className="rv-journal__holdings-sum-label">持仓个数</span>
                      <span className="rv-journal__holdings-sum-value">{holdings.length}</span>
                    </div>
                    <div className="rv-journal__holdings-sum-item">
                      <span className="rv-journal__holdings-sum-label">总市值</span>
                      <span className="rv-journal__holdings-sum-value">
                        {formatTurnover(
                          holdings.reduce((s, h) => {
                            const q = quotes[h.symbol.toUpperCase()];
                            const mv = q?.current_price != null
                              ? q.current_price * h.remainingQuantity
                              : h.totalCost; // 没取到实时价时 fallback 到成本
                            return s + mv;
                          }, 0),
                        )}
                      </span>
                    </div>
                    <div className="rv-journal__holdings-sum-item">
                      <span className="rv-journal__holdings-sum-label">总盈亏</span>
                      <span
                        className={`rv-journal__holdings-sum-value ${
                          holdings.reduce((s, h) => {
                            const q = quotes[h.symbol.toUpperCase()];
                            const mv = q?.current_price != null
                              ? q.current_price * h.remainingQuantity
                              : h.totalCost;
                            return s + (mv - h.totalCost);
                          }, 0) >= 0
                            ? 'up'
                            : 'down'
                        }`}
                      >
                        {formatTurnover(
                          holdings.reduce((s, h) => {
                            const q = quotes[h.symbol.toUpperCase()];
                            const mv = q?.current_price != null
                              ? q.current_price * h.remainingQuantity
                              : h.totalCost;
                            return s + (mv - h.totalCost);
                          }, 0),
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="rv-journal__holdings-table-wrap">
                    <table className="rv-table__el">
                      <thead>
                        <tr>
                          <th className="rv-table__th">股票</th>
                          <th className="rv-table__th">剩余股数</th>
                          <th className="rv-table__th">平均成本</th>
                          <th className="rv-table__th">现价</th>
                          <th className="rv-table__th">市值</th>
                          <th className="rv-table__th">盈亏</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((h) => {
                          const q = quotes[h.symbol.toUpperCase()];
                          const currentPrice = q?.current_price;
                          const marketValue =
                            currentPrice != null
                              ? currentPrice * h.remainingQuantity
                              : null;
                          const pnl = marketValue != null ? marketValue - h.totalCost : null;
                          return (
                            <tr
                              key={h.symbol}
                              className="rv-table__row rv-journal__holding-row"
                              onClick={() => openHoldingDetail(h)}
                            >
                              <td className="rv-table__td">
                                <div className="rv-table__stock-info">
                                  <span className="rv-table__stock-name">
                                    {h.stockName || h.symbol}
                                  </span>
                                  <span className="rv-table__stock-code">{h.symbol}</span>
                                </div>
                              </td>
                              <td className="rv-table__td rv-table__td--num">
                                {h.remainingQuantity.toLocaleString()}
                              </td>
                              <td className="rv-table__td rv-table__td--num">
                                {formatPrice(h.averageCost)}
                              </td>
                              <td className="rv-table__td rv-table__td--num">
                                {currentPrice != null ? formatPrice(currentPrice) : '-'}
                              </td>
                              <td className="rv-table__td rv-table__td--num">
                                {marketValue != null ? formatTurnover(marketValue) : '-'}
                              </td>
                              <td
                                className={`rv-table__td rv-table__td--num ${
                                  pnl != null
                                    ? pnl >= 0
                                      ? 'rv-table__val--up'
                                      : 'rv-table__val--down'
                                    : ''
                                }`}
                              >
                                {pnl != null
                                  ? `${pnl >= 0 ? '+' : ''}${formatTurnover(pnl)}`
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 持仓明细 Modal */}
      {selectedHolding && (
        <div className="rv-modal" onClick={() => setSelectedHolding(null)}>
          <div className="rv-modal__content rv-modal__content--xl" onClick={(e) => e.stopPropagation()}>
            <div className="rv-modal__header">
              <h4 className="rv-modal__title">
                <span
                  className="rv-modal__back"
                  onClick={() => setSelectedHolding(null)}
                  role="button"
                  aria-label="返回"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </span>
                {selectedHolding.stockName || selectedHolding.symbol}
                <span className="rv-modal__title-sub">{selectedHolding.symbol}</span>
              </h4>
              <button className="rv-modal__close" onClick={() => setSelectedHolding(null)}>
                ×
              </button>
            </div>
            <div className="rv-journal__holdings-body">
              {/* 买入批次 */}
              <div className="rv-journal__detail-section">
                <div className="rv-journal__detail-section-title">
                  未清仓买入批次
                  <span className="rv-journal__detail-section-sub">
                    共 {lots.length} 笔，合计剩余{' '}
                    {lots.reduce((s, l) => s + l.remaining, 0).toLocaleString()} 股
                  </span>
                </div>
                <div className="rv-journal__holdings-table-wrap">
                  <table className="rv-table__el">
                    <thead>
                      <tr>
                        <th className="rv-table__th">买入时间</th>
                        <th className="rv-table__th">买入价</th>
                        <th className="rv-table__th">买入数量</th>
                        <th className="rv-table__th">剩余数量</th>
                        <th className="rv-table__th">剩余金额</th>
                        <th className="rv-table__th">止盈价</th>
                        <th className="rv-table__th">止损价</th>
                        <th className="rv-table__th">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map((l) => (
                        <tr key={l.id} className="rv-table__row">
                          <td className="rv-table__td">{formatDateTime(l.tradeTime)}</td>
                          <td className="rv-table__td rv-table__td--num">{formatPrice(l.price)}</td>
                          <td className="rv-table__td rv-table__td--num">
                            {l.quantity.toLocaleString()}
                          </td>
                          <td className="rv-table__td rv-table__td--num">
                            {l.remaining.toLocaleString()}
                            {l.remaining < l.quantity && (
                              <span className="rv-journal__partial-tag">
                                （已卖出 {l.quantity - l.remaining}）
                              </span>
                            )}
                          </td>
                          <td className="rv-table__td rv-table__td--num">
                            {formatTurnover(l.price * l.remaining)}
                          </td>
                          <td className="rv-table__td rv-table__td--num">
                            {l.takeProfit != null ? formatPrice(l.takeProfit) : '-'}
                          </td>
                          <td className="rv-table__td rv-table__td--num">
                            {l.stopLoss != null ? formatPrice(l.stopLoss) : '-'}
                          </td>
                          <td className="rv-table__td rv-table__td--notes">{l.notes || '—'}</td>
                        </tr>
                      ))}
                      {lots.length === 0 && (
                        <tr>
                          <td colSpan={8} className="rv-table__td" style={{ textAlign: 'center', color: 'var(--text-dim, #999)' }}>
                            该股票已全部清仓
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 交易记录 */}
              <div className="rv-journal__detail-section">
                <div className="rv-journal__detail-section-title">交易记录</div>
                <div className="rv-journal__holdings-table-wrap">
                  <table className="rv-table__el">
                    <thead>
                      <tr>
                        <th className="rv-table__th">时间</th>
                        <th className="rv-table__th">方向</th>
                        <th className="rv-table__th">价格</th>
                        <th className="rv-table__th">数量</th>
                        <th className="rv-table__th">金额</th>
                        <th className="rv-table__th">止盈价</th>
                        <th className="rv-table__th">止损价</th>
                        <th className="rv-table__th">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {symbolTrades.map((t) => (
                        <tr key={t.id} className="rv-table__row">
                          <td className="rv-table__td">{formatDateTime(t.tradeTime)}</td>
                          <td
                            className={`rv-table__td ${
                              t.direction === 'BUY' ? 'rv-table__val--up' : 'rv-table__val--down'
                            }`}
                          >
                            {t.direction === 'BUY' ? '买入' : '卖出'}
                          </td>
                          <td className="rv-table__td rv-table__td--num">{formatPrice(t.price)}</td>
                          <td className="rv-table__td rv-table__td--num">{t.quantity.toLocaleString()}</td>
                          <td className="rv-table__td rv-table__td--num">
                            {formatTurnover(Number(t.price) * t.quantity)}
                          </td>
                          <td className="rv-table__td rv-table__td--num">
                            {t.takeProfit != null ? formatPrice(t.takeProfit) : '-'}
                          </td>
                          <td className="rv-table__td rv-table__td--num">
                            {t.stopLoss != null ? formatPrice(t.stopLoss) : '-'}
                          </td>
                          <td className="rv-table__td rv-table__td--notes">{t.notes || '—'}</td>
                        </tr>
                      ))}
                      {symbolTrades.length === 0 && (
                        <tr>
                          <td colSpan={8} className="rv-table__td" style={{ textAlign: 'center', color: 'var(--text-dim, #999)' }}>
                            暂无交易记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade List */}
      {loading ? (
        <div className="rv-skeleton">加载交易记录中...</div>
      ) : trades.length === 0 ? (
        <div className="rv-empty">暂无交易记录，点击上方按钮添加</div>
      ) : (
        <div className="rv-journal__table-wrapper">
          <table className="rv-table__el">
            <thead>
              <tr>
                <th className="rv-table__th">时间</th>
                <th className="rv-table__th">股票</th>
                <th className="rv-table__th">方向</th>
                <th className="rv-table__th">价格</th>
                <th className="rv-table__th">数量</th>
                <th className="rv-table__th">金额</th>
                <th className="rv-table__th">止盈价</th>
                <th className="rv-table__th">止损价</th>
                <th className="rv-table__th">备注</th>
                <th className="rv-table__th">操作</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="rv-table__row">
                  <td className="rv-table__td">{formatDateTime(t.tradeTime)}</td>
                  <td className="rv-table__td">
                    <div className="rv-table__stock-info">
                      <span className="rv-table__stock-name">{t.stockName || t.symbol}</span>
                      <span className="rv-table__stock-code">{t.symbol}</span>
                    </div>
                  </td>
                  <td
                    className={`rv-table__td ${t.direction === 'BUY' ? 'rv-table__val--up' : 'rv-table__val--down'}`}
                  >
                    {t.direction === 'BUY' ? '买入' : '卖出'}
                  </td>
                  <td className="rv-table__td">{formatPrice(t.price)}</td>
                  <td className="rv-table__td">{t.quantity}</td>
                  <td className="rv-table__td">{formatTurnover(Number(t.price) * t.quantity)}</td>
                  <td className="rv-table__td rv-table__td--tp">
                    {t.takeProfit != null ? formatPrice(t.takeProfit) : '-'}
                  </td>
                  <td className="rv-table__td rv-table__td--sl">
                    {t.stopLoss != null ? formatPrice(t.stopLoss) : '-'}
                  </td>
                  <td className="rv-table__td rv-table__td--notes">{t.notes || '—'}</td>
                  <td className="rv-table__td">
                    <button
                      className="rv-btn rv-btn--sm rv-btn--primary"
                      onClick={() => handleEdit(t)}
                    >
                      编辑
                    </button>
                    <button
                      className="rv-btn rv-btn--sm rv-btn--danger"
                      onClick={() => handleDelete(t.id)}
                      style={{ marginLeft: '6px' }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

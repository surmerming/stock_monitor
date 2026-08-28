import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { formatTurnover, formatPrice, formatDateTime } from '../../utils/format';

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
}

interface TradeStats {
  totalTrades: number;
  winRate: number;
  avgPnlPercent: number;
  totalPnl: number;
  maxWin: number;
  maxLoss: number;
}

interface TradeFilter {
  keyword: string;
  startDate: string;
  endDate: string;
}

export default function TradeJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
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
      const [tradesRes, statsRes] = await Promise.all([
        apiFetch(`/api/trades${queryString ? '?' + queryString : ''}`),
        apiFetch(`/api/trades/stats${queryString ? '?' + queryString : ''}`),
      ]);
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        console.log('Trades API response:', data.items?.slice(0, 3));
        setTrades(data.items || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch {
      // API may not exist yet
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTrades();
  }, []);

  const handleSubmit = async () => {
    if (!form.symbol || !form.price || !form.quantity) return;
    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/trades/${editingId}` : '/api/trades';
      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockName: form.stockName,
          symbol: form.symbol.toUpperCase(),
          direction: form.direction,
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity),
          tradeTime: form.tradeTime,
          notes: form.notes,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        console.log('Create/Update result:', result);
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
        });
        fetchTrades();
      }
    } catch {
      // handle error
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
    setForm({
      stockName: trade.stockName || '',
      symbol: trade.symbol,
      direction: trade.direction,
      price: String(trade.price),
      quantity: String(trade.quantity),
      tradeTime: formatLocalDateTime(new Date(trade.tradeTime)),
      notes: trade.notes,
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

  return (
    <div className="rv-journal">
      <div className="rv-journal__header">
        <h3 className="rv-section-title">交易日志</h3>
        <button
          className="rv-btn rv-btn--primary"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? '取消' : '+ 记录交易'}
        </button>
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

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { formatTurnover } from '../../utils/format';

interface Trade {
  id: number;
  symbol: string;
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

export default function TradeJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    symbol: '',
    direction: 'BUY' as 'BUY' | 'SELL',
    price: '',
    quantity: '',
    tradeTime: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      const [tradesRes, statsRes] = await Promise.all([
        apiFetch('/api/trades'),
        apiFetch('/api/trades/stats'),
      ]);
      if (tradesRes.ok) {
        const data = await tradesRes.json();
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
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const handleSubmit = async () => {
    if (!form.symbol || !form.price || !form.quantity) return;
    try {
      const res = await apiFetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: form.symbol.toUpperCase(),
          direction: form.direction,
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity),
          tradeTime: form.tradeTime,
          notes: form.notes,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ symbol: '', direction: 'BUY', price: '', quantity: '', tradeTime: new Date().toISOString().slice(0, 16), notes: '' });
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

  return (
    <div className="rv-journal">
      <div className="rv-journal__header">
        <h3 className="rv-section-title">交易日志</h3>
        <button className="rv-btn rv-btn--primary" onClick={() => setShowForm(!showForm)}>
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

      {/* Add Trade Form */}
      {showForm && (
        <div className="rv-journal__form">
          <div className="rv-journal__form-row">
            <input
              className="rv-input"
              placeholder="股票代码"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            />
            <select
              className="rv-select"
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as 'BUY' | 'SELL' })}
            >
              <option value="BUY">买入</option>
              <option value="SELL">卖出</option>
            </select>
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
          </div>
          <div className="rv-journal__form-row">
            <input
              className="rv-input"
              type="datetime-local"
              value={form.tradeTime}
              onChange={(e) => setForm({ ...form, tradeTime: e.target.value })}
            />
            <input
              className="rv-input rv-input--wide"
              placeholder="备注"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button className="rv-btn rv-btn--primary" onClick={handleSubmit}>保存</button>
          </div>
        </div>
      )}

      {/* Trade List */}
      {loading ? (
        <div className="rv-skeleton">加载交易记录中...</div>
      ) : trades.length === 0 ? (
        <div className="rv-empty">暂无交易记录，点击上方按钮添加</div>
      ) : (
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
                <td className="rv-table__td">{new Date(t.tradeTime).toLocaleString('zh-CN')}</td>
                <td className="rv-table__td">{t.symbol}</td>
                <td className={`rv-table__td ${t.direction === 'BUY' ? 'rv-table__val--up' : 'rv-table__val--down'}`}>
                  {t.direction === 'BUY' ? '买入' : '卖出'}
                </td>
                <td className="rv-table__td">{t.price.toFixed(2)}</td>
                <td className="rv-table__td">{t.quantity}</td>
                <td className="rv-table__td">{formatTurnover(t.price * t.quantity)}</td>
                <td className="rv-table__td">{t.notes || '—'}</td>
                <td className="rv-table__td">
                  <button className="rv-btn rv-btn--sm rv-btn--danger" onClick={() => handleDelete(t.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

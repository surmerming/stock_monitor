import { useCallback, useState } from 'react';
import StockInput from '../components/StockInput';
import { useWatchlist } from '../hooks/useWatchlist';
import './SettingsPage.less';

const INTERVAL_OPTIONS = [
  { value: 60, label: '1 分钟' },
  { value: 180, label: '3 分钟' },
  { value: 300, label: '5 分钟' },
  { value: 600, label: '10 分钟' },
];

export default function SettingsPage() {
  const { symbols, loaded, addSymbols, removeSymbol } = useWatchlist();
  const [adding, setAdding] = useState(false);

  const [interval, setInterval_] = useState(
    () => Number(localStorage.getItem('poll-interval')) || 180,
  );
  const [defaultView, setDefaultView] = useState(
    () => localStorage.getItem('stock-monitor-view') || 'card',
  );
  const [saved, setSaved] = useState(false);

  const handleAdd = useCallback(
    async (newSymbols) => {
      setAdding(true);
      await addSymbols(newSymbols);
      setAdding(false);
    },
    [addSymbols],
  );

  const handleSave = () => {
    localStorage.setItem('poll-interval', String(interval));
    localStorage.setItem('stock-monitor-view', defaultView);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <h2 className="settings-page__title">设置</h2>

      <div className="settings-page__section">
        <h3 className="settings-page__section-title">监控列表</h3>
        <p className="settings-page__section-desc">
          添加或移除需要监控的股票代码，支持美股 (AAPL)、A股 (600519)、港股 (00700)
        </p>
        <StockInput onAdd={handleAdd} loading={adding} />

        {loaded && symbols.length > 0 && (
          <div className="settings-page__watchlist">
            {symbols.map((sym) => (
              <div key={sym} className="settings-page__symbol-tag">
                <span>{sym}</span>
                <button
                  className="settings-page__symbol-remove"
                  onClick={() => removeSymbol(sym)}
                  title="移除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {loaded && symbols.length === 0 && (
          <p className="settings-page__empty-hint">暂无监控股票，在上方输入框中添加</p>
        )}
      </div>

      <div className="settings-page__section">
        <h3 className="settings-page__section-title">刷新频率</h3>
        <p className="settings-page__section-desc">设置股票行情数据的自动刷新间隔</p>
        <div className="settings-page__options">
          {INTERVAL_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`settings-page__radio ${interval === opt.value ? 'settings-page__radio--active' : ''}`}
            >
              <input
                type="radio"
                name="interval"
                value={opt.value}
                checked={interval === opt.value}
                onChange={() => setInterval_(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="settings-page__section">
        <h3 className="settings-page__section-title">默认视图</h3>
        <p className="settings-page__section-desc">个股页面的默认展示方式</p>
        <div className="settings-page__options">
          <label
            className={`settings-page__radio ${defaultView === 'card' ? 'settings-page__radio--active' : ''}`}
          >
            <input
              type="radio"
              name="view"
              value="card"
              checked={defaultView === 'card'}
              onChange={() => setDefaultView('card')}
            />
            ▦ 卡片视图
          </label>
          <label
            className={`settings-page__radio ${defaultView === 'table' ? 'settings-page__radio--active' : ''}`}
          >
            <input
              type="radio"
              name="view"
              value="table"
              checked={defaultView === 'table'}
              onChange={() => setDefaultView('table')}
            />
            ☰ 列表视图
          </label>
        </div>
      </div>

      <div className="settings-page__actions">
        <button className="settings-page__save" onClick={handleSave}>
          {saved ? '已保存 ✓' : '保存设置'}
        </button>
      </div>
    </div>
  );
}

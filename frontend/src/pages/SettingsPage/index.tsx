import { useCallback, useState } from 'react';
import StockInput from '../../components/StockInput';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useAlertRules } from '../../hooks/useAlertRules';
import type { AlertRule } from '../../types';
import { INTERVAL_OPTIONS, ALERT_TYPES, COOLDOWN_OPTIONS } from '../../configs/alert';
import './style.less';

interface AlertRuleFormData {
  symbol: string;
  type: string;
  threshold: number;
  cooldownMinutes: number;
  enabled: boolean;
}

interface AlertRuleFormProps {
  onSubmit: (data: AlertRuleFormData) => Promise<void>;
  loading: boolean;
}

interface AlertRuleItemProps {
  rule: AlertRule;
  onToggle: (id: number, enabled: boolean) => void;
  onDelete: (id: number) => void;
  onReset: (id: number) => void;
}

function AlertRuleForm({ onSubmit, loading }: AlertRuleFormProps) {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState('price_above');
  const [threshold, setThreshold] = useState('');
  const [cooldown, setCooldown] = useState(30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !threshold) return;
    await onSubmit({
      symbol: symbol.trim().toUpperCase(),
      type,
      threshold: +threshold,
      cooldownMinutes: cooldown,
      enabled: true,
    });
    setSymbol('');
    setThreshold('');
  };

  return (
    <form className="alert-form" onSubmit={handleSubmit}>
      <div className="alert-form__row">
        <input
          className="alert-form__input"
          placeholder="股票代码 (如 600519)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <select
          className="alert-form__select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {ALERT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          className="alert-form__input alert-form__input--narrow"
          type="number"
          step="any"
          placeholder="阈值"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        <select
          className="alert-form__select alert-form__select--sm"
          value={cooldown}
          onChange={(e) => setCooldown(+e.target.value)}
        >
          {COOLDOWN_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button className="alert-form__btn" type="submit" disabled={loading}>
          添加
        </button>
      </div>
    </form>
  );
}

function AlertRuleItem({ rule, onToggle, onDelete, onReset }: AlertRuleItemProps) {
  const typeLabel = ALERT_TYPES.find((t) => t.value === rule.type)?.label || rule.type;
  return (
    <div
      className={`alert-rule ${rule.triggered ? 'alert-rule--triggered' : ''} ${!rule.enabled ? 'alert-rule--disabled' : ''}`}
    >
      <div className="alert-rule__info">
        <span className="alert-rule__symbol">{rule.symbol}</span>
        <span className="alert-rule__type">{typeLabel}</span>
        <span className="alert-rule__threshold">{rule.threshold}</span>
        {rule.triggered && (
          <span className="alert-rule__tag alert-rule__tag--triggered">已触发</span>
        )}
        {!rule.enabled && <span className="alert-rule__tag alert-rule__tag--off">已禁用</span>}
      </div>
      <div className="alert-rule__actions">
        {rule.triggered && (
          <button className="alert-rule__action-btn" onClick={() => onReset(rule.id)} title="重置">
            ↻
          </button>
        )}
        <button
          className="alert-rule__action-btn"
          onClick={() => onToggle(rule.id, !rule.enabled)}
          title={rule.enabled ? '禁用' : '启用'}
        >
          {rule.enabled ? '⏸' : '▶'}
        </button>
        <button
          className="alert-rule__action-btn alert-rule__action-btn--danger"
          onClick={() => onDelete(rule.id)}
          title="删除"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { symbols, loaded, addSymbols, removeSymbol } = useWatchlist();
  const {
    rules,
    loaded: rulesLoaded,
    addRule,
    deleteRule,
    toggleRule,
    resetRule,
  } = useAlertRules();
  const [adding, setAdding] = useState(false);
  const [addingRule, setAddingRule] = useState(false);

  const [interval, setInterval_] = useState<number>(
    () => Number(localStorage.getItem('poll-interval')) || 180,
  );
  const [saved, setSaved] = useState(false);

  const handleAdd = useCallback(
    async (newSymbols: string[]) => {
      setAdding(true);
      await addSymbols(newSymbols);
      setAdding(false);
    },
    [addSymbols],
  );

  const handleAddRule = useCallback(
    async (data: AlertRuleFormData) => {
      setAddingRule(true);
      try {
        await addRule(data);
      } finally {
        setAddingRule(false);
      }
    },
    [addRule],
  );

  const handleSave = () => {
    localStorage.setItem('poll-interval', String(interval));
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
        <h3 className="settings-page__section-title">预警规则</h3>
        <p className="settings-page__section-desc">
          设置价格、涨跌幅、量比等条件，触发后实时推送通知
        </p>
        <AlertRuleForm onSubmit={handleAddRule} loading={addingRule} />

        {rulesLoaded && rules.length > 0 && (
          <div className="settings-page__rules-list">
            {rules.map((rule) => (
              <AlertRuleItem
                key={rule.id}
                rule={rule}
                onToggle={toggleRule}
                onDelete={deleteRule}
                onReset={resetRule}
              />
            ))}
          </div>
        )}
        {rulesLoaded && rules.length === 0 && (
          <p className="settings-page__empty-hint">暂无预警规则，在上方添加</p>
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

      <div className="settings-page__actions">
        <button className="settings-page__save" onClick={handleSave}>
          {saved ? '已保存 ✓' : '保存设置'}
        </button>
      </div>
    </div>
  );
}

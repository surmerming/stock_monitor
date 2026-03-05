export interface IntervalOption {
  value: number;
  label: string;
}

export const INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 60, label: '1 分钟' },
  { value: 180, label: '3 分钟' },
  { value: 300, label: '5 分钟' },
  { value: 600, label: '10 分钟' },
];

export interface AlertTypeOption {
  value: string;
  label: string;
}

export const ALERT_TYPES: AlertTypeOption[] = [
  { value: 'price_above', label: '价格突破 ≥' },
  { value: 'price_below', label: '价格跌破 ≤' },
  { value: 'change_pct_above', label: '涨幅超过 ≥ %' },
  { value: 'change_pct_below', label: '跌幅超过 ≥ %' },
  { value: 'volume_ratio_above', label: '量比超过 ≥' },
  { value: 'turnover_rate_above', label: '换手率超过 ≥ %' },
];

export interface CooldownOption {
  value: number;
  label: string;
}

export const COOLDOWN_OPTIONS: CooldownOption[] = [
  { value: 5, label: '5 分钟' },
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
  { value: 240, label: '4 小时' },
];

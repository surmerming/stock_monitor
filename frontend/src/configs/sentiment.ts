export const LEVEL_CONFIG: Record<string, { color: string; bg: string }> = {
  extreme_fear: { color: '#c0392b', bg: '#fde8e8' },
  fear: { color: '#e74c3c', bg: '#fff0f0' },
  neutral: { color: '#f5a623', bg: '#fff8e8' },
  greed: { color: '#27ae60', bg: '#e8faf0' },
  extreme_greed: { color: '#1e8449', bg: '#d4efdf' },
};

export const VIX_LEVEL_LABEL: Record<string, string> = {
  low: '低波动',
  medium: '中等波动',
  high: '高波动',
  extreme: '极端波动',
};

export const VOL_LEVEL_LABEL: Record<string, string> = {
  shrink: '缩量',
  normal: '正常',
  expand: '放量',
  surge: '巨量',
};

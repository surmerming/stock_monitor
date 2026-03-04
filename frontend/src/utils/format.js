export function formatVolume(vol) {
  if (!vol && vol !== 0) return '—';
  if (vol >= 1e8) return `${(vol / 1e8).toFixed(2)}亿`;
  if (vol >= 1e4) return `${(vol / 1e4).toFixed(2)}万`;
  return vol.toLocaleString();
}

export function formatMarketCap(cap) {
  if (!cap) return '—';
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}万亿`;
  if (cap >= 1e8) return `${(cap / 1e8).toFixed(2)}亿`;
  return cap.toLocaleString();
}

export function formatPrice(val) {
  return val != null ? val.toFixed(2) : '—';
}

export function formatTurnover(val) {
  if (!val) return '—';
  if (val >= 1e12) return `${(val / 1e12).toFixed(2)}万亿`;
  if (val >= 1e8) return `${(val / 1e8).toFixed(2)}亿`;
  if (val >= 1e4) return `${(val / 1e4).toFixed(2)}万`;
  return val.toLocaleString();
}

export function formatPercent(val) {
  if (val == null) return '—';
  return `${val.toFixed(2)}%`;
}

export function formatRatio(val) {
  if (val == null) return '—';
  return val.toFixed(2);
}

export function formatChange(data) {
  if (!data) return { text: '—', trend: '' };
  const isUp = data.change >= 0;
  const sign = isUp ? '+' : '';
  const arrow = isUp ? '▲' : '▼';
  return {
    text: `${arrow} ${sign}${data.change.toFixed(2)} (${sign}${data.change_percent.toFixed(2)}%)`,
    trend: isUp ? 'up' : 'down',
  };
}

const MARKET_ORDER = { A股: 0, 港股: 1, 美股: 2 };

export function groupByMarket(symbols, quotes) {
  const groups = {};

  for (const sym of symbols) {
    const data = quotes[sym];
    const market = data?.market || '其他';
    if (!groups[market]) groups[market] = [];
    groups[market].push({ sym, data });
  }

  return Object.entries(groups).sort(
    ([a], [b]) => (MARKET_ORDER[a] ?? 99) - (MARKET_ORDER[b] ?? 99),
  );
}

const MARKET_COLORS = {
  A股: '#e8364e',
  港股: '#00a86b',
  美股: '#5b8def',
};

export function getMarketColor(market) {
  return MARKET_COLORS[market] || '#8892a4';
}

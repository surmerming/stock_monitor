import type { QuoteData, QuoteMap } from '../types';

export function formatVolume(vol: number | null | undefined): string {
  if (!vol && vol !== 0) return '—';
  if (vol >= 1e8) return `${(vol / 1e8).toFixed(2)}亿`;
  if (vol >= 1e4) return `${(vol / 1e4).toFixed(2)}万`;
  return vol.toLocaleString();
}

export function formatMarketCap(cap: number | null | undefined): string {
  if (!cap) return '—';
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}万亿`;
  if (cap >= 1e8) return `${(cap / 1e8).toFixed(2)}亿`;
  return cap.toLocaleString();
}

export function formatPrice(val: number | string | null | undefined): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return num != null && !isNaN(num) ? num.toFixed(3) : '—';
}

export function formatDateTime(val: string | Date | null | undefined): string {
  if (!val) return '—';
  const date = typeof val === 'string' ? new Date(val) : val;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatTurnover(val: number | null | undefined): string {
  if (val == null || val === 0) return '—';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}万亿`;
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(2)}万`;
  return `${sign}${abs.toLocaleString()}`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val == null) return '—';
  return `${val.toFixed(2)}%`;
}

export function formatRatio(val: number | null | undefined): string {
  if (val == null) return '—';
  return val.toFixed(2);
}

export function formatChange(data: QuoteData | null | undefined): { text: string; trend: string } {
  if (!data) return { text: '—', trend: '' };
  const isUp = data.change >= 0;
  const sign = isUp ? '+' : '';
  const arrow = isUp ? '▲' : '▼';
  return {
    text: `${arrow} ${sign}${data.change.toFixed(2)} (${sign}${data.change_percent.toFixed(2)}%)`,
    trend: isUp ? 'up' : 'down',
  };
}

const MARKET_ORDER: Record<string, number> = { A股: 0, 港股: 1, 美股: 2 };

export function groupByMarket(
  symbols: string[],
  quotes: QuoteMap,
): Array<[string, Array<{ sym: string; data: QuoteData | null }>]> {
  const groups: Record<string, Array<{ sym: string; data: QuoteData | null }>> = {};

  for (const sym of symbols) {
    const data = quotes[sym] ?? null;
    const market = data?.market || '其他';
    if (!groups[market]) groups[market] = [];
    groups[market].push({ sym, data });
  }

  return Object.entries(groups).sort(
    ([a], [b]) => (MARKET_ORDER[a] ?? 99) - (MARKET_ORDER[b] ?? 99),
  );
}

const MARKET_COLORS: Record<string, string> = {
  A股: '#e8364e',
  港股: '#00a86b',
  美股: '#5b8def',
};

export function getMarketColor(market: string): string {
  return MARKET_COLORS[market] || '#8892a4';
}

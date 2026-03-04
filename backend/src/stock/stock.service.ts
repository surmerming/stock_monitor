import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export interface StockQuote {
  symbol: string;
  name: string;
  currency: string;
  current_price: number;
  prev_close: number;
  open_price: number;
  day_high: number;
  day_low: number;
  volume: number;
  market_cap: number | null;
  pe_ratio: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  avg_volume: number | null;
  turnover: number | null;
  turnover_rate: number | null;
  volume_ratio: number | null;
  change: number;
  change_percent: number;
  timestamp: string;
  market: string;
  is_up: boolean;
}

const A_SHARE_RE = /^(sh|sz|bj)?\d{6}$/i;
const HK_RE = /^(hk)?\d{4,5}$/i;

function isAShare(symbol: string): boolean {
  return A_SHARE_RE.test(symbol.trim());
}

function isHK(symbol: string): boolean {
  const s = symbol.trim().toLowerCase();
  return s.endsWith('.hk') || HK_RE.test(s);
}

function toYahooAShare(symbol: string): { yahoo: string; display: string } {
  const s = symbol.trim().toLowerCase();
  let prefix: string;
  let code: string;

  if (['sh', 'sz', 'bj'].includes(s.slice(0, 2))) {
    prefix = s.slice(0, 2);
    code = s.slice(2);
  } else {
    code = s;
    if (code.startsWith('6')) prefix = 'sh';
    else if (code.startsWith('0') || code.startsWith('3')) prefix = 'sz';
    else if (code.startsWith('4') || code.startsWith('8')) prefix = 'bj';
    else prefix = 'sh';
  }

  const suffix = prefix === 'sh' ? '.SS' : prefix === 'sz' ? '.SZ' : '.BJ';
  return {
    yahoo: `${code}${suffix}`,
    display: `${prefix.toUpperCase()}${code}`,
  };
}

function toYahooHK(symbol: string): { yahoo: string; display: string } {
  let s = symbol.trim().toLowerCase();
  if (s.endsWith('.hk')) s = s.slice(0, -3);
  else if (s.startsWith('hk')) s = s.slice(2);

  const code = (s.replace(/^0+/, '') || '0').padStart(4, '0');
  return { yahoo: `${code}.HK`, display: `HK${code}` };
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  async fetchQuote(symbol: string): Promise<StockQuote> {
    let yahooSymbol: string;
    let displaySymbol: string;
    let market: string;

    const trimmed = symbol.trim();

    if (isAShare(trimmed)) {
      const r = toYahooAShare(trimmed);
      yahooSymbol = r.yahoo;
      displaySymbol = r.display;
      market = 'A股';
    } else if (isHK(trimmed)) {
      const r = toYahooHK(trimmed);
      yahooSymbol = r.yahoo;
      displaySymbol = r.display;
      market = '港股';
    } else {
      yahooSymbol = trimmed.toUpperCase();
      displaySymbol = trimmed.toUpperCase();
      market = '美股';
    }

    const quote: any = await yahooFinance.quote(yahooSymbol);

    if (!quote) {
      throw new Error(`No data returned for ${yahooSymbol}`);
    }

    const current = quote.regularMarketPrice ?? 0;
    const prevClose = quote.regularMarketPreviousClose ?? 0;
    const change = current - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    const defaultCurrency = market === 'A股' ? 'CNY' : market === '港股' ? 'HKD' : 'USD';

    return {
      symbol: displaySymbol,
      name: quote.shortName || quote.longName || displaySymbol,
      currency: quote.currency || defaultCurrency,
      current_price: current,
      prev_close: prevClose,
      open_price: quote.regularMarketOpen ?? 0,
      day_high: quote.regularMarketDayHigh ?? 0,
      day_low: quote.regularMarketDayLow ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      market_cap: quote.marketCap ?? null,
      pe_ratio: quote.trailingPE ?? null,
      week_52_high: quote.fiftyTwoWeekHigh ?? null,
      week_52_low: quote.fiftyTwoWeekLow ?? null,
      avg_volume: quote.averageDailyVolume10Day ?? null,
      turnover:
        (quote.regularMarketVolume ?? 0) && current
          ? (quote.regularMarketVolume ?? 0) * current
          : null,
      turnover_rate:
        quote.sharesOutstanding && (quote.regularMarketVolume ?? 0)
          ? ((quote.regularMarketVolume ?? 0) / quote.sharesOutstanding) * 100
          : null,
      volume_ratio:
        (quote.regularMarketVolume ?? 0) && (quote.averageDailyVolume10Day ?? 0)
          ? (quote.regularMarketVolume ?? 0) / (quote.averageDailyVolume10Day ?? 1)
          : null,
      change,
      change_percent: changePct,
      timestamp: new Date().toISOString(),
      market,
      is_up: change >= 0,
    };
  }

  async fetchQuotes(
    symbols: string[],
  ): Promise<{ symbol: string; data: StockQuote | null; error: string | null }[]> {
    const results = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const data = await this.fetchQuote(sym);
          return { symbol: sym, data, error: null };
        } catch (err) {
          this.logger.warn(`Failed to fetch ${sym}: ${err.message}`);
          return { symbol: sym, data: null, error: err.message };
        }
      }),
    );
    return results;
  }
}

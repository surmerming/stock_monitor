import { Injectable, Logger } from '@nestjs/common';
import { AkShareService, QuoteResult } from '../akshare/akshare.service';
import { getCnName } from '../common/cn-names';

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
  market_state: string | null;
  pre_market_price: number | null;
  pre_market_change: number | null;
  pre_market_change_percent: number | null;
  post_market_price: number | null;
  post_market_change: number | null;
  post_market_change_percent: number | null;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private readonly akShareService: AkShareService) {}

  normalizeSymbol(input: string): {
    akshare: string;
    display: string;
    market: string;
  } {
    const trimmed = input.trim();
    const s = trimmed.toLowerCase();

    if (s.endsWith('.ss')) {
      return { akshare: trimmed, display: `SH${trimmed.slice(0, -3)}`, market: 'A股' };
    }
    if (s.endsWith('.sz')) {
      return { akshare: trimmed, display: `SZ${trimmed.slice(0, -3)}`, market: 'A股' };
    }
    if (s.endsWith('.bj')) {
      return { akshare: trimmed, display: `BJ${trimmed.slice(0, -3)}`, market: 'A股' };
    }
    if (s.endsWith('.hk')) {
      return { akshare: trimmed, display: `HK${trimmed.slice(0, -3)}`, market: '港股' };
    }

    if (/^(sh|sz|bj)?\d{6}$/i.test(trimmed)) {
      const code = s.replace(/^(sh|sz|bj)/, '');
      if (code.startsWith('6')) {
        return { akshare: `SH${code}`, display: `SH${code}`, market: 'A股' };
      } else if (code.startsWith('0') || code.startsWith('3')) {
        return { akshare: `SZ${code}`, display: `SZ${code}`, market: 'A股' };
      } else if (code.startsWith('4') || code.startsWith('8')) {
        return { akshare: `BJ${code}`, display: `BJ${code}`, market: 'A股' };
      } else {
        return { akshare: `SH${code}`, display: `SH${code}`, market: 'A股' };
      }
    }

    if (/^(hk)?\d{4,5}$/i.test(trimmed)) {
      const code = s.replace(/^hk/, '').padStart(5, '0');
      return { akshare: `HK${code}`, display: `HK${code}`, market: '港股' };
    }

    return {
      akshare: trimmed.toUpperCase(),
      display: trimmed.toUpperCase(),
      market: '美股',
    };
  }

  private transformAkShareQuote(raw: QuoteResult, display: string): StockQuote {
    return {
      symbol: display,
      name: getCnName(display, raw.name),
      currency: raw.currency,
      current_price: raw.current_price,
      prev_close: raw.prev_close,
      open_price: raw.open_price,
      day_high: raw.day_high,
      day_low: raw.day_low,
      volume: raw.volume,
      market_cap: raw.market_cap ?? null,
      pe_ratio: raw.pe_ratio ?? null,
      week_52_high: null,
      week_52_low: null,
      avg_volume: null,
      turnover: raw.turnover ?? null,
      turnover_rate: raw.turnover_rate ?? null,
      volume_ratio: null,
      change: raw.change,
      change_percent: raw.change_percent,
      timestamp: new Date().toISOString(),
      market: raw.market,
      is_up: raw.change >= 0,
      market_state: null,
      pre_market_price: null,
      pre_market_change: null,
      pre_market_change_percent: null,
      post_market_price: null,
      post_market_change: null,
      post_market_change_percent: null,
    };
  }

  async fetchQuote(symbol: string): Promise<StockQuote> {
    const { akshare, display } = this.normalizeSymbol(symbol);
    const raw = await this.akShareService.getQuote(akshare);
    if (!raw) throw new Error(`No data returned for ${akshare}`);
    return this.transformAkShareQuote(raw, display);
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

  async fetchQuotesBatch(inputSymbols: string[]): Promise<Map<string, StockQuote>> {
    const result = new Map<string, StockQuote>();
    if (inputSymbols.length === 0) return result;

    const entries = inputSymbols.map((sym) => ({
      input: sym,
      ...this.normalizeSymbol(sym),
    }));

    const akshareSymbols = entries.map((e) => e.akshare);
    const batchResults = await this.akShareService.getQuotesBatch(akshareSymbols);

    const rawMap = new Map<string, QuoteResult>();
    for (const res of batchResults) {
      if (res.data) {
        rawMap.set(res.symbol, res.data);
      }
    }

    for (const entry of entries) {
      const raw = rawMap.get(entry.akshare);
      if (raw) {
        result.set(entry.input, this.transformAkShareQuote(raw, entry.display));
      }
    }

    return result;
  }
}

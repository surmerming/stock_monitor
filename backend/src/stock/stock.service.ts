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
  pe_ratio_dynamic: number | null;
  pe_ratio_static: number | null;
  pb_ratio: number | null;
  dividend_yield: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  sixty_day_avg: number | null;
  two_hundred_fifty_day_avg: number | null;
  avg_volume: number | null;
  turnover: number | null;
  turnover_rate: number | null;
  volume_ratio: number | null;
  roe: number | null;
  gross_margin: number | null;
  net_margin: number | null;
  operating_margin: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
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
      if (trimmed === '000001.SS') {
        return { akshare: 'sh000001', display: 'SH000001', market: 'A股' };
      }
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

    const yahooMap: Record<string, { akshare: string; market: string }> = {
      '^hsi': { akshare: 'HKHSI', market: '港股' },
      '^hsce': { akshare: 'HKHSCEI', market: '港股' },
      '^hscc': { akshare: 'HKHSCCI', market: '港股' },
      '^hsnu': { akshare: 'HKHSU', market: '港股' },
      'hstech.hk': { akshare: 'HKHSTECH', market: '港股' },
      '^gspc': { akshare: 'INDEX_SPX', market: '宏观' },
      '^dji': { akshare: 'INDEX_DJI', market: '宏观' },
      '^ixic': { akshare: 'INDEX_IXIC', market: '宏观' },
      '^ndx': { akshare: 'USNDX', market: '美股' },
      'gc=f': { akshare: 'HF_GC', market: '宏观' },
      'si=f': { akshare: 'HF_SI', market: '宏观' },
      'cl=f': { akshare: 'HF_CL', market: '宏观' },
      'hg=f': { akshare: 'HF_HG', market: '宏观' },
      'ng=f': { akshare: 'HF_NG', market: '宏观' },
      'cny=x': { akshare: 'FX_CNY', market: '宏观' },
      '^tnx': { akshare: 'INDEX_TNX', market: '宏观' },
      '^tyx': { akshare: 'INDEX_TYX', market: '宏观' },
      '^fvx': { akshare: 'INDEX_FVX', market: '宏观' },
      '^irx': { akshare: 'INDEX_IRX', market: '宏观' },
      '^vix': { akshare: 'INDEX_VIX', market: '宏观' },
    };

    if (yahooMap[s]) {
      return { ...yahooMap[s], display: trimmed.toUpperCase() };
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
      pe_ratio_dynamic: raw.pe_ratio_dynamic ?? null,
      pe_ratio_static: raw.pe_ratio_static ?? null,
      pb_ratio: raw.pb_ratio ?? null,
      dividend_yield: raw.dividend_yield ?? null,
      week_52_high: raw.week_52_high ?? null,
      week_52_low: raw.week_52_low ?? null,
      sixty_day_avg: raw.sixty_day_avg ?? null,
      two_hundred_fifty_day_avg: raw.two_hundred_fifty_day_avg ?? null,
      avg_volume: null,
      turnover: raw.turnover ?? null,
      turnover_rate: raw.turnover_rate ?? null,
      volume_ratio: raw.volume_ratio ?? null,
      roe: raw.roe ?? null,
      gross_margin: raw.gross_margin ?? null,
      net_margin: raw.net_margin ?? null,
      operating_margin: raw.operating_margin ?? null,
      revenue_growth: raw.revenue_growth ?? null,
      earnings_growth: raw.earnings_growth ?? null,
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

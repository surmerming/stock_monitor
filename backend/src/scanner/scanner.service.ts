import { Injectable, Logger } from '@nestjs/common';
import { AkShareService, QuoteResult } from '../akshare/akshare.service';
import { getCnName } from '../common/cn-names';

export interface ScannerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  exchange: string;
  avgVolume3m: number | null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 2 * 60 * 1000;

const US_TOP_STOCKS = [
  'AAPL',
  'MSFT',
  'NVDA',
  'GOOGL',
  'AMZN',
  'META',
  'TSLA',
  'BRK-B',
  'JPM',
  'V',
  'UNH',
  'MA',
  'JNJ',
  'PG',
  'HD',
  'AVGO',
  'COST',
  'MRK',
  'ABBV',
  'CRM',
  'AMD',
  'NFLX',
  'PEP',
  'KO',
  'TMO',
  'ADBE',
  'LIN',
];

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private cache = new Map<string, CacheEntry<any>>();

  constructor(private readonly akShareService: AkShareService) {}

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private transformQuote(q: QuoteResult): ScannerItem {
    return {
      symbol: q.symbol,
      name: getCnName(q.symbol, q.name),
      price: q.current_price,
      change: q.change,
      changePercent: q.change_percent,
      volume: q.volume,
      marketCap: q.market_cap || null,
      exchange: q.market,
      avgVolume3m: null,
    };
  }

  async getGainers(count = 25): Promise<ScannerItem[]> {
    const cached = this.getCached<ScannerItem[]>('gainers');
    if (cached) return cached;

    try {
      const sectorResult = await this.akShareService.getSector('a_share');
      const sectors = sectorResult?.sectors || [];
      const results = await this.akShareService.getQuotesBatch(US_TOP_STOCKS);
      const quotes = results.filter((r) => r.data).map((r) => r.data!);

      quotes.sort((a, b) => b.change_percent - a.change_percent);
      const items = quotes.slice(0, count).map((q) => this.transformQuote(q));

      this.setCache('gainers', items);
      this.logger.debug(`Fetched ${items.length} gainers`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to fetch gainers: ${err.message}`);
      return this.getCached<ScannerItem[]>('gainers') ?? [];
    }
  }

  async getLosers(count = 25): Promise<ScannerItem[]> {
    const cached = this.getCached<ScannerItem[]>('losers');
    if (cached) return cached;

    try {
      const results = await this.akShareService.getQuotesBatch(US_TOP_STOCKS);
      const quotes = results.filter((r) => r.data).map((r) => r.data!);

      quotes.sort((a, b) => a.change_percent - b.change_percent);
      const items = quotes.slice(0, count).map((q) => this.transformQuote(q));

      this.setCache('losers', items);
      this.logger.debug(`Fetched ${items.length} losers`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to fetch losers: ${err.message}`);
      return this.getCached<ScannerItem[]>('losers') ?? [];
    }
  }

  async getActive(count = 25): Promise<ScannerItem[]> {
    const cached = this.getCached<ScannerItem[]>('active');
    if (cached) return cached;

    try {
      const results = await this.akShareService.getQuotesBatch(US_TOP_STOCKS);
      const quotes = results.filter((r) => r.data).map((r) => r.data!);

      quotes.sort((a, b) => b.volume - a.volume);
      const items = quotes.slice(0, count).map((q) => this.transformQuote(q));

      this.setCache('active', items);
      this.logger.debug(`Fetched ${items.length} most active`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to fetch active: ${err.message}`);
      return this.getCached<ScannerItem[]>('active') ?? [];
    }
  }

  async getTrending(): Promise<{ region: string; symbols: string[] }[]> {
    const cached = this.getCached<{ region: string; symbols: string[] }[]>('trending');
    if (cached) return cached;

    const regions = ['US', 'HK'];
    const results: { region: string; symbols: string[] }[] = [];

    const usSymbols = US_TOP_STOCKS;
    const hkSymbols = ['HK2800', 'HK3067', 'HK3033', 'HK2828', 'HK3188'];

    results.push({ region: 'US', symbols: usSymbols });
    results.push({ region: 'HK', symbols: hkSymbols });

    this.setCache('trending', results);
    this.logger.debug(`Fetched trending for ${regions.join(', ')}`);
    return results;
  }

  async getTrendingWithQuotes(): Promise<
    { region: string; regionName: string; items: ScannerItem[] }[]
  > {
    const cached =
      this.getCached<{ region: string; regionName: string; items: ScannerItem[] }[]>(
        'trending_quotes',
      );
    if (cached) return cached;

    const trending = await this.getTrending();
    const regionNames: Record<string, string> = { US: '美股', HK: '港股' };
    const allSymbols = trending.flatMap((t) => t.symbols);

    if (allSymbols.length === 0) return [];

    try {
      const results = await this.akShareService.getQuotesBatch(allSymbols);
      const quotes = results.filter((r) => r.data).map((r) => r.data!);
      const quoteMap = new Map<string, QuoteResult>();
      for (const q of quotes) {
        quoteMap.set(q.symbol, q);
      }

      const resultsWithQuotes = trending.map((t) => ({
        region: t.region,
        regionName: regionNames[t.region] || t.region,
        items: t.symbols
          .filter((s) => quoteMap.has(s))
          .map((s) => {
            const q = quoteMap.get(s)!;
            return this.transformQuote(q);
          }),
      }));

      this.setCache('trending_quotes', resultsWithQuotes);
      return resultsWithQuotes;
    } catch (err) {
      this.logger.error(`Failed to fetch trending quotes: ${err.message}`);
      return [];
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

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

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private cache = new Map<string, CacheEntry<any>>();

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

  private transformQuote(q: any): ScannerItem {
    return {
      symbol: q.symbol,
      name: q.shortName || q.longName || q.displayName || q.symbol,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      volume: q.regularMarketVolume ?? 0,
      marketCap: q.marketCap ?? null,
      exchange: q.fullExchangeName || q.exchange || '',
      avgVolume3m: q.averageDailyVolume3Month ?? null,
    };
  }

  async getGainers(count = 25): Promise<ScannerItem[]> {
    const cached = this.getCached<ScannerItem[]>('gainers');
    if (cached) return cached;

    try {
      const result = await yahooFinance.screener({ scrIds: 'day_gainers', count });
      const items = result.quotes.map((q) => this.transformQuote(q));
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
      const result = await yahooFinance.screener({ scrIds: 'day_losers', count });
      const items = result.quotes.map((q) => this.transformQuote(q));
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
      const result = await yahooFinance.screener({ scrIds: 'most_actives', count });
      const items = result.quotes.map((q) => this.transformQuote(q));
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

    for (const region of regions) {
      try {
        const result = await yahooFinance.trendingSymbols(region, { count: 20 });
        results.push({
          region,
          symbols: result.quotes.map((q) => q.symbol),
        });
      } catch (err) {
        this.logger.error(`Failed to fetch trending for ${region}: ${err.message}`);
        results.push({ region, symbols: [] });
      }
    }

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
      const quotes = await yahooFinance.quote(allSymbols);
      const quoteMap = new Map<string, any>();
      const arr = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of arr) {
        if (q?.symbol) quoteMap.set(q.symbol, q);
      }

      const results = trending.map((t) => ({
        region: t.region,
        regionName: regionNames[t.region] || t.region,
        items: t.symbols
          .filter((s) => quoteMap.has(s))
          .map((s) => {
            const q = quoteMap.get(s)!;
            return {
              symbol: q.symbol,
              name: q.shortName || q.longName || q.displayName || q.symbol,
              price: q.regularMarketPrice ?? 0,
              change: q.regularMarketChange ?? 0,
              changePercent: q.regularMarketChangePercent ?? 0,
              volume: q.regularMarketVolume ?? 0,
              marketCap: q.marketCap ?? null,
              exchange: q.fullExchangeName || q.exchange || '',
              avgVolume3m: q.averageDailyVolume3Month ?? null,
            };
          }),
      }));

      this.setCache('trending_quotes', results);
      return results;
    } catch (err) {
      this.logger.error(`Failed to fetch trending quotes: ${err.message}`);
      return [];
    }
  }
}

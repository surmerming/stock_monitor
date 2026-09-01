import { Injectable, Logger } from '@nestjs/common';
import { AkShareService, QuoteResult, ChartQuote } from '../akshare/akshare.service';
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

export interface LimitUpItem extends ScannerItem {
  limitUpDays: number; // 连板天数（含今日，1=首板）
  limitRate: number; // 涨停幅度（10/20/5）
}

export interface LimitUpStats {
  total: number; // 涨停家数
  lianban: number; // 连板家数（≥2板）
  maxLianban: number; // 最高连板
}

export interface LimitUpResult {
  stats: LimitUpStats;
  items: LimitUpItem[];
}

export type ScannerMarket = 'a_share' | 'hk' | 'us';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 2 * 60 * 1000;
// 连板统计需批量拉取K线，成本高，单独使用更长的缓存
const LIMIT_UP_CACHE_TTL = 10 * 60 * 1000;
// 全市场快照缓存（涨幅/跌幅/活跃/热搜榜共享）
const SNAPSHOT_CACHE_TTL = 60 * 1000;

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private cache = new Map<string, CacheEntry<any>>();

  constructor(private readonly akShareService: AkShareService) {}

  private getCached<T>(key: string, ttlMs = CACHE_TTL): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttlMs) {
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

  /**
   * 全市场快照（涨幅/跌幅/活跃/热搜榜共享，避免重复拉取全市场列表）
   */
  private async getSnapshot(market: ScannerMarket): Promise<QuoteResult[]> {
    const key = `${market}_snapshot`;
    const cached = this.getCached<QuoteResult[]>(key, SNAPSHOT_CACHE_TTL);
    if (cached) return cached;
    const list = await this.akShareService.getMarketStockList(market);
    this.setCache(key, list);
    return list;
  }

  normalizeMarket(market?: string): ScannerMarket {
    return market === 'hk' || market === 'us' ? market : 'a_share';
  }

  async getGainers(count = 25, market: ScannerMarket = 'a_share'): Promise<ScannerItem[]> {
    const cacheKey = `gainers_${market}`;
    const cached = this.getCached<ScannerItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const snapshot = await this.getSnapshot(market);
      const items = [...snapshot]
        .sort((a, b) => b.change_percent - a.change_percent)
        .slice(0, count)
        .map((q) => this.transformQuote(q));

      this.setCache(cacheKey, items);
      this.logger.debug(`Fetched ${items.length} gainers (${market})`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to fetch gainers: ${err.message}`);
      return this.getCached<ScannerItem[]>(cacheKey) ?? [];
    }
  }

  async getLosers(count = 25, market: ScannerMarket = 'a_share'): Promise<ScannerItem[]> {
    const cacheKey = `losers_${market}`;
    const cached = this.getCached<ScannerItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const snapshot = await this.getSnapshot(market);
      const items = [...snapshot]
        .sort((a, b) => a.change_percent - b.change_percent)
        .slice(0, count)
        .map((q) => this.transformQuote(q));

      this.setCache(cacheKey, items);
      this.logger.debug(`Fetched ${items.length} losers (${market})`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to fetch losers: ${err.message}`);
      return this.getCached<ScannerItem[]>(cacheKey) ?? [];
    }
  }

  async getActive(count = 25, market: ScannerMarket = 'a_share'): Promise<ScannerItem[]> {
    const cacheKey = `active_${market}`;
    const cached = this.getCached<ScannerItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const snapshot = await this.getSnapshot(market);
      const items = [...snapshot]
        .sort((a, b) => (b.turnover || 0) - (a.turnover || 0))
        .slice(0, count)
        .map((q) => this.transformQuote(q));

      this.setCache(cacheKey, items);
      this.logger.debug(`Fetched ${items.length} most active (${market})`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to fetch active: ${err.message}`);
      return this.getCached<ScannerItem[]>(cacheKey) ?? [];
    }
  }

  async getTrending(
    market: ScannerMarket = 'a_share',
  ): Promise<{ region: string; symbols: string[] }[]> {
    const cacheKey = `trending_${market}`;
    const cached = this.getCached<{ region: string; symbols: string[] }[]>(cacheKey);
    if (cached) return cached;

    // 热搜无直接数据源，以换手率（人气/关注度代理）取该市场Top
    try {
      const snapshot = await this.getSnapshot(market);
      const symbols = [...snapshot]
        .sort((a, b) => (b.turnover_rate || 0) - (a.turnover_rate || 0))
        .slice(0, 25)
        .map((q) => q.symbol);
      const region = market === 'a_share' ? 'CN' : market === 'hk' ? 'HK' : 'US';
      const results = [{ region, symbols }];
      this.setCache(cacheKey, results);
      return results;
    } catch (err) {
      this.logger.error(`Failed to fetch trending: ${err.message}`);
      return this.getCached<{ region: string; symbols: string[] }[]>(cacheKey) ?? [];
    }
  }

  async getTrendingWithQuotes(
    market: ScannerMarket = 'a_share',
  ): Promise<{ region: string; regionName: string; items: ScannerItem[] }[]> {
    const cacheKey = `trending_quotes_${market}`;
    const cached =
      this.getCached<{ region: string; regionName: string; items: ScannerItem[] }[]>(cacheKey);
    if (cached) return cached;

    const trending = await this.getTrending(market);
    const regionNames: Record<string, string> = { CN: 'A股', US: '美股', HK: '港股' };
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

      this.setCache(cacheKey, resultsWithQuotes);
      return resultsWithQuotes;
    } catch (err) {
      this.logger.error(`Failed to fetch trending quotes: ${err.message}`);
      return [];
    }
  }

  /**
   * A股涨停幅度：创业板(300/301)/科创板(688) 一律 20%，其余主板（含ST）10%
   * 注：主板ST现行为10%，创业板/科创板ST为20%（经腾讯行情涨停价字段实测确认）
   */
  private limitRateFor(symbol: string): number {
    const code = symbol.replace(/^(SH|SZ)/, '');
    if (code.startsWith('688') || code.startsWith('300') || code.startsWith('301')) return 20;
    return 10;
  }

  /**
   * 判断单日是否涨停：收盘价达到名义涨停价（昨收×(1+rate) 四舍五入到分）
   */
  private isLimitUpBar(bars: ChartQuote[], i: number, rate: number): boolean {
    if (i < 1) return false;
    const prevClose = bars[i - 1].close;
    if (!prevClose) return false;
    const limitPrice = Math.round(prevClose * (1 + rate / 100) * 100) / 100;
    return bars[i].close >= limitPrice - 0.001;
  }

  /**
   * 涨停板：全市场筛选当日涨停个股，并用日K统计连续涨停天数
   */
  async getLimitUp(): Promise<LimitUpResult> {
    const cached = this.getCached<LimitUpResult>('limitup', LIMIT_UP_CACHE_TTL);
    if (cached) return cached;

    const empty: LimitUpResult = {
      stats: { total: 0, lianban: 0, maxLianban: 0 },
      items: [],
    };

    try {
      const list = await this.akShareService.getMarketStockList('a_share');

      // 预筛（名义涨幅容差0.5放宽），再用腾讯行情涨停价精确校验（现价>=涨停价才算涨停）
      const prefiltered = list.filter((q) => {
        const rate = this.limitRateFor(q.symbol);
        return q.change_percent >= rate - 0.5;
      });
      const limitPrices = await this.akShareService.getTencentLimitPrices(
        prefiltered.map((q) => q.symbol),
      );
      const candidates = prefiltered.filter((q) => {
        const limitPrice = limitPrices.get(q.symbol.toUpperCase());
        if (limitPrice != null) return q.current_price >= limitPrice - 0.001;
        // 拿不到涨停价时退回涨幅容差判断
        return q.change_percent >= this.limitRateFor(q.symbol) - 0.25;
      });

      this.logger.log(`Limit-up candidates: ${candidates.length}`);

      // 并批拉取日K，统计连板数
      const items: LimitUpItem[] = [];
      const batchSize = 20;
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const settled = await Promise.allSettled(
          batch.map(async (q) => {
            const rate = this.limitRateFor(q.symbol);
            const days = await this.countConsecutiveLimitUp(q.symbol, rate);
            return { q, rate, days };
          }),
        );
        for (const s of settled) {
          if (s.status !== 'fulfilled') continue;
          const { q, rate, days } = s.value;
          items.push({
            ...this.transformQuote(q),
            limitUpDays: days,
            limitRate: rate,
          });
        }
      }

      items.sort((a, b) => b.limitUpDays - a.limitUpDays || b.changePercent - a.changePercent);

      const result: LimitUpResult = {
        stats: {
          total: items.length,
          lianban: items.filter((it) => it.limitUpDays >= 2).length,
          maxLianban: items.reduce((max, it) => Math.max(max, it.limitUpDays), 0),
        },
        items,
      };

      this.setCache('limitup', result);
      return result;
    } catch (err) {
      this.logger.error(`Failed to fetch limit-up: ${err.message}`);
      return this.getCached<LimitUpResult>('limitup', Infinity) ?? empty;
    }
  }

  /**
   * 从最新交易日起倒序统计连续涨停天数
   */
  private async countConsecutiveLimitUp(symbol: string, rate: number): Promise<number> {
    try {
      const chart = await this.akShareService.getChart(symbol, 'daily');
      const bars = (chart?.quotes ?? [])
        .filter((b) => b.close > 0)
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      if (bars.length < 2) return 1;

      let days = 0;
      for (let i = bars.length - 1; i >= 1; i--) {
        if (this.isLimitUpBar(bars, i, rate)) days++;
        else break;
      }
      return Math.max(days, 1); // 已通过涨停价校验，至少为首板
    } catch {
      return 1;
    }
  }
}

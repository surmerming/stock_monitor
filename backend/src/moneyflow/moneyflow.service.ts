import { Injectable, Logger } from '@nestjs/common';
import {
  AkShareService,
  QuoteResult,
  MoneyflowResult,
  MoneyflowTimeline,
} from '../akshare/akshare.service';
import { StockService } from '../stock/stock.service';
import { WatchlistService } from '../watchlist/watchlist.service';
import { CN_NAMES, getCnName } from '../common/cn-names';

export interface MoneyFlowItem {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  turnover: number;
  marketCap: number | null;
  netFlow: number;
  flowIntensity: number;
  largeNetFlow: number;
  largeInflow: number;
  largeOutflow: number;
  exchange: string;
}

export interface MoneyFlowDetail {
  symbol: string;
  name: string;
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    largeInflow: number;
    largeOutflow: number;
    largeNetFlow: number;
    mediumInflow: number;
    mediumOutflow: number;
    mediumNetFlow: number;
    smallInflow: number;
    smallOutflow: number;
    smallNetFlow: number;
  };
  timeline: Array<{
    time: string;
    inflow: number;
    outflow: number;
    netFlow: number;
    cumulativeNetFlow: number;
  }>;
  largeBars: Array<{
    time: string;
    volume: number;
    amount: number;
    direction: 'buy' | 'sell';
    price: number;
  }>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const OVERVIEW_CACHE_TTL = 3 * 60 * 1000;
const DETAIL_CACHE_TTL = 60 * 1000;
const HIST_CACHE_TTL = 10 * 60 * 1000;

const A_SHARE_POOL = Object.keys(CN_NAMES).filter((s) => /\.(SS|SZ|BJ)$/i.test(s));
const HK_STOCK_POOL = Object.keys(CN_NAMES).filter((s) => /\.HK$/i.test(s));

const US_STOCK_POOL = [
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
  'WMT',
  'ACN',
  'MCD',
  'CSCO',
  'ABT',
  'DHR',
  'ORCL',
  'INTC',
  'DIS',
  'VZ',
  'CMCSA',
  'NKE',
  'PM',
  'TXN',
  'QCOM',
  'BA',
  'GE',
  'CAT',
  'IBM',
  'AMAT',
  'ISRG',
  'NOW',
  'UBER',
];

function isToday(dateStr?: string): boolean {
  if (!dateStr) return true;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

@Injectable()
export class MoneyFlowService {
  private readonly logger = new Logger(MoneyFlowService.name);
  private cache = new Map<string, CacheEntry<any>>();

  constructor(
    private readonly stockService: StockService,
    private readonly watchlistService: WatchlistService,
    private readonly akShareService: AkShareService,
  ) {}

  private getCached<T>(key: string, ttl: number): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttl) {
      return entry.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getOverview(market?: string, date?: string): Promise<MoneyFlowItem[]> {
    const today = isToday(date);
    const cacheKey = `overview_${market || 'all'}_${date || 'today'}`;
    const ttl = today ? OVERVIEW_CACHE_TTL : HIST_CACHE_TTL;
    const cached = this.getCached<MoneyFlowItem[]>(cacheKey, ttl);
    if (cached) return cached;

    const m = (market || 'all').toLowerCase();

    let items: MoneyFlowItem[];
    if (today) {
      items = await this.fetchTodayOverview(m);
    } else {
      items = await this.fetchHistoricalOverview(m, date!);
    }

    items.sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow));
    this.setCache(cacheKey, items);
    this.logger.debug(`Money flow overview (${m}, ${date || 'today'}): ${items.length} items`);
    return items;
  }

  private normalizeSymbolKey(symbol: string): string {
    const s = symbol.toUpperCase().trim();
    if (s.startsWith('HK')) return s;
    const match = s.match(/^(\d+)\.(HK|SS|SZ)$/);
    if (match) return `${match[2]}${match[1]}`;
    return s;
  }

  private async fetchTodayOverview(m: string): Promise<MoneyFlowItem[]> {
    const tasks: Promise<MoneyFlowItem[]>[] = [];

    if (m === 'all' || m === 'cn') tasks.push(this.fetchCNFlowToday());
    if (m === 'all' || m === 'hk') tasks.push(this.fetchHKFlowToday());
    if (m === 'all' || m === 'us') tasks.push(this.fetchUSFlowToday());

    const results = await Promise.all(tasks);
    const items = results.flat();

    try {
      const wlItems = await this.getWatchlistFlowToday(m);
      const existing = new Set(items.map((i) => this.normalizeSymbolKey(i.symbol)));
      for (const wi of wlItems) {
        if (!existing.has(this.normalizeSymbolKey(wi.symbol))) items.push(wi);
      }
    } catch (err) {
      this.logger.warn(`Watchlist flow merge failed: ${err.message}`);
    }

    const seen = new Set<string>();
    const deduped: MoneyFlowItem[] = [];
    for (const item of items) {
      const key = this.normalizeSymbolKey(item.symbol);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    return deduped;
  }

  private async fetchCNFlowToday(): Promise<MoneyFlowItem[]> {
    try {
      const results = await this.akShareService.getQuotesBatch(A_SHARE_POOL.slice(0, 50));
      const quotes = results.filter((r) => r.data).map((r) => r.data!);
      const flowResults = await Promise.all(
        quotes.slice(0, 20).map(async (q) => {
          const flow = await this.akShareService.getMoneyflow(q.symbol);
          return { symbol: q.symbol, flow };
        }),
      );
      const flowMap = new Map<string, MoneyflowResult>();
      flowResults.forEach((r) => {
        if (r.flow) flowMap.set(r.symbol, r.flow);
      });

      return quotes.map((q) => this.transformQuoteToFlowItem(q, 'A股', flowMap.get(q.symbol)));
    } catch (err) {
      this.logger.error(`CN flow fetch failed: ${err.message}`);
      return [];
    }
  }

  private async fetchHKFlowToday(): Promise<MoneyFlowItem[]> {
    try {
      const results = await this.akShareService.getQuotesBatch(HK_STOCK_POOL.slice(0, 30));
      const quotes = results.filter((r) => r.data).map((r) => r.data!);
      return quotes.map((q) => this.transformQuoteToFlowItem(q, '港股', null));
    } catch (err) {
      this.logger.error(`HK flow fetch failed: ${err.message}`);
      return [];
    }
  }

  private async fetchUSFlowToday(): Promise<MoneyFlowItem[]> {
    try {
      const results = await this.akShareService.getQuotesBatch(US_STOCK_POOL.slice(0, 40));
      const quotes = results.filter((r) => r.data).map((r) => r.data!);
      return quotes.map((q) => this.transformQuoteToFlowItem(q, '美股', null));
    } catch (err) {
      this.logger.error(`US flow fetch failed: ${err.message}`);
      return [];
    }
  }

  private transformQuoteToFlowItem(
    q: QuoteResult,
    market: string,
    flow: MoneyflowResult | undefined,
  ): MoneyFlowItem {
    const turnover = q.turnover || q.current_price * q.volume;
    const volRatio = 0;
    const flowIntensity = Math.abs(q.change_percent);

    return {
      symbol: q.symbol,
      name: q.name,
      market,
      price: q.current_price,
      change: q.change,
      changePercent: q.change_percent,
      volume: q.volume,
      avgVolume: 0,
      volumeRatio: volRatio,
      turnover,
      marketCap: q.market_cap || null,
      netFlow: flow?.net_flow ?? turnover * Math.sign(q.change),
      flowIntensity,
      largeNetFlow: (flow?.large_inflow || 0) - (flow?.large_outflow || 0),
      largeInflow: flow?.large_inflow || 0,
      largeOutflow: flow?.large_outflow || 0,
      exchange: market,
    };
  }

  private async fetchHistoricalOverview(m: string, date: string): Promise<MoneyFlowItem[]> {
    const pool: string[] = [];
    if (m === 'all' || m === 'cn') pool.push(...A_SHARE_POOL.slice(0, 40));
    if (m === 'all' || m === 'hk') pool.push(...HK_STOCK_POOL.slice(0, 20));
    if (m === 'all' || m === 'us') pool.push(...US_STOCK_POOL.slice(0, 20));

    const results = await this.akShareService.getQuotesBatch(pool);
    const quotes = results.filter((r) => r.data).map((r) => r.data!);

    quotes.sort((a, b) => b.volume - a.volume);

    const seen = new Set<string>();
    const uniqueQuotes = quotes.filter((q) => {
      const key = this.normalizeSymbolKey(q.symbol);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return uniqueQuotes.map((q) => {
      let market: string;
      if (/^(SH|sh|SZ|sz|BJ|bj)\d{6}$/.test(q.symbol)) market = 'A股';
      else if (/^(HK|hk)\d{4,5}$/.test(q.symbol)) market = '港股';
      else market = '美股';

      const turnover = q.turnover || q.current_price * q.volume;
      return {
        symbol: q.symbol,
        name: q.name,
        market,
        price: q.current_price,
        change: q.change,
        changePercent: q.change_percent,
        volume: q.volume,
        avgVolume: 0,
        volumeRatio: 0,
        turnover,
        marketCap: q.market_cap || null,
        netFlow: turnover * Math.sign(q.change),
        flowIntensity: Math.abs(q.change_percent),
        largeNetFlow: 0,
        largeInflow: 0,
        largeOutflow: 0,
        exchange: '',
      };
    });
  }

  private async getWatchlistFlowToday(market: string): Promise<MoneyFlowItem[]> {
    const allItems = await this.watchlistService.findAll();
    if (allItems.length === 0) return [];

    const filtered =
      market === 'all'
        ? allItems
        : allItems.filter((w) => {
            const m = (w.market || '').toLowerCase();
            if (market === 'cn') return m === 'a股';
            if (market === 'hk') return m === '港股';
            if (market === 'us') return m === '美股';
            return true;
          });

    if (filtered.length === 0) return [];

    const akshareSymbols = filtered.map((w) => this.stockService.normalizeSymbol(w.symbol).akshare);

    try {
      const results = await this.akShareService.getQuotesBatch(akshareSymbols);
      const quotes = results.filter((r) => r.data && r.data.volume > 0).map((r) => r.data!);
      const marketLabel =
        market === 'cn' ? 'A股' : market === 'hk' ? '港股' : market === 'us' ? '美股' : '';
      return quotes.map((q) => this.transformQuoteToFlowItem(q, marketLabel, null));
    } catch {
      return [];
    }
  }

  async getDetail(rawSymbol: string, date?: string): Promise<MoneyFlowDetail | null> {
    const today = isToday(date);
    const cacheKey = `detail_${rawSymbol}_${date || 'today'}`;
    const ttl = today ? DETAIL_CACHE_TTL : HIST_CACHE_TTL;
    const cached = this.getCached<MoneyFlowDetail>(cacheKey, ttl);
    if (cached) return cached;

    const { akshare: symbol } = this.stockService.normalizeSymbol(rawSymbol);

    try {
      const [quote, flow, timeline] = await Promise.all([
        this.akShareService.getQuote(symbol),
        this.akShareService.getMoneyflow(symbol, date),
        this.akShareService.getMoneyflowTimeline(symbol, date),
      ]);

      if (!quote) return null;

      const name = getCnName(symbol, quote.name);

      const summary = {
        totalInflow: flow?.large_inflow || 0 + flow?.medium_inflow || 0 + flow?.small_inflow || 0,
        totalOutflow:
          flow?.large_outflow || 0 + flow?.medium_outflow || 0 + flow?.small_outflow || 0,
        netFlow: flow?.net_flow || 0,
        largeInflow: flow?.large_inflow || 0,
        largeOutflow: flow?.large_outflow || 0,
        largeNetFlow: (flow?.large_inflow || 0) - (flow?.large_outflow || 0),
        mediumInflow: flow?.medium_inflow || 0,
        mediumOutflow: flow?.medium_outflow || 0,
        mediumNetFlow: (flow?.medium_inflow || 0) - (flow?.medium_outflow || 0),
        smallInflow: flow?.small_inflow || 0,
        smallOutflow: flow?.small_outflow || 0,
        smallNetFlow: (flow?.small_inflow || 0) - (flow?.small_outflow || 0),
      };

      const moneyflowTimeline: MoneyFlowDetail['timeline'] = (timeline?.timeline || []).map(
        (t: MoneyflowTimeline, i: number, arr: MoneyflowTimeline[]) => {
          const cumulative = arr
            .slice(0, i + 1)
            .reduce((sum, item) => sum + (item.net_flow || 0), 0);
          return {
            time: t.time,
            inflow: t.inflow || 0,
            outflow: t.outflow || 0,
            netFlow: t.net_flow || 0,
            cumulativeNetFlow: cumulative,
          };
        },
      );

      const detail: MoneyFlowDetail = {
        symbol: rawSymbol,
        name,
        summary,
        timeline: moneyflowTimeline,
        largeBars: [],
      };

      this.setCache(cacheKey, detail);
      return detail;
    } catch (err) {
      this.logger.error(`Money flow detail error for ${symbol}: ${err.message}`);
      return null;
    }
  }
}

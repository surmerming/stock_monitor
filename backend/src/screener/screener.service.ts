import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import YahooFinance from 'yahoo-finance2';
import { ScreenerStrategy } from './strategy.entity';
import {
  OHLCV,
  TechnicalValues,
  TECHNICAL_FIELDS,
  computeIndicators,
} from './technical.util';

const yahooFinance = new YahooFinance();

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CRUMB_TTL = 20 * 60 * 1000;
const UNIVERSE_TTL = 3 * 60 * 1000;

export interface ScreenerFilter {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: number;
  value2?: number;
}

export interface ScanQuery {
  market?: string;
  filters: ScreenerFilter[];
  sortField?: string;
  sortType?: string;
  offset?: number;
  size?: number;
}

export interface ScreenerResultItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  peTTM: number | null;
  pbRatio: number | null;
  psRatio: number | null;
  dividendYield: number | null;
  avgVolume3m: number | null;
  turnoverRate: number | null;
  week52High: number | null;
  week52Low: number | null;
  exchange: string;
  market: string;
}

export interface ScanResult {
  total: number;
  items: ScreenerResultItem[];
}

const YAHOO_FIELD_MAP: Record<string, string> = {
  price: 'intradayprice',
  changePercent: 'percentchange',
  change: 'daychange',
  volume: 'dayvolume',
  avgVolume3m: 'avgdailyvol3m',
  peTTM: 'peratio.lasttwelvemonths',
  pbRatio: 'pricebookmrq',
  psRatio: 'pricesalesttm',
  marketCap: 'intradaymarketcap',
  peg: 'pegratio_5y',
  dividendYield: 'dividendyield',
  trailingDividendYield: 'trailingannualdividendyield',
  fiftyTwoWeekHighPct: 'fiftytwowkhighchangepercent',
  fiftyTwoWeekLowPct: 'fiftytwowklowchangepercent',
  beta: 'beta',
  epsTTM: 'epsttm',
  revenueTTM: 'revenue.lasttwelvemonths',
};

const SORT_FIELD_MAP: Record<string, string> = {
  price: 'intradayprice',
  changePercent: 'percentchange',
  volume: 'dayvolume',
  marketCap: 'intradaymarketcap',
  peTTM: 'peratio.lasttwelvemonths',
  dividendYield: 'dividendyield',
  pbRatio: 'pricebookmrq',
};

const REGION_MAP: Record<string, string> = {
  美股: 'us',
  港股: 'hk',
};

type FieldAccessor = (q: any) => number | null;

const LOCAL_FIELD_MAP: Record<string, FieldAccessor> = {
  price: (q) => q.regularMarketPrice ?? null,
  changePercent: (q) => q.regularMarketChangePercent ?? null,
  change: (q) => q.regularMarketChange ?? null,
  volume: (q) => q.regularMarketVolume ?? null,
  avgVolume3m: (q) => q.averageDailyVolume3Month ?? null,
  peTTM: (q) => q.trailingPE ?? null,
  pbRatio: (q) => q.priceToBook ?? null,
  psRatio: (q) => {
    if (q.marketCap && q.revenue) return q.marketCap / q.revenue;
    return null;
  },
  marketCap: (q) => q.marketCap ?? null,
  dividendYield: (q) =>
    q.trailingAnnualDividendYield != null
      ? q.trailingAnnualDividendYield * 100
      : null,
  trailingDividendYield: (q) =>
    q.trailingAnnualDividendYield != null
      ? q.trailingAnnualDividendYield * 100
      : null,
  epsTTM: (q) => q.epsTrailingTwelveMonths ?? null,
  fiftyTwoWeekHighPct: (q) => {
    if (q.fiftyTwoWeekHigh && q.regularMarketPrice) {
      return (
        ((q.regularMarketPrice - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) *
        100
      );
    }
    return null;
  },
  fiftyTwoWeekLowPct: (q) => {
    if (q.fiftyTwoWeekLow && q.regularMarketPrice) {
      return (
        ((q.regularMarketPrice - q.fiftyTwoWeekLow) / q.fiftyTwoWeekLow) * 100
      );
    }
    return null;
  },
  turnoverRate: (q) => {
    if (q.sharesOutstanding && q.regularMarketVolume) {
      return (q.regularMarketVolume / q.sharesOutstanding) * 100;
    }
    return null;
  },
  volumeRatio: (q) => {
    if (q.regularMarketVolume && q.averageDailyVolume10Day) {
      return q.regularMarketVolume / q.averageDailyVolume10Day;
    }
    return null;
  },
  amplitude: (q) => {
    if (
      q.regularMarketDayHigh &&
      q.regularMarketDayLow &&
      q.regularMarketPreviousClose
    ) {
      return (
        ((q.regularMarketDayHigh - q.regularMarketDayLow) /
          q.regularMarketPreviousClose) *
        100
      );
    }
    return null;
  },
  turnover: (q) => {
    if (q.regularMarketVolume && q.regularMarketPrice) {
      return q.regularMarketVolume * q.regularMarketPrice;
    }
    return null;
  },
  beta: (q) => q.beta ?? null,
  peg: (q) => q.pegRatio ?? null,
};

@Injectable()
export class ScreenerService {
  private readonly logger = new Logger(ScreenerService.name);
  private crumb: string | null = null;
  private cookies: string | null = null;
  private crumbTimestamp = 0;
  private universeCache: { data: any[]; timestamp: number } | null = null;
  private technicalCache = new Map<
    string,
    { data: TechnicalValues; timestamp: number }
  >();
  private readonly TECH_CACHE_TTL = 5 * 60 * 1000;

  constructor(
    @InjectRepository(ScreenerStrategy)
    private readonly strategyRepo: Repository<ScreenerStrategy>,
  ) {}

  // ===================== Yahoo Finance Custom Screener =====================

  private async ensureCrumb(): Promise<void> {
    if (this.crumb && Date.now() - this.crumbTimestamp < CRUMB_TTL) return;

    const res1 = await fetch('https://fc.yahoo.com/', {
      redirect: 'manual',
      headers: { 'User-Agent': UA },
    });

    const cookieEntries: string[] = [];
    if (typeof (res1.headers as any).getSetCookie === 'function') {
      for (const c of (res1.headers as any).getSetCookie()) {
        cookieEntries.push(c.split(';')[0]);
      }
    } else {
      const raw = res1.headers.get('set-cookie');
      if (raw) {
        raw.split(/,(?=\s*[A-Za-z_]+=)/).forEach((c) => {
          cookieEntries.push(c.trim().split(';')[0]);
        });
      }
    }
    this.cookies = cookieEntries.join('; ');

    const res2 = await fetch(
      'https://query2.finance.yahoo.com/v1/test/getcrumb',
      {
        headers: { Cookie: this.cookies, 'User-Agent': UA },
      },
    );
    if (!res2.ok) throw new Error(`Crumb fetch failed: ${res2.status}`);

    this.crumb = await res2.text();
    this.crumbTimestamp = Date.now();
    this.logger.debug(`Yahoo crumb refreshed`);
  }

  private buildYahooQuery(query: ScanQuery): object {
    const operands: any[] = [];

    if (query.market && query.market !== '全部' && REGION_MAP[query.market]) {
      operands.push({
        operator: 'or',
        operands: [
          { operator: 'EQ', operands: ['region', REGION_MAP[query.market]] },
        ],
      });
    }

    for (const filter of query.filters) {
      const yahooField = YAHOO_FIELD_MAP[filter.field];
      if (!yahooField) continue;

      if (filter.operator === 'between' && filter.value2 != null) {
        operands.push({
          operator: 'btwn',
          operands: [yahooField, filter.value, filter.value2],
        });
      } else {
        operands.push({
          operator: filter.operator,
          operands: [yahooField, filter.value],
        });
      }
    }

    if (operands.length === 0) {
      operands.push({ operator: 'gt', operands: ['intradaymarketcap', 0] });
    }

    return {
      size: query.size || 50,
      offset: query.offset || 0,
      sortField:
        SORT_FIELD_MAP[query.sortField || 'marketCap'] || 'intradaymarketcap',
      sortType: query.sortType || 'DESC',
      quoteType: 'EQUITY',
      query: { operator: 'AND', operands },
    };
  }

  private async customScreen(query: ScanQuery): Promise<ScanResult> {
    await this.ensureCrumb();
    const body = this.buildYahooQuery(query);
    const url = `https://query2.finance.yahoo.com/v1/finance/screener?crumb=${encodeURIComponent(this.crumb!)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: this.cookies!,
        'User-Agent': UA,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Yahoo screener API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const result = data?.finance?.result?.[0];
    if (!result) return { total: 0, items: [] };

    const items = (result.quotes || []).map((q: any) =>
      this.transformQuote(q),
    );
    return { total: result.total || items.length, items };
  }

  // ===================== Fallback: Predefined Screener + Local Filter =====================

  private async getStockUniverse(): Promise<any[]> {
    if (
      this.universeCache &&
      Date.now() - this.universeCache.timestamp < UNIVERSE_TTL
    ) {
      return this.universeCache.data;
    }

    const screenerIds: Array<
      | 'day_gainers'
      | 'day_losers'
      | 'most_actives'
      | 'undervalued_growth_stocks'
      | 'growth_technology_stocks'
      | 'undervalued_large_caps'
      | 'aggressive_small_caps'
      | 'small_cap_gainers'
    > = [
      'day_gainers',
      'day_losers',
      'most_actives',
      'undervalued_growth_stocks',
      'growth_technology_stocks',
      'undervalued_large_caps',
      'aggressive_small_caps',
      'small_cap_gainers',
    ];

    const results = await Promise.allSettled(
      screenerIds.map((scrIds) =>
        yahooFinance.screener({ scrIds, count: 250 }),
      ),
    );

    const allQuotes: any[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const quotes = (result.value as any)?.quotes || [];
        for (const q of quotes) {
          if (q?.symbol && !seen.has(q.symbol)) {
            seen.add(q.symbol);
            allQuotes.push(q);
          }
        }
      }
    }

    this.universeCache = { data: allQuotes, timestamp: Date.now() };
    this.logger.debug(`Stock universe: ${allQuotes.length} symbols`);
    return allQuotes;
  }

  private detectMarket(q: any): string {
    const exchange = (
      q.fullExchangeName ||
      q.exchange ||
      ''
    ).toLowerCase();
    const sym = q.symbol || '';
    if (
      exchange.includes('hong kong') ||
      exchange.includes('hkse') ||
      sym.endsWith('.HK')
    ) {
      return '港股';
    }
    if (
      exchange.includes('shanghai') ||
      exchange.includes('shenzhen') ||
      sym.endsWith('.SS') ||
      sym.endsWith('.SZ')
    ) {
      return 'A股';
    }
    return '美股';
  }

  private matchFilter(val: number | null, filter: ScreenerFilter): boolean {
    if (val == null) return false;
    switch (filter.operator) {
      case 'gt':
        return val > filter.value;
      case 'lt':
        return val < filter.value;
      case 'gte':
        return val >= filter.value;
      case 'lte':
        return val <= filter.value;
      case 'between':
        return val >= filter.value && val <= (filter.value2 ?? Infinity);
      default:
        return true;
    }
  }

  private async fallbackScreen(query: ScanQuery): Promise<ScanResult> {
    const universe = await this.getStockUniverse();
    let filtered = [...universe];

    if (query.market && query.market !== '全部') {
      filtered = filtered.filter(
        (q) => this.detectMarket(q) === query.market,
      );
    }

    for (const filter of query.filters) {
      const accessor = LOCAL_FIELD_MAP[filter.field];
      if (!accessor) continue;
      filtered = filtered.filter((q) =>
        this.matchFilter(accessor(q), filter),
      );
    }

    const sortAccessor = LOCAL_FIELD_MAP[query.sortField || 'marketCap'];
    if (sortAccessor) {
      const dir = (query.sortType || 'DESC') === 'DESC' ? -1 : 1;
      filtered.sort(
        (a, b) => ((sortAccessor(a) ?? 0) - (sortAccessor(b) ?? 0)) * dir,
      );
    }

    const total = filtered.length;
    const offset = query.offset || 0;
    const size = query.size || 50;
    const page = filtered.slice(offset, offset + size);

    return {
      total,
      items: page.map((q) => this.transformQuote(q)),
    };
  }

  // ===================== Common =====================

  private transformQuote(q: any): ScreenerResultItem {
    const current = q.regularMarketPrice ?? 0;
    const prevClose = q.regularMarketPreviousClose ?? 0;
    const change = q.regularMarketChange ?? current - prevClose;
    const changePct =
      q.regularMarketChangePercent ??
      (prevClose ? ((current - prevClose) / prevClose) * 100 : 0);

    return {
      symbol: q.symbol || '',
      name: q.shortName || q.longName || q.displayName || q.symbol || '',
      price: current,
      change,
      changePercent: changePct,
      volume: q.regularMarketVolume ?? 0,
      marketCap: q.marketCap ?? null,
      peTTM: q.trailingPE ?? null,
      pbRatio: q.priceToBook ?? null,
      psRatio: q.priceToSales ?? null,
      dividendYield:
        q.trailingAnnualDividendYield != null
          ? +(q.trailingAnnualDividendYield * 100).toFixed(2)
          : null,
      avgVolume3m: q.averageDailyVolume3Month ?? null,
      turnoverRate:
        q.sharesOutstanding && q.regularMarketVolume
          ? +((q.regularMarketVolume / q.sharesOutstanding) * 100).toFixed(4)
          : null,
      week52High: q.fiftyTwoWeekHigh ?? null,
      week52Low: q.fiftyTwoWeekLow ?? null,
      exchange: q.fullExchangeName || q.exchange || '',
      market: this.detectMarket(q),
    };
  }

  // ===================== Technical Indicators =====================

  private async fetchHistoricalBars(symbol: string): Promise<OHLCV[]> {
    const period1 = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const chart = await yahooFinance.chart(symbol, {
      period1,
      interval: '1d' as any,
    });

    if (!chart?.quotes) return [];

    return chart.quotes
      .filter((q: any) => q.close != null)
      .map((q: any) => ({
        open: q.open ?? q.close,
        high: q.high ?? q.close,
        low: q.low ?? q.close,
        close: q.close,
        volume: q.volume ?? 0,
      }));
  }

  private async batchComputeTechnical(
    symbols: string[],
  ): Promise<Map<string, TechnicalValues>> {
    const result = new Map<string, TechnicalValues>();
    const toFetch: string[] = [];

    for (const sym of symbols) {
      const cached = this.technicalCache.get(sym);
      if (cached && Date.now() - cached.timestamp < this.TECH_CACHE_TTL) {
        result.set(sym, cached.data);
      } else {
        toFetch.push(sym);
      }
    }

    const batchSize = 20;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const settled = await Promise.allSettled(
        batch.map(async (sym) => {
          const bars = await this.fetchHistoricalBars(sym);
          const indicators = computeIndicators(bars);
          this.technicalCache.set(sym, {
            data: indicators,
            timestamp: Date.now(),
          });
          return { sym, indicators };
        }),
      );

      for (const s of settled) {
        if (s.status === 'fulfilled') {
          result.set(s.value.sym, s.value.indicators);
        }
      }
    }

    this.logger.debug(
      `Technical indicators computed for ${result.size}/${symbols.length} symbols`,
    );
    return result;
  }

  // ===================== Main Scan =====================

  async scan(query: ScanQuery): Promise<ScanResult> {
    const basicFilters = query.filters.filter(
      (f) => !TECHNICAL_FIELDS.has(f.field),
    );
    const techFilters = query.filters.filter((f) =>
      TECHNICAL_FIELDS.has(f.field),
    );
    const hasTech = techFilters.length > 0;
    const sortIsTech = TECHNICAL_FIELDS.has(query.sortField || '');

    const basicQuery: ScanQuery = {
      ...query,
      filters: basicFilters,
      size: hasTech || sortIsTech ? 200 : (query.size || 50),
      offset: hasTech || sortIsTech ? 0 : (query.offset || 0),
    };

    let baseResult: ScanResult;
    try {
      baseResult = await this.customScreen(basicQuery);
      this.logger.debug(
        `Custom screener returned ${baseResult.total} results`,
      );
    } catch (err) {
      this.logger.warn(
        `Custom screener failed, using fallback: ${err.message}`,
      );
      this.crumb = null;
      baseResult = await this.fallbackScreen(basicQuery);
    }

    if (!hasTech && !sortIsTech) {
      return baseResult;
    }

    const techMap = await this.batchComputeTechnical(
      baseResult.items.map((it) => it.symbol),
    );

    let filtered = baseResult.items;
    if (hasTech) {
      filtered = filtered.filter((item) => {
        const tech = techMap.get(item.symbol);
        if (!tech) return false;
        return techFilters.every((f) =>
          this.matchFilter(tech[f.field] ?? null, f),
        );
      });
    }

    if (sortIsTech) {
      const dir = (query.sortType || 'DESC') === 'DESC' ? -1 : 1;
      filtered.sort((a, b) => {
        const va = (techMap.get(a.symbol)?.[query.sortField!] as number) ?? 0;
        const vb = (techMap.get(b.symbol)?.[query.sortField!] as number) ?? 0;
        return (va - vb) * dir;
      });
    }

    const total = filtered.length;
    const offset = query.offset || 0;
    const size = query.size || 50;
    return { total, items: filtered.slice(offset, offset + size) };
  }

  // ===================== Strategy CRUD =====================

  async getStrategies(): Promise<ScreenerStrategy[]> {
    return this.strategyRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async createStrategy(
    data: Partial<ScreenerStrategy>,
  ): Promise<ScreenerStrategy> {
    const entity = this.strategyRepo.create(data);
    return this.strategyRepo.save(entity);
  }

  async updateStrategy(
    id: number,
    data: Partial<ScreenerStrategy>,
  ): Promise<ScreenerStrategy> {
    await this.strategyRepo.update(id, data);
    return this.strategyRepo.findOneByOrFail({ id });
  }

  async deleteStrategy(id: number): Promise<void> {
    await this.strategyRepo.delete(id);
  }
}

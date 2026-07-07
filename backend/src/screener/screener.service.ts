import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AkShareService, QuoteResult, ChartQuote } from '../akshare/akshare.service';
import { getCnName } from '../common/cn-names';
import { ScreenerStrategy } from './strategy.entity';
import { OHLCV, TechnicalValues, TECHNICAL_FIELDS, computeIndicators } from './technical.util';

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

const SORT_FIELD_MAP: Record<string, string> = {
  price: 'price',
  changePercent: 'changePercent',
  volume: 'volume',
  marketCap: 'marketCap',
  peTTM: 'peTTM',
  dividendYield: 'dividendYield',
  pbRatio: 'pbRatio',
};

const LOCAL_FIELD_MAP: Record<string, (q: QuoteResult) => number | null> = {
  price: (q) => q.current_price,
  changePercent: (q) => q.change_percent,
  change: (q) => q.change,
  volume: (q) => q.volume,
  avgVolume3m: () => null,
  peTTM: (q) => q.pe_ratio || null,
  pbRatio: () => null,
  psRatio: () => null,
  marketCap: (q) => q.market_cap || null,
  dividendYield: () => null,
  epsTTM: () => null,
  fiftyTwoWeekHighPct: () => null,
  fiftyTwoWeekLowPct: () => null,
  turnoverRate: (q) => q.turnover_rate || null,
  volumeRatio: () => null,
  amplitude: () => null,
  turnover: (q) => q.turnover || null,
  beta: () => null,
  peg: () => null,
};

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

const HK_TOP_STOCKS = ['HK2800', 'HK3067', 'HK3033', 'HK2828', 'HK3188'];

const CN_TOP_STOCKS = ['SH600519', 'SH000858', 'SZ000858', 'SH601318', 'SZ000001'];

@Injectable()
export class ScreenerService {
  private readonly logger = new Logger(ScreenerService.name);
  private universeCache: { data: QuoteResult[]; timestamp: number } | null = null;
  private technicalCache = new Map<string, { data: TechnicalValues; timestamp: number }>();
  private readonly TECH_CACHE_TTL = 5 * 60 * 1000;
  private readonly UNIVERSE_TTL = 3 * 60 * 1000;

  constructor(
    @InjectRepository(ScreenerStrategy)
    private readonly strategyRepo: Repository<ScreenerStrategy>,
    private readonly akShareService: AkShareService,
  ) {}

  private async getStockUniverse(): Promise<QuoteResult[]> {
    if (this.universeCache && Date.now() - this.universeCache.timestamp < this.UNIVERSE_TTL) {
      return this.universeCache.data;
    }

    const allSymbols = [...US_TOP_STOCKS, ...HK_TOP_STOCKS, ...CN_TOP_STOCKS];
    const results = await this.akShareService.getQuotesBatch(allSymbols);
    const quotes = results.filter((r) => r.data).map((r) => r.data!);

    this.universeCache = { data: quotes, timestamp: Date.now() };
    this.logger.debug(`Stock universe: ${quotes.length} symbols`);
    return quotes;
  }

  private detectMarket(q: QuoteResult): string {
    const sym = q.symbol || '';
    if (sym.startsWith('HK')) return '港股';
    if (sym.startsWith('SH') || sym.startsWith('SZ')) return 'A股';
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

  private transformQuote(q: QuoteResult): ScreenerResultItem {
    return {
      symbol: q.symbol,
      name: getCnName(q.symbol, q.name),
      price: q.current_price,
      change: q.change,
      changePercent: q.change_percent,
      volume: q.volume,
      marketCap: q.market_cap || null,
      peTTM: q.pe_ratio || null,
      pbRatio: null,
      psRatio: null,
      dividendYield: null,
      avgVolume3m: null,
      turnoverRate: q.turnover_rate || null,
      week52High: null,
      week52Low: null,
      exchange: q.market,
      market: this.detectMarket(q),
    };
  }

  private async fetchHistoricalBars(symbol: string): Promise<OHLCV[]> {
    const chart = await this.akShareService.getChart(symbol, 'daily');
    if (!chart?.quotes) return [];

    return chart.quotes
      .filter((q: ChartQuote) => q.close != null)
      .map((q: ChartQuote) => ({
        open: q.open ?? q.close,
        high: q.high ?? q.close,
        low: q.low ?? q.close,
        close: q.close,
        volume: q.volume ?? 0,
      }));
  }

  private async batchComputeTechnical(symbols: string[]): Promise<Map<string, TechnicalValues>> {
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

    this.logger.debug(`Technical indicators computed for ${result.size}/${symbols.length} symbols`);
    return result;
  }

  async scan(query: ScanQuery): Promise<ScanResult> {
    const basicFilters = query.filters.filter((f) => !TECHNICAL_FIELDS.has(f.field));
    const techFilters = query.filters.filter((f) => TECHNICAL_FIELDS.has(f.field));
    const hasTech = techFilters.length > 0;
    const sortIsTech = TECHNICAL_FIELDS.has(query.sortField || '');

    const universe = await this.getStockUniverse();
    let filtered = [...universe];

    if (query.market && query.market !== '全部') {
      filtered = filtered.filter((q) => this.detectMarket(q) === query.market);
    }

    for (const filter of basicFilters) {
      const accessor = LOCAL_FIELD_MAP[filter.field];
      if (!accessor) continue;
      filtered = filtered.filter((q) => this.matchFilter(accessor(q), filter));
    }

    if (!hasTech && !sortIsTech) {
      const sortAccessor = LOCAL_FIELD_MAP[query.sortField || 'marketCap'];
      if (sortAccessor) {
        const dir = (query.sortType || 'DESC') === 'DESC' ? -1 : 1;
        filtered.sort((a, b) => ((sortAccessor(a) ?? 0) - (sortAccessor(b) ?? 0)) * dir);
      }
      const total = filtered.length;
      const offset = query.offset || 0;
      const size = query.size || 50;
      return {
        total,
        items: filtered.slice(offset, offset + size).map((q) => this.transformQuote(q)),
      };
    }

    const techMap = await this.batchComputeTechnical(filtered.map((it) => it.symbol));

    let techFiltered = filtered;
    if (hasTech) {
      techFiltered = techFiltered.filter((item) => {
        const tech = techMap.get(item.symbol);
        if (!tech) return false;
        return techFilters.every((f) => this.matchFilter(tech[f.field] ?? null, f));
      });
    }

    if (sortIsTech) {
      const dir = (query.sortType || 'DESC') === 'DESC' ? -1 : 1;
      techFiltered.sort((a, b) => {
        const va = (techMap.get(a.symbol)?.[query.sortField!] as number) ?? 0;
        const vb = (techMap.get(b.symbol)?.[query.sortField!] as number) ?? 0;
        return (va - vb) * dir;
      });
    } else {
      const sortAccessor = LOCAL_FIELD_MAP[query.sortField || 'marketCap'];
      if (sortAccessor) {
        const dir = (query.sortType || 'DESC') === 'DESC' ? -1 : 1;
        techFiltered.sort((a, b) => ((sortAccessor(a) ?? 0) - (sortAccessor(b) ?? 0)) * dir);
      }
    }

    const total = techFiltered.length;
    const offset = query.offset || 0;
    const size = query.size || 50;
    return {
      total,
      items: techFiltered.slice(offset, offset + size).map((q) => this.transformQuote(q)),
    };
  }

  async getStrategies(userId: number): Promise<ScreenerStrategy[]> {
    return this.strategyRepo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async createStrategy(userId: number, data: Partial<ScreenerStrategy>): Promise<ScreenerStrategy> {
    const entity = this.strategyRepo.create({ ...data, userId });
    return this.strategyRepo.save(entity);
  }

  async updateStrategy(
    userId: number,
    id: number,
    data: Partial<ScreenerStrategy>,
  ): Promise<ScreenerStrategy> {
    await this.strategyRepo.update({ id, userId }, data);
    return this.strategyRepo.findOneByOrFail({ id, userId });
  }

  async deleteStrategy(userId: number, id: number): Promise<void> {
    await this.strategyRepo.delete({ id, userId });
  }
}

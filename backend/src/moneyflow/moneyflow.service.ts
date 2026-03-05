import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { StockService } from '../stock/stock.service';
import { WatchlistService } from '../watchlist/watchlist.service';

const yahooFinance = new YahooFinance();

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

interface ChartFlowResult {
  largeIn: number;
  largeOut: number;
  netFlow: number;
}

const OVERVIEW_CACHE_TTL = 3 * 60 * 1000;
const DETAIL_CACHE_TTL = 60 * 1000;
const HIST_CACHE_TTL = 10 * 60 * 1000;

const CN_NAMES: Record<string, string> = {
  '600519.SS': '贵州茅台', '000858.SZ': '五粮液', '601318.SS': '中国平安',
  '600036.SS': '招商银行', '000333.SZ': '美的集团', '601398.SS': '工商银行',
  '601939.SS': '建设银行', '600276.SS': '恒瑞医药', '000001.SZ': '平安银行',
  '600000.SS': '浦发银行', '601888.SS': '中国中免', '300750.SZ': '宁德时代',
  '002594.SZ': '比亚迪', '600900.SS': '长江电力', '601012.SS': '隆基绿能',
  '000651.SZ': '格力电器', '601166.SS': '兴业银行', '600809.SS': '山西汾酒',
  '002475.SZ': '立讯精密', '600030.SS': '中信证券', '601668.SS': '中国建筑',
  '002714.SZ': '牧原股份', '600887.SS': '伊利股份', '300059.SZ': '东方财富',
  '002415.SZ': '海康威视', '601899.SS': '紫金矿业', '300760.SZ': '迈瑞医疗',
  '002371.SZ': '北方华创', '600585.SS': '海螺水泥', '000568.SZ': '泸州老窖',
  '601088.SS': '中国神华', '600050.SS': '中国联通', '601857.SS': '中国石油',
  '600028.SS': '中国石化', '600104.SS': '上汽集团', '600309.SS': '万华化学',
  '000002.SZ': '万科A', '300015.SZ': '爱尔眼科', '601628.SS': '中国人寿',
  '002304.SZ': '洋河股份', '002230.SZ': '科大讯飞', '300124.SZ': '汇川技术',
  '600745.SS': '闻泰科技', '002352.SZ': '顺丰控股', '601919.SS': '中远海控',
  '603259.SS': '药明康德', '600436.SS': '片仔癀', '002049.SZ': '紫光国微',
  '601225.SS': '陕西煤业', '300274.SZ': '阳光电源', '600438.SS': '通威股份',
  '002466.SZ': '天齐锂业', '601658.SS': '邮储银行', '300033.SZ': '同花顺',
  '600048.SS': '保利发展', '002241.SZ': '歌尔股份', '601601.SS': '中国太保',
  '000725.SZ': '京东方A', '600690.SS': '海尔智家', '603986.SS': '兆易创新',
  '0700.HK': '腾讯控股', '9988.HK': '阿里巴巴-W', '9618.HK': '京东集团-SW',
  '3690.HK': '美团-W', '1810.HK': '小米集团-W', '0005.HK': '汇丰控股',
  '0941.HK': '中国移动', '0388.HK': '香港交易所', '2318.HK': '中国平安',
  '1299.HK': '友邦保险', '0001.HK': '长和', '0027.HK': '银河娱乐',
  '2020.HK': '安踏体育', '9999.HK': '网易-S', '1024.HK': '快手-W',
  '0066.HK': '港铁公司', '0016.HK': '新鸿基地产', '0883.HK': '中国海油',
  '0002.HK': '中电控股', '0003.HK': '中华煤气', '0011.HK': '恒生银行',
  '0012.HK': '恒基地产', '1038.HK': '长江基建', '0006.HK': '电能实业',
  '0823.HK': '领展房产', '2628.HK': '中国人寿', '1928.HK': '金沙中国',
  '0669.HK': '创科实业', '0981.HK': '中芯国际', '9626.HK': '哔哩哔哩-W',
  '6098.HK': '碧桂园服务', '2269.HK': '药明生物', '1211.HK': '比亚迪股份',
  '0268.HK': '金蝶国际', '3988.HK': '中国银行', '1398.HK': '工商银行',
  '2388.HK': '中银香港', '0939.HK': '建设银行', '0386.HK': '中国石化',
  '1109.HK': '华润置地',
};

const A_SHARE_POOL = Object.keys(CN_NAMES).filter((s) => /\.(SS|SZ|BJ)$/i.test(s));
const HK_STOCK_POOL = Object.keys(CN_NAMES).filter((s) => /\.HK$/i.test(s));

const US_STOCK_POOL = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'BRK-B',
  'JPM', 'V', 'UNH', 'MA', 'JNJ', 'PG', 'HD', 'AVGO', 'COST', 'MRK',
  'ABBV', 'CRM', 'AMD', 'NFLX', 'PEP', 'KO', 'TMO', 'ADBE', 'LIN',
  'WMT', 'ACN', 'MCD', 'CSCO', 'ABT', 'DHR', 'ORCL', 'INTC', 'DIS',
  'VZ', 'CMCSA', 'NKE', 'PM', 'TXN', 'QCOM', 'BA', 'GE', 'CAT',
  'IBM', 'AMAT', 'ISRG', 'NOW', 'UBER',
];

function isToday(dateStr?: string): boolean {
  if (!dateStr) return true;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

function parseDateRange(dateStr: string): { period1: Date; period2: Date } {
  const d = new Date(dateStr + 'T00:00:00');
  const period1 = new Date(d);
  period1.setDate(period1.getDate() - 1);
  const period2 = new Date(d);
  period2.setDate(period2.getDate() + 1);
  return { period1, period2 };
}

function isSameDay(date: Date, dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return (
    date.getFullYear() === d.getFullYear() &&
    date.getMonth() === d.getMonth() &&
    date.getDate() === d.getDate()
  );
}

@Injectable()
export class MoneyFlowService {
  private readonly logger = new Logger(MoneyFlowService.name);
  private cache = new Map<string, CacheEntry<any>>();

  constructor(
    private readonly stockService: StockService,
    private readonly watchlistService: WatchlistService,
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

  // ── Overview ───────────────────────────────────────────────

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

  private async fetchTodayOverview(m: string): Promise<MoneyFlowItem[]> {
    const tasks: Promise<MoneyFlowItem[]>[] = [];

    if (m === 'all' || m === 'us') tasks.push(this.fetchUSFlowToday());
    if (m === 'all' || m === 'cn') tasks.push(this.fetchMarketFlowToday(A_SHARE_POOL, 'A股'));
    if (m === 'all' || m === 'hk') tasks.push(this.fetchMarketFlowToday(HK_STOCK_POOL, '港股'));

    const results = await Promise.all(tasks);
    let items = results.flat();

    try {
      const wlItems = await this.getWatchlistFlowToday(m);
      const existing = new Set(items.map((i) => i.symbol));
      for (const wi of wlItems) {
        if (!existing.has(wi.symbol)) items.push(wi);
      }
    } catch (err) {
      this.logger.warn(`Watchlist flow merge failed: ${err.message}`);
    }

    return items;
  }

  private async fetchHistoricalOverview(
    m: string,
    date: string,
  ): Promise<MoneyFlowItem[]> {
    let pool: string[] = [];
    if (m === 'all' || m === 'cn') pool.push(...A_SHARE_POOL);
    if (m === 'all' || m === 'hk') pool.push(...HK_STOCK_POOL);
    if (m === 'all' || m === 'us') pool.push(...US_STOCK_POOL);

    const { period1, period2 } = parseDateRange(date);
    const CONCURRENCY = 10;
    const dailyData: Array<{
      symbol: string;
      close: number;
      open: number;
      high: number;
      low: number;
      volume: number;
      prevClose: number;
    }> = [];

    for (let i = 0; i < pool.length; i += CONCURRENCY) {
      const chunk = pool.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (sym) => {
          try {
            const res: any = await yahooFinance.chart(
              sym,
              { period1, period2, interval: '1d' as any },
              { validateResult: false },
            );
            if (!res?.quotes?.length) return null;
            const dayBar = res.quotes.find((q: any) =>
              q.date && isSameDay(new Date(q.date), date),
            );
            if (!dayBar || dayBar.close == null || dayBar.volume == null) return null;

            const idx = res.quotes.indexOf(dayBar);
            const prevBar = idx > 0 ? res.quotes[idx - 1] : null;
            const prevClose = prevBar?.close ?? dayBar.open ?? dayBar.close;

            return {
              symbol: sym,
              close: dayBar.close,
              open: dayBar.open ?? dayBar.close,
              high: dayBar.high ?? dayBar.close,
              low: dayBar.low ?? dayBar.close,
              volume: dayBar.volume,
              prevClose,
            };
          } catch {
            return null;
          }
        }),
      );
      for (const r of results) {
        if (r) dailyData.push(r);
      }
    }

    dailyData.sort((a, b) => b.volume - a.volume);
    const top = dailyData.slice(0, 40);

    const flowResults = await Promise.all(
      top.slice(0, 20).map(async (d) => {
        try {
          return await this.computeFlowFromChart(d.symbol, date);
        } catch {
          return null;
        }
      }),
    );
    const flowMap = new Map<string, ChartFlowResult>();
    top.slice(0, 20).forEach((d, i) => {
      if (flowResults[i]) flowMap.set(d.symbol, flowResults[i]!);
    });

    return top.map((d) => {
      const change = d.close - d.prevClose;
      const changePct = d.prevClose ? (change / d.prevClose) * 100 : 0;
      const turnover = d.close * d.volume;

      const flow = flowMap.get(d.symbol);
      const netFlow = flow?.netFlow ?? turnover * Math.sign(change);
      const largeIn = flow?.largeIn ?? 0;
      const largeOut = flow?.largeOut ?? 0;

      let market: string;
      if (/\.(SS|SZ|BJ)$/i.test(d.symbol)) market = 'A股';
      else if (/\.HK$/i.test(d.symbol)) market = '港股';
      else market = '美股';

      return {
        symbol: d.symbol,
        name: CN_NAMES[d.symbol] || d.symbol,
        market,
        price: d.close,
        change,
        changePercent: changePct,
        volume: d.volume,
        avgVolume: 0,
        volumeRatio: 0,
        turnover,
        marketCap: null,
        netFlow,
        flowIntensity: Math.abs(changePct),
        largeNetFlow: largeIn - largeOut,
        largeInflow: largeIn,
        largeOutflow: largeOut,
        exchange: '',
      };
    });
  }

  // ── Today helpers ──────────────────────────────────────────

  private async fetchUSFlowToday(): Promise<MoneyFlowItem[]> {
    try {
      const result = await yahooFinance.screener(
        { scrIds: 'most_actives', count: 40 },
      );
      return this.processQuotesWithFlow(result.quotes, '美股');
    } catch (err) {
      this.logger.error(`US flow fetch failed: ${err.message}`);
      return [];
    }
  }

  private async fetchMarketFlowToday(
    pool: string[],
    marketLabel: string,
  ): Promise<MoneyFlowItem[]> {
    try {
      const CHUNK = 50;
      const allRaw: any[] = [];
      for (let i = 0; i < pool.length; i += CHUNK) {
        const chunk = pool.slice(i, i + CHUNK);
        try {
          const res: any = await yahooFinance.quote(chunk, {}, { validateResult: false });
          const arr = Array.isArray(res) ? res : [res];
          allRaw.push(...arr.filter((q: any) => q?.symbol));
        } catch (err) {
          this.logger.warn(`${marketLabel} quote chunk failed: ${err.message}`);
        }
      }
      allRaw.sort(
        (a, b) => (b.regularMarketVolume ?? 0) - (a.regularMarketVolume ?? 0),
      );
      return this.processQuotesWithFlow(allRaw.slice(0, 30), marketLabel);
    } catch (err) {
      this.logger.error(`${marketLabel} flow fetch failed: ${err.message}`);
      return [];
    }
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

    const yahooSymbols = filtered.map(
      (w) => this.stockService.normalizeSymbol(w.symbol).yahoo,
    );

    try {
      const res: any = await yahooFinance.quote(yahooSymbols, {}, { validateResult: false });
      const arr = Array.isArray(res) ? res : [res];
      const quotes = arr.filter((q: any) => q?.symbol && (q.regularMarketVolume ?? 0) > 0);
      const marketLabel = market === 'cn' ? 'A股' : market === 'hk' ? '港股' : market === 'us' ? '美股' : '';
      return this.processQuotesWithFlow(quotes.slice(0, 15), marketLabel, false);
    } catch {
      return [];
    }
  }

  private async processQuotesWithFlow(
    quotes: any[],
    defaultMarket: string,
    withChart = true,
  ): Promise<MoneyFlowItem[]> {
    const flowMap = new Map<string, ChartFlowResult>();

    if (withChart && quotes.length > 0) {
      const topByVol = [...quotes]
        .sort((a, b) => (b.regularMarketVolume ?? 0) - (a.regularMarketVolume ?? 0))
        .slice(0, 20);

      const chartResults = await Promise.all(
        topByVol.map(async (q: any) => {
          try {
            return await this.computeFlowFromChart(q.symbol);
          } catch {
            return null;
          }
        }),
      );

      topByVol.forEach((q: any, i: number) => {
        if (chartResults[i]) flowMap.set(q.symbol, chartResults[i]!);
      });
    }

    return quotes.map((q: any) => {
      const price = q.regularMarketPrice ?? 0;
      const volume = q.regularMarketVolume ?? 0;
      const avgVol = q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? 1;
      const volRatio = avgVol > 0 ? volume / avgVol : 0;
      const turnover = price * volume;
      const change = q.regularMarketChange ?? 0;
      const changePct = q.regularMarketChangePercent ?? 0;

      const flow = flowMap.get(q.symbol);
      const netFlow = flow?.netFlow ?? turnover * Math.sign(change) * Math.min(volRatio, 3);
      const largeIn = flow?.largeIn ?? 0;
      const largeOut = flow?.largeOut ?? 0;
      const flowIntensity = avgVol > 0 ? volRatio * Math.abs(changePct) : 0;

      let market = defaultMarket;
      if (!market) {
        if (/\.(SS|SZ|BJ)$/i.test(q.symbol)) market = 'A股';
        else if (/\.HK$/i.test(q.symbol)) market = '港股';
        else market = '美股';
      }

      return {
        symbol: q.symbol,
        name: CN_NAMES[q.symbol] || q.shortName || q.longName || q.displayName || q.symbol,
        market,
        price,
        change,
        changePercent: changePct,
        volume,
        avgVolume: avgVol,
        volumeRatio: volRatio,
        turnover,
        marketCap: q.marketCap ?? null,
        netFlow,
        flowIntensity,
        largeNetFlow: largeIn - largeOut,
        largeInflow: largeIn,
        largeOutflow: largeOut,
        exchange: q.fullExchangeName || q.exchange || '',
      };
    });
  }

  // ── Chart flow computation ─────────────────────────────────

  private async computeFlowFromChart(
    symbol: string,
    date?: string,
  ): Promise<ChartFlowResult | null> {
    try {
      let period1: Date;
      let period2: Date | undefined;

      if (date) {
        const range = parseDateRange(date);
        period1 = range.period1;
        period2 = range.period2;
      } else {
        period1 = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const opts: any = { period1, interval: '5m' };
      if (period2) opts.period2 = period2;

      const result: any = await yahooFinance.chart(
        symbol,
        opts,
        { validateResult: false },
      );
      if (!result?.quotes?.length) return null;

      let bars = result.quotes.filter(
        (q: any) => q.volume != null && q.close != null && q.open != null,
      );

      if (date) {
        bars = bars.filter((q: any) =>
          q.date && isSameDay(new Date(q.date), date),
        );
      }

      if (bars.length < 3) return null;

      const avgBarVolume =
        bars.reduce((s: number, b: any) => s + (b.volume || 0), 0) / bars.length;
      const largeThreshold = avgBarVolume * 2.5;

      let totalInflow = 0;
      let totalOutflow = 0;
      let largeIn = 0;
      let largeOut = 0;

      for (const bar of bars) {
        const tp = ((bar.high ?? bar.close) + (bar.low ?? bar.close) + bar.close) / 3;
        const amount = tp * (bar.volume || 0);
        const isBuy = bar.close >= bar.open;

        if (isBuy) {
          totalInflow += amount;
          if ((bar.volume || 0) >= largeThreshold) largeIn += amount;
        } else {
          totalOutflow += amount;
          if ((bar.volume || 0) >= largeThreshold) largeOut += amount;
        }
      }

      return { largeIn, largeOut, netFlow: totalInflow - totalOutflow };
    } catch {
      return null;
    }
  }

  // ── Detail ─────────────────────────────────────────────────

  async getDetail(rawSymbol: string, date?: string): Promise<MoneyFlowDetail | null> {
    const today = isToday(date);
    const cacheKey = `detail_${rawSymbol}_${date || 'today'}`;
    const ttl = today ? DETAIL_CACHE_TTL : HIST_CACHE_TTL;
    const cached = this.getCached<MoneyFlowDetail>(cacheKey, ttl);
    if (cached) return cached;

    const { yahoo: symbol } = this.stockService.normalizeSymbol(rawSymbol);

    try {
      let period1: Date;
      let period2: Date | undefined;

      if (date && !today) {
        const range = parseDateRange(date);
        period1 = range.period1;
        period2 = range.period2;
      } else {
        period1 = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const chartOpts: any = { period1, interval: '1m' };
      if (period2) chartOpts.period2 = period2;

      const [chartResult, quoteResult]: any[] = await Promise.all([
        yahooFinance.chart(symbol, chartOpts, { validateResult: false }),
        yahooFinance.quote(symbol, {}, { validateResult: false }),
      ]);

      if (!chartResult?.quotes?.length) return null;

      const name = CN_NAMES[symbol] || quoteResult?.shortName || quoteResult?.longName || symbol;

      let bars = chartResult.quotes.filter(
        (q: any) => q.volume != null && q.close != null && q.open != null && q.high != null,
      );

      if (date && !today) {
        bars = bars.filter((q: any) =>
          q.date && isSameDay(new Date(q.date), date),
        );
      }

      if (bars.length < 5) return null;

      const avgBarVolume =
        bars.reduce((s: number, b: any) => s + (b.volume || 0), 0) / bars.length;
      const largeThreshold = avgBarVolume * 3;
      const mediumLow = avgBarVolume * 0.5;

      let totalInflow = 0;
      let totalOutflow = 0;
      let largeInflow = 0;
      let largeOutflow = 0;
      let mediumInflow = 0;
      let mediumOutflow = 0;
      let smallInflow = 0;
      let smallOutflow = 0;

      const timeline: MoneyFlowDetail['timeline'] = [];
      const largeBars: MoneyFlowDetail['largeBars'] = [];
      let cumulativeNet = 0;

      const BUCKET_MINUTES = 5;
      let bucketStart: string | null = null;
      let bucketIn = 0;
      let bucketOut = 0;

      for (const bar of bars) {
        const tp = (bar.high + bar.low + bar.close) / 3;
        const vol = bar.volume || 0;
        const amount = tp * vol;
        const isBuy = bar.close >= bar.open;
        const time = new Date(bar.date).toISOString();

        if (isBuy) {
          totalInflow += amount;
          if (vol >= largeThreshold) largeInflow += amount;
          else if (vol >= mediumLow) mediumInflow += amount;
          else smallInflow += amount;
        } else {
          totalOutflow += amount;
          if (vol >= largeThreshold) largeOutflow += amount;
          else if (vol >= mediumLow) mediumOutflow += amount;
          else smallOutflow += amount;
        }

        if (vol >= largeThreshold) {
          largeBars.push({
            time,
            volume: vol,
            amount,
            direction: isBuy ? 'buy' : 'sell',
            price: bar.close,
          });
        }

        const barDate = new Date(bar.date);
        const bucketKey = `${barDate.getHours()}:${String(Math.floor(barDate.getMinutes() / BUCKET_MINUTES) * BUCKET_MINUTES).padStart(2, '0')}`;

        if (bucketStart !== bucketKey) {
          if (bucketStart !== null) {
            cumulativeNet += bucketIn - bucketOut;
            timeline.push({
              time: bucketStart,
              inflow: bucketIn,
              outflow: bucketOut,
              netFlow: bucketIn - bucketOut,
              cumulativeNetFlow: cumulativeNet,
            });
          }
          bucketStart = bucketKey;
          bucketIn = 0;
          bucketOut = 0;
        }

        if (isBuy) bucketIn += amount;
        else bucketOut += amount;
      }

      if (bucketStart !== null) {
        cumulativeNet += bucketIn - bucketOut;
        timeline.push({
          time: bucketStart,
          inflow: bucketIn,
          outflow: bucketOut,
          netFlow: bucketIn - bucketOut,
          cumulativeNetFlow: cumulativeNet,
        });
      }

      const detail: MoneyFlowDetail = {
        symbol: rawSymbol,
        name,
        summary: {
          totalInflow,
          totalOutflow,
          netFlow: totalInflow - totalOutflow,
          largeInflow,
          largeOutflow,
          largeNetFlow: largeInflow - largeOutflow,
          mediumInflow,
          mediumOutflow,
          mediumNetFlow: mediumInflow - mediumOutflow,
          smallInflow,
          smallOutflow,
          smallNetFlow: smallInflow - smallOutflow,
        },
        timeline,
        largeBars,
      };

      this.setCache(cacheKey, detail);
      return detail;
    } catch (err) {
      this.logger.error(`Money flow detail error for ${symbol}: ${err.message}`);
      return null;
    }
  }
}

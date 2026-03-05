import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { getCnName } from '../common/cn-names';

const yahooFinance = new YahooFinance();

const US_SECTOR_ETFS: { symbol: string; name: string; sector: string }[] = [
  { symbol: 'XLK', name: '科技', sector: 'Technology' },
  { symbol: 'XLF', name: '金融', sector: 'Financial' },
  { symbol: 'XLV', name: '医疗', sector: 'Healthcare' },
  { symbol: 'XLE', name: '能源', sector: 'Energy' },
  { symbol: 'XLY', name: '可选消费', sector: 'Consumer Discretionary' },
  { symbol: 'XLP', name: '必选消费', sector: 'Consumer Staples' },
  { symbol: 'XLI', name: '工业', sector: 'Industrials' },
  { symbol: 'XLB', name: '材料', sector: 'Materials' },
  { symbol: 'XLRE', name: '房地产', sector: 'Real Estate' },
  { symbol: 'XLU', name: '公用事业', sector: 'Utilities' },
  { symbol: 'XLC', name: '通信', sector: 'Communication' },
];

const HK_SECTOR_ETFS: { symbol: string; name: string; sector: string }[] = [
  { symbol: '2800.HK', name: '盈富基金', sector: '大盘' },
  { symbol: '3067.HK', name: '安硕恒生科技', sector: '科技' },
  { symbol: '3033.HK', name: '南方恒生科技', sector: '科技' },
  { symbol: '2828.HK', name: '恒生中国企业', sector: '国企' },
  { symbol: '3188.HK', name: '华夏沪深300', sector: '内地' },
];

const CN_SECTOR_ETFS: { symbol: string; name: string; sector: string }[] = [
  { symbol: '512480.SS', name: '半导体ETF', sector: '半导体' },
  { symbol: '515030.SS', name: '新能源车ETF', sector: '新能源' },
  { symbol: '512690.SS', name: '白酒ETF', sector: '白酒' },
  { symbol: '512010.SS', name: '医药ETF', sector: '医药' },
  { symbol: '512880.SS', name: '证券ETF', sector: '证券' },
  { symbol: '512800.SS', name: '银行ETF', sector: '银行' },
  { symbol: '515790.SS', name: '光伏ETF', sector: '光伏' },
  { symbol: '512200.SS', name: '房地产ETF', sector: '地产' },
  { symbol: '515050.SS', name: '5GETF', sector: '5G/通信' },
  { symbol: '512980.SS', name: '传媒ETF', sector: '传媒' },
  { symbol: '159869.SZ', name: '游戏ETF', sector: '游戏' },
  { symbol: '512660.SS', name: '军工ETF', sector: '军工' },
  { symbol: '512170.SS', name: '医疗ETF', sector: '医疗' },
  { symbol: '159825.SZ', name: '农业ETF', sector: '农业' },
];

export interface SectorRotationItem {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change1d: number;
  change5d: number;
  change1m: number;
  change3m: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  rsScore: number;
  momentum: number;
}

export interface SectorHeatmapItem {
  symbol: string;
  name: string;
  sector: string;
  change1d: number;
  change5d: number;
  change1m: number;
  marketCap: number | null;
}

interface BarData {
  close: number;
  volume: number;
}

@Injectable()
export class SectorService {
  private readonly logger = new Logger(SectorService.name);
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 3 * 60 * 1000;

  private getETFs(market: string) {
    switch (market) {
      case '港股':
        return HK_SECTOR_ETFS;
      case 'A股':
        return CN_SECTOR_ETFS;
      default:
        return US_SECTOR_ETFS;
    }
  }

  private pctChange(current: number, ref: number): number {
    return ref > 0 ? ((current - ref) / ref) * 100 : 0;
  }

  private async fetchSymbolData(sym: string): Promise<{
    price: number;
    prevClose: number;
    bars: BarData[];
    volume: number;
    avgVolume: number;
    marketCap: number | null;
    shortName: string;
  } | null> {
    try {
      const chartRes = await yahooFinance.chart(sym, {
        period1: new Date(Date.now() - 100 * 24 * 3600 * 1000),
        interval: '1d' as any,
      });

      const rawBars = (chartRes as any)?.quotes || [];
      const bars: BarData[] = rawBars
        .filter((b: any) => b.close != null && b.close > 0)
        .map((b: any) => ({ close: b.close, volume: b.volume ?? 0 }));

      if (bars.length < 2) {
        this.logger.warn(`${sym}: insufficient bar data (${bars.length} bars)`);
        return null;
      }

      const lastBar = bars[bars.length - 1];
      const prevBar = bars[bars.length - 2];

      let price = lastBar.close;
      let prevClose = prevBar.close;
      let volume = lastBar.volume;
      let avgVolume = 0;
      let marketCap: number | null = null;
      let shortName = sym;

      const recentVols = bars.slice(-20).map((b) => b.volume);
      if (recentVols.length > 0) {
        avgVolume = recentVols.reduce((s, v) => s + v, 0) / recentVols.length;
      }

      try {
        const q: any = await yahooFinance.quote(sym, {}, { validateResult: false });
        if (q) {
          if (q.regularMarketPrice > 0) price = q.regularMarketPrice;
          if (q.regularMarketPreviousClose > 0) prevClose = q.regularMarketPreviousClose;
          if (q.regularMarketVolume > 0) volume = q.regularMarketVolume;
          if (q.averageDailyVolume3Month > 0) avgVolume = q.averageDailyVolume3Month;
          else if (q.averageDailyVolume10Day > 0) avgVolume = q.averageDailyVolume10Day;
          marketCap = q.marketCap ?? null;
          shortName = getCnName(sym, q.shortName || q.longName || sym);
        }
      } catch (err) {
        this.logger.debug(`${sym}: quote fallback to chart data - ${err.message}`);
      }

      return { price, prevClose, bars, volume, avgVolume, marketCap, shortName };
    } catch (err) {
      this.logger.warn(`${sym}: chart fetch failed - ${err.message}`);
      return null;
    }
  }

  async getRotation(market: string): Promise<SectorRotationItem[]> {
    const cacheKey = `rotation:${market}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const etfs = this.getETFs(market);
    const items: SectorRotationItem[] = [];

    const settled = await Promise.allSettled(
      etfs.map(async (etf) => {
        const data = await this.fetchSymbolData(etf.symbol);
        if (!data || data.price <= 0) return null;

        const { price, prevClose, bars, volume, avgVolume } = data;

        const change1d = this.pctChange(price, prevClose);

        const barClose = (n: number) =>
          bars.length > n ? bars[bars.length - 1 - n].close : 0;

        const change5d = this.pctChange(price, barClose(5));
        const change1m = this.pctChange(price, barClose(21));
        const change3m = this.pctChange(price, barClose(63));

        const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;
        const rsScore =
          change1d * 0.1 + change5d * 0.2 + change1m * 0.35 + change3m * 0.35;
        const momentum = change1m - change3m / 3;

        return {
          symbol: etf.symbol,
          name: etf.name,
          sector: etf.sector,
          price,
          change1d,
          change5d,
          change1m,
          change3m,
          volume,
          avgVolume,
          volumeRatio,
          rsScore,
          momentum,
        };
      }),
    );

    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) items.push(s.value);
    }

    items.sort((a, b) => b.rsScore - a.rsScore);

    this.cache.set(cacheKey, { data: items, timestamp: Date.now() });
    this.logger.debug(`Rotation ${market}: ${items.length} items, prices: ${items.map((i) => `${i.name}=${i.price}`).join(', ')}`);
    return items;
  }

  async getHeatmap(market: string): Promise<SectorHeatmapItem[]> {
    const cacheKey = `heatmap:${market}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const etfs = this.getETFs(market);
    const items: SectorHeatmapItem[] = [];

    const settled = await Promise.allSettled(
      etfs.map(async (etf) => {
        const data = await this.fetchSymbolData(etf.symbol);
        if (!data || data.price <= 0) return null;

        const { price, prevClose, bars } = data;

        const change1d = this.pctChange(price, prevClose);

        const barClose = (n: number) =>
          bars.length > n ? bars[bars.length - 1 - n].close : 0;

        const change5d = this.pctChange(price, barClose(5));
        const change1m = this.pctChange(price, barClose(21));

        return {
          symbol: etf.symbol,
          name: etf.name,
          sector: etf.sector,
          change1d,
          change5d,
          change1m,
          marketCap: data.marketCap,
        };
      }),
    );

    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) items.push(s.value);
    }

    this.cache.set(cacheKey, { data: items, timestamp: Date.now() });
    return items;
  }
}

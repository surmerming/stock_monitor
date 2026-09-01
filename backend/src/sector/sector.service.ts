import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AkShareService, ChartQuote } from '../akshare/akshare.service';

// ═══════════════════════════════════════════════════════════
// 行业分类 ETF 清单（港股/美股无东财真实板块接口，用 ETF 模拟）
// ═══════════════════════════════════════════════════════════

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
  { symbol: 'HK2800', name: '盈富基金', sector: '大盘' },
  { symbol: 'HK3067', name: '安硕恒生科技', sector: '科技' },
  { symbol: 'HK3033', name: '南方恒生科技', sector: '科技' },
  { symbol: 'HK2828', name: '恒生中国企业', sector: '国企' },
  { symbol: 'HK3188', name: '华夏沪深300', sector: '内地' },
];

// A 股 ETF 仅作为 fallback — 优先用东财真实板块
const CN_SECTOR_ETFS: { symbol: string; name: string; sector: string }[] = [
  { symbol: 'SH512480', name: '半导体ETF', sector: '半导体' },
  { symbol: 'SH515030', name: '新能源车ETF', sector: '新能源' },
  { symbol: 'SH512690', name: '白酒ETF', sector: '白酒' },
  { symbol: 'SH512010', name: '医药ETF', sector: '医药' },
  { symbol: 'SH512880', name: '证券ETF', sector: '证券' },
  { symbol: 'SH512800', name: '银行ETF', sector: '银行' },
  { symbol: 'SH515790', name: '光伏ETF', sector: '光伏' },
  { symbol: 'SH512200', name: '房地产ETF', sector: '地产' },
  { symbol: 'SH515050', name: '5GETF', sector: '5G/通信' },
  { symbol: 'SH512980', name: '传媒ETF', sector: '传媒' },
  { symbol: 'SZ159869', name: '游戏ETF', sector: '游戏' },
  { symbol: 'SH512660', name: '军工ETF', sector: '军工' },
  { symbol: 'SH512170', name: '医疗ETF', sector: '医疗' },
  { symbol: 'SZ159825', name: '农业ETF', sector: '农业' },
];

// ═══════════════════════════════════════════════════════════
// 接口定义
// ═══════════════════════════════════════════════════════════

/** 东财真实板块（A 股行业/概念）排行项 */
export interface EmSectorItem {
  code: string; // BK 板块代码，如 BK1296
  name: string; // 板块名称
  change1d: number; // 当日涨跌幅 %
  turnover: number; // 成交额（元）
  turnoverRate: number; // 换手率 %
  totalMarketCap: number; // 总市值（元）
  amplitude: number; // 振幅 %
  leadingStock?: string; // 领涨股（暂不填充）
}

/** ETF 模拟的板块轮动项（兼容旧接口） */
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

// ═══════════════════════════════════════════════════════════
// 东财 clist 常量
// ═══════════════════════════════════════════════════════════

const EM_PUSH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Referer: 'https://data.eastmoney.com/bkzjhy/hybk.html',
};

/**
 * 东财板块分类 fs 参数:
 *   m:90+t:2 = A 股行业板块（申万全分级，496 个）
 *   m:90+t:3 = A 股概念板块（504 个）
 */
const EM_SECTOR_FS: Record<'industry' | 'concept', string> = {
  industry: 'm:90+t:2',
  concept: 'm:90+t:3',
};

// ═══════════════════════════════════════════════════════════
// SectorService
// ═══════════════════════════════════════════════════════════

@Injectable()
export class SectorService {
  private readonly logger = new Logger(SectorService.name);
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 3 * 60 * 1000;

  constructor(private readonly akShareService: AkShareService) {}

  // ─── 缓存 ─────────────────────────────────────────────────

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ─── 东财 clist 抓取 ────────────────────────────────────────

  /**
   * 调东财 push2delay clist 接口拿真实板块排行。
   * 按涨跌幅降序返回，最多取 top limit 个。
   * 仅覆盖 A 股（东财港股无分类板块）。
   */
  async fetchEmSectorClist(
    type: 'industry' | 'concept',
    sortBy: 'change' | 'turnover' | 'marketcap' = 'change',
    limit = 50,
  ): Promise<EmSectorItem[]> {
    const cacheKey = `em_sector:${type}:${sortBy}:${limit}`;
    const cached = this.getCached<EmSectorItem[]>(cacheKey);
    if (cached) return cached;

    const fs = EM_SECTOR_FS[type];
    const fid = sortBy === 'change' ? 'f3' : sortBy === 'turnover' ? 'f6' : 'f20';

    const urls = [
      `https://push2delay.eastmoney.com/api/qt/clist/get?pn=1&pz=${limit}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=${fid}&fs=${fs}&fields=f2,f3,f6,f7,f8,f12,f14,f20`,
      // fallback host
      `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${limit}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=${fid}&fs=${fs}&fields=f2,f3,f6,f7,f8,f12,f14,f20`,
    ];

    let lastError: unknown = null;
    for (const url of urls) {
      try {
        const resp = await axios.get(url, {
          timeout: 8000,
          headers: EM_PUSH_HEADERS,
        });
        const diff = resp.data?.data?.diff;
        if (!Array.isArray(diff) || diff.length === 0) {
          continue;
        }

        const items: EmSectorItem[] = diff
          .map((r: any) => {
            const change1d = Number(r.f3);
            // 东财用 '-' 表示停牌/无数据
            if (isNaN(change1d) || r.f3 === '-' || r.f3 == null) return null;
            return {
              code: String(r.f12 ?? ''),
              name: String(r.f14 ?? ''),
              change1d,
              turnover: Number(r.f6) || 0,
              turnoverRate: Number(r.f8) || 0,
              totalMarketCap: Number(r.f20) || 0,
              amplitude: Number(r.f7) || 0,
            };
          })
          .filter((x): x is EmSectorItem => x != null && !!x.name && !!x.code);

        if (items.length > 0) {
          this.setCache(cacheKey, items);
          this.logger.debug(
            `EM ${type} sector: ${items.length} items, top=${items[0].name}(${items[0].change1d.toFixed(2)}%)`,
          );
          return items;
        }
      } catch (e: any) {
        lastError = e;
        this.logger.debug(`EM sector ${type} fail: ${e.message}, trying next host...`);
      }
    }

    this.logger.warn(`EM sector ${type} all hosts failed: ${(lastError as Error)?.message}`);
    return [];
  }

  // ─── 公开 API: 板块排行 ────────────────────────────────────

  /**
   * 板块排行 — A 股走东财真实数据，港股/美股 fallback ETF。
   */
  async getSectorRanking(
    market = 'A股',
    type: 'industry' | 'concept' = 'industry',
    sortBy: 'change' | 'turnover' | 'marketcap' = 'change',
    limit = 50,
  ): Promise<{
    market: string;
    type: string;
    byChange: EmSectorItem[];
    byFlow: EmSectorItem[];
    byMarketCap: EmSectorItem[];
  } | null> {
    if (market !== 'A股') {
      // 港股/美股暂无真实板块，返回 null 让前端 fallback 到 rotation
      return null;
    }

    const cacheKey = `ranking:${market}:${type}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as {
        market: string;
        type: string;
        byChange: EmSectorItem[];
        byFlow: EmSectorItem[];
        byMarketCap: EmSectorItem[];
      };
    }

    const items = await this.fetchEmSectorClist(type, sortBy, limit * 2);
    if (items.length === 0) return null;

    const result = {
      market,
      type,
      byChange: [...items].sort((a, b) => b.change1d - a.change1d).slice(0, limit),
      byFlow: [...items].sort((a, b) => b.turnover - a.turnover).slice(0, limit),
      byMarketCap: [...items].sort((a, b) => b.totalMarketCap - a.totalMarketCap).slice(0, limit),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // ══════════════════════════════════════════════════════════
  // 旧接口兼容 (rotation / heatmap) — 港股/美股 ETF 模拟 + A股 fallback
  // ══════════════════════════════════════════════════════════

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
      const chartResult = await this.akShareService.getChart(sym, 'daily');
      const quote = await this.akShareService.getQuote(sym);

      const rawBars = chartResult?.quotes || [];

      const isAShare = sym.startsWith('SH') || sym.startsWith('SZ') || sym.startsWith('BJ');
      const volumeDivider = isAShare ? 100 : 1;

      const bars: BarData[] = rawBars
        .filter((b: ChartQuote) => b.close != null && b.close > 0)
        .map((b: ChartQuote) => ({ close: b.close, volume: (b.volume ?? 0) / volumeDivider }));

      if (bars.length < 2) {
        this.logger.warn(`${sym}: insufficient bar data (${bars.length} bars)`);
        return null;
      }

      const lastBar = bars[bars.length - 1];
      const prevBar = bars[bars.length - 2];

      const price = quote?.current_price || lastBar.close;
      const prevClose = quote?.prev_close || prevBar.close;
      const volume = quote?.volume || lastBar.volume;
      let avgVolume = 0;
      const marketCap = quote?.market_cap || null;
      const shortName = quote?.name || sym;

      const recentVols = bars.slice(-20).map((b) => b.volume);
      if (recentVols.length > 0) {
        avgVolume = recentVols.reduce((s, v) => s + v, 0) / recentVols.length;
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

    // A 股：优先用东财真实板块（按 change1d 排序的 ETF 模拟逻辑）
    if (market === 'A股') {
      const realItems = await this.fetchEmSectorClist('industry', 'change', 50);
      if (realItems.length > 0) {
        // 把 EmSectorItem 映射成 SectorRotationItem（缺 price / 多周期涨跌幅字段）
        // 东财 clist 没给 5d/1m 等数据，所以置 0
        const rotationItems: SectorRotationItem[] = realItems.map((s) => ({
          symbol: s.code,
          name: s.name,
          sector: s.name,
          price: 0,
          change1d: s.change1d,
          change5d: 0,
          change1m: 0,
          change3m: 0,
          volume: s.turnover,
          avgVolume: 0,
          volumeRatio: 0,
          rsScore: s.change1d, // 简单按 1d 涨跌幅排
          momentum: 0,
        }));
        this.cache.set(cacheKey, { data: rotationItems, timestamp: Date.now() });
        return rotationItems;
      }
      // fallback 到 ETF
    }

    const etfs = this.getETFs(market);
    const items: SectorRotationItem[] = [];

    const settled = await Promise.allSettled(
      etfs.map(async (etf) => {
        const data = await this.fetchSymbolData(etf.symbol);
        if (!data || data.price <= 0) return null;

        const { price, prevClose, bars, volume, avgVolume } = data;

        const change1d = this.pctChange(price, prevClose);

        const barClose = (n: number) => (bars.length > n ? bars[bars.length - 1 - n].close : 0);

        const change5d = this.pctChange(price, barClose(5));
        const change1m = this.pctChange(price, barClose(21));
        const change3m = this.pctChange(price, barClose(63));

        const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;
        const rsScore = change1d * 0.1 + change5d * 0.2 + change1m * 0.35 + change3m * 0.35;
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
    this.logger.debug(
      `Rotation ${market}: ${items.length} items, prices: ${items.map((i) => `${i.name}=${i.price}`).join(', ')}`,
    );
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

        const barClose = (n: number) => (bars.length > n ? bars[bars.length - 1 - n].close : 0);

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

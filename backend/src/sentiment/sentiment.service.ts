import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  advanceRatio: number;
  aboveMa20Pct: number;
  aboveMa50Pct: number;
  newHighs: number;
  newLows: number;
}

export interface VixData {
  current: number;
  change: number;
  changePercent: number;
  level: 'low' | 'medium' | 'high' | 'extreme';
}

export interface VolumeAnalysis {
  totalVolume: number;
  avgVolume: number;
  volumeRatio: number;
  volumeLevel: 'shrink' | 'normal' | 'expand' | 'surge';
}

export interface SentimentGauge {
  score: number;
  level: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  label: string;
  components: { name: string; score: number; weight: number }[];
}

export interface SentimentResult {
  gauge: SentimentGauge;
  vix: VixData | null;
  breadth: MarketBreadth;
  volume: VolumeAnalysis;
  indices: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
  }[];
  putCallRatio: number | null;
  timestamp: string;
}

const MARKET_INDICES = [
  { symbol: '^GSPC', name: '标普500' },
  { symbol: '^DJI', name: '道琼斯' },
  { symbol: '^IXIC', name: '纳斯达克' },
  { symbol: '^RUT', name: '罗素2000' },
  { symbol: '000001.SS', name: '上证指数' },
  { symbol: '399001.SZ', name: '深证成指' },
  { symbol: '399006.SZ', name: '创业板指' },
  { symbol: '^HSI', name: '恒生指数' },
];

const BREADTH_POOL = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B',
  'UNH', 'JNJ', 'V', 'XOM', 'JPM', 'WMT', 'PG', 'MA', 'HD', 'CVX',
  'MRK', 'ABBV', 'LLY', 'PEP', 'KO', 'COST', 'AVGO', 'TMO', 'MCD',
  'CSCO', 'ACN', 'ABT', 'DHR', 'NEE', 'TXN', 'PM', 'CMCSA', 'VZ',
  'INTC', 'AMD', 'QCOM', 'CRM', 'ORCL', 'IBM', 'ADBE', 'NFLX',
  'DIS', 'NKE', 'BA', 'GS', 'MS', 'C', 'BAC', 'WFC', 'AXP',
  'CAT', 'DE', 'MMM', 'GE', 'HON', 'LMT', 'RTX', 'UPS', 'FDX',
  'PFE', 'BMY', 'GILD', 'AMGN', 'REGN', 'ISRG', 'SYK', 'MDT',
  'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'OXY', 'MPC', 'PXD',
  'SPG', 'PLD', 'AMT', 'EQIX', 'O', 'DLR',
  'PYPL', 'SQ', 'SHOP', 'SNOW', 'DDOG', 'ZS', 'NET', 'CRWD',
];

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);
  private cached: { data: SentimentResult; timestamp: number } | null = null;
  private readonly CACHE_TTL = 3 * 60 * 1000;

  async getSentiment(): Promise<SentimentResult> {
    if (this.cached && Date.now() - this.cached.timestamp < this.CACHE_TTL) {
      return this.cached.data;
    }

    const [indices, vix, breadth, volume] = await Promise.all([
      this.fetchIndices(),
      this.fetchVix(),
      this.fetchBreadth(),
      this.fetchVolume(),
    ]);

    const gauge = this.computeGauge(indices, vix, breadth, volume);

    const result: SentimentResult = {
      gauge,
      vix,
      breadth,
      volume,
      indices,
      putCallRatio: null,
      timestamp: new Date().toISOString(),
    };

    const isValid =
      indices.length > 0 &&
      indices.some((i) => i.price > 0) &&
      (breadth.advancers + breadth.decliners) > 0;

    if (isValid) {
      this.cached = { data: result, timestamp: Date.now() };
    } else {
      this.logger.warn(
        `Skipping cache: data looks invalid (indices=${indices.length}, ` +
        `breadthTotal=${breadth.advancers + breadth.decliners + breadth.unchanged})`,
      );
      if (this.cached) {
        this.logger.warn('Returning stale cached data instead of zeros');
        return this.cached.data;
      }
    }

    return result;
  }

  private async fetchIndices(): Promise<SentimentResult['indices']> {
    const results: SentimentResult['indices'] = [];
    const settled = await Promise.allSettled(
      MARKET_INDICES.map(async ({ symbol, name }) => {
        const q: any = await yahooFinance
          .quote(symbol, {}, { validateResult: false })
          .catch((err) => {
            this.logger.warn(`fetchIndices: ${symbol} failed – ${err?.message}`);
            return null;
          });
        if (!q || !q.regularMarketPrice) return null;
        return {
          symbol,
          name,
          price: q.regularMarketPrice,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
        };
      }),
    );
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) results.push(s.value);
    }
    this.logger.debug(`fetchIndices: got ${results.length}/${MARKET_INDICES.length}`);
    return results;
  }

  private async fetchVix(): Promise<VixData | null> {
    try {
      const q: any = await yahooFinance.quote('^VIX', {}, { validateResult: false });
      if (!q || !q.regularMarketPrice) {
        this.logger.warn('fetchVix: no data or zero price returned');
        return null;
      }
      const current = q.regularMarketPrice;
      const change = q.regularMarketChange ?? 0;
      const changePercent = q.regularMarketChangePercent ?? 0;

      let level: VixData['level'] = 'low';
      if (current >= 30) level = 'extreme';
      else if (current >= 20) level = 'high';
      else if (current >= 15) level = 'medium';

      return { current, change, changePercent, level };
    } catch (err: any) {
      this.logger.warn(`fetchVix failed: ${err?.message}`);
      return null;
    }
  }

  private async fetchBreadth(): Promise<MarketBreadth> {
    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;
    let aboveMa20 = 0;
    let aboveMa50 = 0;
    let newHighs = 0;
    let newLows = 0;
    let total = 0;

    const batchSize = 30;
    for (let i = 0; i < BREADTH_POOL.length; i += batchSize) {
      const chunk = BREADTH_POOL.slice(i, i + batchSize);
      try {
        const res: any = await yahooFinance.quote(chunk, {}, { validateResult: false });
        const quotes = Array.isArray(res) ? res : [res];
        for (const q of quotes) {
          if (!q || !q.regularMarketPrice) continue;
          total++;
          const chg = q.regularMarketChangePercent ?? 0;
          if (chg > 0.1) advancers++;
          else if (chg < -0.1) decliners++;
          else unchanged++;

          const price = q.regularMarketPrice;
          if (q.fiftyDayAverage && price > q.fiftyDayAverage) aboveMa50++;
          if (q.twoHundredDayAverage != null) {
            const ma20Approx = q.fiftyDayAverage ?? price;
            if (price > ma20Approx) aboveMa20++;
          } else {
            aboveMa20++;
          }

          if (q.fiftyTwoWeekHigh && price >= q.fiftyTwoWeekHigh * 0.98)
            newHighs++;
          if (q.fiftyTwoWeekLow && price <= q.fiftyTwoWeekLow * 1.02)
            newLows++;
        }
      } catch (err: any) {
        this.logger.warn(`fetchBreadth batch ${i / batchSize + 1} failed: ${err?.message}`);
      }
    }

    this.logger.debug(
      `fetchBreadth: total=${total}, up=${advancers}, down=${decliners}, ` +
      `newHighs=${newHighs}, newLows=${newLows}`,
    );
    return {
      advancers,
      decliners,
      unchanged,
      advanceRatio: total > 0 ? (advancers / total) * 100 : 50,
      aboveMa20Pct: total > 0 ? (aboveMa20 / total) * 100 : 50,
      aboveMa50Pct: total > 0 ? (aboveMa50 / total) * 100 : 50,
      newHighs,
      newLows,
    };
  }

  private async fetchVolume(): Promise<VolumeAnalysis> {
    try {
      const q: any = await yahooFinance.quote('SPY', {}, { validateResult: false });

      if (!q || !q.regularMarketVolume) {
        this.logger.warn('fetchVolume: SPY returned no volume data');
        return { totalVolume: 0, avgVolume: 0, volumeRatio: 1, volumeLevel: 'normal' };
      }

      const vol = q.regularMarketVolume;
      const avg = q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? 1;
      const ratio = avg > 0 ? vol / avg : 1;

      let level: VolumeAnalysis['volumeLevel'] = 'normal';
      if (ratio >= 2) level = 'surge';
      else if (ratio >= 1.3) level = 'expand';
      else if (ratio <= 0.7) level = 'shrink';

      return { totalVolume: vol, avgVolume: avg, volumeRatio: ratio, volumeLevel: level };
    } catch (err: any) {
      this.logger.warn(`fetchVolume failed: ${err?.message}`);
      return { totalVolume: 0, avgVolume: 0, volumeRatio: 1, volumeLevel: 'normal' };
    }
  }

  private computeGauge(
    indices: SentimentResult['indices'],
    vix: VixData | null,
    breadth: MarketBreadth,
    volume: VolumeAnalysis,
  ): SentimentGauge {
    const components: SentimentGauge['components'] = [];

    // Market momentum (SP500 change)
    const sp500 = indices.find((i) => i.symbol === '^GSPC');
    const momentumScore = sp500
      ? Math.max(0, Math.min(100, 50 + sp500.changePercent * 20))
      : 50;
    components.push({ name: '市场动量', score: momentumScore, weight: 0.2 });

    // VIX inverse
    const vixScore = vix
      ? Math.max(0, Math.min(100, 100 - (vix.current - 10) * 3))
      : 50;
    components.push({ name: 'VIX恐慌指数', score: vixScore, weight: 0.25 });

    // Breadth
    const breadthScore = breadth.advanceRatio;
    components.push({ name: '涨跌比', score: breadthScore, weight: 0.2 });

    // MA breadth
    const maBreadthScore = breadth.aboveMa50Pct;
    components.push({ name: '均线上方比例', score: maBreadthScore, weight: 0.15 });

    // New high/low
    const hlScore =
      breadth.newHighs + breadth.newLows > 0
        ? (breadth.newHighs / (breadth.newHighs + breadth.newLows)) * 100
        : 50;
    components.push({ name: '新高新低比', score: hlScore, weight: 0.1 });

    // Volume
    const volScore = Math.max(
      0,
      Math.min(100, 50 + (volume.volumeRatio - 1) * 30),
    );
    components.push({ name: '成交量', score: volScore, weight: 0.1 });

    const totalScore = components.reduce(
      (s, c) => s + c.score * c.weight,
      0,
    );

    let level: SentimentGauge['level'];
    let label: string;
    if (totalScore >= 80) {
      level = 'extreme_greed';
      label = '极度贪婪';
    } else if (totalScore >= 60) {
      level = 'greed';
      label = '贪婪';
    } else if (totalScore >= 40) {
      level = 'neutral';
      label = '中性';
    } else if (totalScore >= 20) {
      level = 'fear';
      label = '恐惧';
    } else {
      level = 'extreme_fear';
      label = '极度恐惧';
    }

    return {
      score: +totalScore.toFixed(1),
      level,
      label,
      components,
    };
  }
}

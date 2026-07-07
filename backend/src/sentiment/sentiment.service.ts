import { Injectable, Logger } from '@nestjs/common';
import { AkShareService, QuoteResult, ChartQuote } from '../akshare/akshare.service';

export interface SentimentItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  rsi: number;
  macdSignal: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(private readonly akShareService: AkShareService) {}

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private calculateRsi(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50;
    const deltas = prices.slice(1).map((p, i) => p - prices[i]);
    const gains = deltas.map((d) => (d > 0 ? d : 0));
    const losses = deltas.map((d) => (d < 0 ? Math.abs(d) : 0));
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMacdSignal(prices: number[]): number {
    const ema12 = this.ema(prices, 12);
    const ema26 = this.ema(prices, 26);
    const ema9 = this.ema(prices, 9);
    const macd = (ema12[ema12.length - 1] || 0) - (ema26[ema26.length - 1] || 0);
    const signal = ema9[ema9.length - 1] || 0;
    return macd - signal;
  }

  private ema(prices: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    let ema = prices[0] || 0;
    for (let i = 0; i < prices.length; i++) {
      ema = prices[i] * multiplier + ema * (1 - multiplier);
      result.push(ema);
    }
    return result;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  async analyze(symbol: string): Promise<SentimentItem | null> {
    const cached = this.getCached<SentimentItem>(`sentiment:${symbol}`);
    if (cached) return cached;

    try {
      const [quoteResult, chartResult] = await Promise.all([
        this.akShareService.getQuote(symbol),
        this.akShareService.getChart(symbol, 'daily'),
      ]);

      if (!quoteResult || !chartResult) {
        this.logger.warn(`No data for ${symbol}`);
        return null;
      }

      const quotes = chartResult.quotes || [];
      const prices = quotes
        .filter((q: ChartQuote) => q.close != null)
        .map((q: ChartQuote) => q.close);

      if (prices.length < 30) {
        this.logger.warn(`Insufficient data for ${symbol}: ${prices.length} bars`);
        return null;
      }

      const volumes = quotes
        .filter((q: ChartQuote) => q.volume != null)
        .map((q: ChartQuote) => q.volume);
      const avgVolume =
        volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;

      const rsi = this.calculateRsi(prices);
      const macdSignal = this.calculateMacdSignal(prices);
      const volatility = this.calculateVolatility(prices);

      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      let strength = 0;

      if (rsi > 55 && macdSignal > 0) {
        trend = 'bullish';
        strength = Math.min(100, (rsi - 50) * 2 + macdSignal * 10);
      } else if (rsi < 45 && macdSignal < 0) {
        trend = 'bearish';
        strength = Math.min(100, (50 - rsi) * 2 - macdSignal * 10);
      }

      const item: SentimentItem = {
        symbol: quoteResult.symbol,
        name: quoteResult.name,
        price: quoteResult.current_price,
        changePercent: quoteResult.change_percent,
        volume: quoteResult.volume,
        avgVolume: avgVolume,
        volumeRatio: avgVolume > 0 ? quoteResult.volume / avgVolume : 1,
        rsi: parseFloat(rsi.toFixed(2)),
        macdSignal: parseFloat(macdSignal.toFixed(4)),
        volatility: parseFloat(volatility.toFixed(2)),
        trend,
        strength: parseFloat(strength.toFixed(2)),
      };

      this.setCache(`sentiment:${symbol}`, item);
      return item;
    } catch (err) {
      this.logger.error(`Sentiment analysis failed for ${symbol}: ${err.message}`);
      return null;
    }
  }

  async analyzeBatch(symbols: string[]): Promise<(SentimentItem | null)[]> {
    const results = await Promise.allSettled(symbols.map(async (s) => this.analyze(s)));
    return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
  }

  async getSentiment() {
    const cached = this.getCached<any>('market_sentiment');
    if (cached) return cached;

    try {
      const marketOverview = await this.akShareService.getMarketOverview();
      
      const indices: { symbol: string; name: string }[] = [
        { symbol: 'sh000001', name: '上证指数' },
        { symbol: 'sz399001', name: '深证成指' },
        { symbol: 'sz399006', name: '创业板指' },
        { symbol: 'hk00001', name: '恒生指数' },
        { symbol: '^GSPC', name: '标普500' },
        { symbol: '^IXIC', name: '纳斯达克' },
        { symbol: '^DJI', name: '道琼斯' },
      ];

      const sentimentItems = await Promise.all(
        indices.map(async (idx) => {
          try {
            return await this.analyze(idx.symbol);
          } catch {
            return null;
          }
        }),
      );

      const validItems = sentimentItems.filter((s): s is SentimentItem => s !== null);
      const bullishCount = validItems.filter((s) => s.trend === 'bullish').length;
      const bearishCount = validItems.filter((s) => s.trend === 'bearish').length;
      const neutralCount = validItems.filter((s) => s.trend === 'neutral').length;

      const avgRsi = validItems.length > 0
        ? validItems.reduce((sum, s) => sum + s.rsi, 0) / validItems.length
        : 50;
      const avgVolatility = validItems.length > 0
        ? validItems.reduce((sum, s) => sum + s.volatility, 0) / validItems.length
        : 0;

      let overallTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (bullishCount > bearishCount * 1.5) overallTrend = 'bullish';
      else if (bearishCount > bullishCount * 1.5) overallTrend = 'bearish';

      const result = {
        timestamp: Date.now(),
        overallTrend,
        counts: {
          bullish: bullishCount,
          bearish: bearishCount,
          neutral: neutralCount,
          total: validItems.length,
        },
        metrics: {
          avgRsi: parseFloat(avgRsi.toFixed(2)),
          avgVolatility: parseFloat(avgVolatility.toFixed(2)),
        },
        indices: validItems,
        marketOverview,
      };

      this.setCache('market_sentiment', result);
      return result;
    } catch (err) {
      this.logger.error(`Get sentiment failed: ${err.message}`);
      return {
        timestamp: Date.now(),
        overallTrend: 'neutral' as const,
        counts: { bullish: 0, bearish: 0, neutral: 0, total: 0 },
        metrics: { avgRsi: 50, avgVolatility: 0 },
        indices: [],
        marketOverview: null,
      };
    }
  }
}

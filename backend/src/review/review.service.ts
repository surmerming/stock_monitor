import { Injectable, Logger } from '@nestjs/common';
import { WatchlistService } from '../watchlist/watchlist.service';
import { StockService } from '../stock/stock.service';
import { MoneyFlowService } from '../moneyflow/moneyflow.service';
import { PatternService, PatternSignal, SupportResistance } from '../pattern/pattern.service';
import { SentimentService } from '../sentiment/sentiment.service';
import { SectorService } from '../sector/sector.service';
import { DetailService } from '../detail/detail.service';
import { AkShareService, ChartQuote, QuoteResult } from '../akshare/akshare.service';
import { computeIndicators, TechnicalValues, OHLCV } from '../screener/technical.util';
import { getCnName } from '../common/cn-names';

export interface MaStatus {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
  alignment: 'bullish' | 'bearish' | 'mixed';
}

export interface TechnicalSignals {
  macd: { dif: number | null; dea: number | null; hist: number | null; signal: string };
  kdj: { k: number | null; d: number | null; j: number | null; signal: string };
  rsi: number | null;
  boll: { position: number | null; width: number | null };
}

export interface AnomalyTag {
  type: string;
  label: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface ReviewScore {
  total: number;
  trend: number;
  volume: number;
  technical: number;
  moneyFlow: number;
  pattern: number;
  diagnosis: string;
}

export interface WatchlistReviewItem {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  amplitude: number;
  volume: number;
  turnover: number;
  turnoverRate: number | null;
  volumeRatio: number | null;
  avgVolume: number | null;
  volMa5Ratio: number | null;
  netFlow: number;
  largeNetFlow: number;
  maStatus: MaStatus;
  technicals: TechnicalSignals;
  patterns: PatternSignal[];
  anomalies: AnomalyTag[];
  score: ReviewScore;
}

export interface VolumePricePoint {
  date: string;
  close: number;
  volume: number;
  obv: number;
  divergence: 'none' | 'top' | 'bottom';
}

export interface StockReviewDetail {
  symbol: string;
  name: string;
  market: string;
  quote: {
    price: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    prevClose: number;
    volume: number;
    turnover: number;
    turnoverRate: number | null;
    volumeRatio: number | null;
    marketCap: number | null;
    pe: number | null;
  };
  maStatus: MaStatus;
  technicals: TechnicalSignals;
  patterns: PatternSignal[];
  supports: SupportResistance[];
  trendLines: {
    startDate: string;
    startPrice: number;
    endDate: string;
    endPrice: number;
    type: 'up' | 'down';
  }[];
  anomalies: AnomalyTag[];
  score: ReviewScore;
  moneyFlow: {
    netFlow: number;
    largeNetFlow: number;
    timeline: Array<{
      time: string;
      inflow: number;
      outflow: number;
      netFlow: number;
      cumulativeNetFlow: number;
    }>;
  } | null;
  chartBars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  volumePrice: VolumePricePoint[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 3 * 60 * 1000;

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  private cache = new Map<string, CacheEntry<any>>();

  constructor(
    private readonly watchlistService: WatchlistService,
    private readonly stockService: StockService,
    private readonly moneyFlowService: MoneyFlowService,
    private readonly patternService: PatternService,
    private readonly sentimentService: SentimentService,
    private readonly sectorService: SectorService,
    private readonly detailService: DetailService,
    private readonly akShareService: AkShareService,
  ) {}

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

  async getWatchlistSummary(userId: number): Promise<WatchlistReviewItem[]> {
    const cached = this.getCached<WatchlistReviewItem[]>(`ws_${userId}`);
    if (cached) return cached;

    const watchlistItems = await this.watchlistService.findAll(userId);
    if (watchlistItems.length === 0) return [];

    const symbols = watchlistItems.map((w) => w.symbol);
    const quotesMap = await this.stockService.fetchQuotesBatch(symbols);

    const items = await Promise.all(
      watchlistItems.map(async (w) => {
        try {
          return await this.buildReviewItem(w.symbol, quotesMap);
        } catch (err) {
          this.logger.warn(`Review item failed for ${w.symbol}: ${err.message}`);
          return null;
        }
      }),
    );

    const result = items.filter((i): i is WatchlistReviewItem => i !== null);
    this.setCache(`ws_${userId}`, result);
    return result;
  }

  async getStockReview(rawSymbol: string): Promise<StockReviewDetail | null> {
    const cacheKey = `sr_${rawSymbol}`;
    const cached = this.getCached<StockReviewDetail>(cacheKey);
    if (cached) return cached;

    const { akshare: symbol, display, market } = this.stockService.normalizeSymbol(rawSymbol);

    try {
      const [quoteResult, chartResult, patternResult, flowDetail] = await Promise.allSettled([
        this.akShareService.getQuote(symbol),
        this.akShareService.getChart(symbol, 'daily'),
        this.patternService.detect(symbol, '6mo'),
        this.moneyFlowService.getDetail(rawSymbol),
      ]);

      const raw = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
      const chart = chartResult.status === 'fulfilled' ? chartResult.value : null;
      const pattern = patternResult.status === 'fulfilled' ? patternResult.value : null;
      const flow = flowDetail.status === 'fulfilled' ? flowDetail.value : null;

      if (!raw) return null;

      const price = raw.current_price;
      const prevClose = raw.prev_close;
      const change = raw.change;
      const changePct = raw.change_percent;

      const bars: OHLCV[] = (chart?.quotes ?? [])
        .filter((q: ChartQuote) => q.close != null && q.volume != null)
        .map((q: ChartQuote) => ({
          open: q.open ?? q.close,
          high: q.high ?? q.close,
          low: q.low ?? q.close,
          close: q.close,
          volume: q.volume ?? 0,
        }));

      const chartBars = (chart?.quotes ?? [])
        .filter((q: ChartQuote) => q.close != null)
        .slice(-120)
        .map((q: ChartQuote) => ({
          date: q.date || '',
          open: q.open ?? q.close,
          high: q.high ?? q.close,
          low: q.low ?? q.close,
          close: q.close,
          volume: q.volume ?? 0,
        }));

      const indicators = computeIndicators(bars);
      const maStatus = this.buildMaStatus(bars, indicators);
      const technicals = this.buildTechnicalSignals(indicators);
      const anomalies = this.detectAnomalies(bars, indicators);
      const score = this.computeScore(indicators, anomalies, pattern?.patterns ?? [], flow);

      const name = getCnName(symbol, raw.name || display);

      const volumePrice = this.computeVolumePriceAnalysis(chartBars);

      const result: StockReviewDetail = {
        symbol: display,
        name,
        market,
        quote: {
          price,
          change,
          changePercent: changePct,
          open: raw.open_price,
          high: raw.day_high,
          low: raw.day_low,
          prevClose,
          volume: raw.volume,
          turnover: raw.turnover ?? 0,
          turnoverRate: raw.turnover_rate ?? null,
          volumeRatio: raw.volume_ratio ?? null,
          marketCap: raw.market_cap ?? null,
          pe: raw.pe_ratio ?? null,
        },
        maStatus,
        technicals,
        patterns: pattern?.patterns ?? [],
        supports: pattern?.supports ?? [],
        trendLines: pattern?.trendLines ?? [],
        anomalies,
        score,
        moneyFlow: flow
          ? {
              netFlow: flow.summary.netFlow,
              largeNetFlow: flow.summary.largeNetFlow,
              timeline: flow.timeline,
            }
          : null,
        chartBars,
        volumePrice,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (err) {
      this.logger.error(`Stock review error for ${rawSymbol}: ${err.message}`);
      return null;
    }
  }

  async getMarketOverview() {
    const cached = this.getCached<any>('market_overview');
    if (cached) return cached;

    const [sentimentResult, sectorResult, turnoverResult, flowResult, hsgtResult] =
      await Promise.allSettled([
        this.sentimentService.getSentiment(),
        // 用 A股行业 ETF 计算板块轮动（腾讯K线，本机网络可靠）；美股 ETF K线易超时导致排行空
        this.sectorService.getRotation('A股'),
        this.akShareService.getQuotesBatch(['sh000001', 'sz399001']),
        this.akShareService.getMarketMoneyFlow(),
        this.akShareService.getHsgtFlow(),
      ]);

    const sentiment = sentimentResult.status === 'fulfilled' ? sentimentResult.value : null;
    const sectors = sectorResult.status === 'fulfilled' ? sectorResult.value : [];

    let marketTurnover: { total: number; sh: number; sz: number } | null = null;
    if (turnoverResult.status === 'fulfilled') {
      const sh = turnoverResult.value.find((q) => q.symbol === 'sh000001')?.data?.turnover ?? 0;
      const sz = turnoverResult.value.find((q) => q.symbol === 'sz399001')?.data?.turnover ?? 0;
      if (sh + sz > 0) marketTurnover = { total: sh + sz, sh, sz };
    }
    const moneyFlow = flowResult.status === 'fulfilled' ? flowResult.value : null;
    const hsgtFlow = hsgtResult.status === 'fulfilled' ? hsgtResult.value : null;

    const sortedSectors = [...sectors].sort((a, b) => b.change1d - a.change1d);
    const topGainers = sortedSectors.slice(0, 10);
    const topLosers = sortedSectors.slice(-10).reverse();

    const result = {
      sentiment,
      sectorRanking: {
        gainers: topGainers,
        losers: topLosers,
      },
      marketTurnover,
      moneyFlow,
      hsgtFlow,
    };

    this.setCache('market_overview', result);
    return result;
  }

  async getSectorRanking(market: string) {
    const cacheKey = `sector_rank_${market}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const [rotationResult, flowResult] = await Promise.allSettled([
      this.sectorService.getRotation(market),
      this.moneyFlowService.getOverview(market),
    ]);

    const rotation = rotationResult.status === 'fulfilled' ? rotationResult.value : [];
    const flows = flowResult.status === 'fulfilled' ? flowResult.value : [];

    const byChange = [...rotation].sort((a, b) => b.change1d - a.change1d);
    const flowMap = new Map(flows.map((f) => [f.symbol, f]));

    const result = {
      byChange: byChange.map((s) => ({
        ...s,
        netFlow: flowMap.get(s.symbol)?.netFlow ?? 0,
      })),
      byFlow: [...flows].sort((a, b) => b.netFlow - a.netFlow).slice(0, 20),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  private async buildReviewItem(
    inputSymbol: string,
    quotesMap: Map<string, any>,
  ): Promise<WatchlistReviewItem | null> {
    const quote = quotesMap.get(inputSymbol);
    if (!quote) return null;

    const { akshare: symbol } = this.stockService.normalizeSymbol(inputSymbol);

    const [chartResult, patternResult, flowResult] = await Promise.allSettled([
      this.akShareService.getChart(symbol, 'daily'),
      this.patternService.detect(symbol, '6mo'),
      this.moneyFlowService.getDetail(inputSymbol),
    ]);

    const chart = chartResult.status === 'fulfilled' ? chartResult.value : null;
    const pattern = patternResult.status === 'fulfilled' ? patternResult.value : null;
    const flow = flowResult.status === 'fulfilled' ? flowResult.value : null;

    const bars: OHLCV[] = (chart?.quotes ?? [])
      .filter((q: ChartQuote) => q.close != null && q.volume != null)
      .map((q: ChartQuote) => ({
        open: q.open ?? q.close,
        high: q.high ?? q.close,
        low: q.low ?? q.close,
        close: q.close,
        volume: q.volume ?? 0,
      }));

    const indicators = computeIndicators(bars);
    const maStatus = this.buildMaStatus(bars, indicators);
    const technicals = this.buildTechnicalSignals(indicators);
    const anomalies = this.detectAnomalies(bars, indicators);
    const recentPatterns = (pattern?.patterns ?? []).slice(0, 5);
    const score = this.computeScore(indicators, anomalies, recentPatterns, flow);

    const amplitude = quote.prev_close
      ? ((quote.day_high - quote.day_low) / quote.prev_close) * 100
      : 0;

    return {
      symbol: quote.symbol,
      name: quote.name,
      market: quote.market,
      price: quote.current_price,
      change: quote.change,
      changePercent: quote.change_percent,
      open: quote.open_price,
      high: quote.day_high,
      low: quote.day_low,
      prevClose: quote.prev_close,
      amplitude,
      volume: quote.volume,
      turnover: quote.turnover ?? 0,
      turnoverRate: quote.turnover_rate ?? null,
      // 量比用东财 f50 实时口径（与详情页一致）；volMa5Ratio 是"今日量/5日均量"，两者口径不同
      volumeRatio: quote.volume_ratio ?? null,
      avgVolume: null,
      volMa5Ratio: indicators.volMa5Ratio as number | null,
      netFlow: flow?.summary?.netFlow ?? 0,
      largeNetFlow: flow?.summary?.largeNetFlow ?? 0,
      maStatus,
      technicals,
      patterns: recentPatterns,
      anomalies,
      score,
    };
  }

  private computeVolumePriceAnalysis(
    chartBars: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>,
  ): VolumePricePoint[] {
    if (chartBars.length < 10) return [];

    const points: VolumePricePoint[] = [];
    let obv = 0;

    for (let i = 0; i < chartBars.length; i++) {
      const bar = chartBars[i];
      if (i > 0) {
        if (bar.close > chartBars[i - 1].close) obv += bar.volume;
        else if (bar.close < chartBars[i - 1].close) obv -= bar.volume;
      }

      points.push({
        date: bar.date,
        close: bar.close,
        volume: bar.volume,
        obv,
        divergence: 'none',
      });
    }

    const windowSize = 10;
    for (let i = windowSize * 2; i < points.length; i++) {
      const recent = points.slice(i - windowSize, i);
      const prev = points.slice(i - windowSize * 2, i - windowSize);

      const recentMaxPrice = Math.max(...recent.map((p) => p.close));
      const prevMaxPrice = Math.max(...prev.map((p) => p.close));
      const recentMaxObv = Math.max(...recent.map((p) => p.obv));
      const prevMaxObv = Math.max(...prev.map((p) => p.obv));

      if (recentMaxPrice > prevMaxPrice && recentMaxObv < prevMaxObv) {
        points[i].divergence = 'top';
      }

      const recentMinPrice = Math.min(...recent.map((p) => p.close));
      const prevMinPrice = Math.min(...prev.map((p) => p.close));
      const recentMinObv = Math.min(...recent.map((p) => p.obv));
      const prevMinObv = Math.min(...prev.map((p) => p.obv));

      if (recentMinPrice < prevMinPrice && recentMinObv > prevMinObv) {
        points[i].divergence = 'bottom';
      }
    }

    return points;
  }

  private buildMaStatus(bars: OHLCV[], indicators: TechnicalValues): MaStatus {
    const closes = bars.map((b) => b.close);
    const price = closes.length > 0 ? closes[closes.length - 1] : 0;

    const sma = (data: number[], period: number): number | null => {
      if (data.length < period) return null;
      const slice = data.slice(-period);
      return slice.reduce((s, v) => s + v, 0) / period;
    };

    const ma5 = sma(closes, 5);
    const ma10 = sma(closes, 10);
    const ma20 = sma(closes, 20);
    const ma60 = sma(closes, 60);

    let alignment: 'bullish' | 'bearish' | 'mixed' = 'mixed';
    if (ma5 != null && ma10 != null && ma20 != null) {
      if (ma5 > ma10 && ma10 > ma20) alignment = 'bullish';
      else if (ma5 < ma10 && ma10 < ma20) alignment = 'bearish';
    }

    return {
      ma5: ma5 != null ? +ma5.toFixed(2) : null,
      ma10: ma10 != null ? +ma10.toFixed(2) : null,
      ma20: ma20 != null ? +ma20.toFixed(2) : null,
      ma60: ma60 != null ? +ma60.toFixed(2) : null,
      alignment,
    };
  }

  private buildTechnicalSignals(ind: TechnicalValues): TechnicalSignals {
    let macdSignal = '中性';
    if (ind.macdGoldenCross) macdSignal = '金叉';
    else if (ind.macdDeathCross) macdSignal = '死叉';
    else if (ind.macdHist != null) macdSignal = (ind.macdHist as number) > 0 ? '多头' : '空头';

    let kdjSignal = '中性';
    if (ind.kdjGoldenCross) kdjSignal = '金叉';
    else if (ind.kdjDeathCross) kdjSignal = '死叉';
    else if (ind.kdjJ != null) {
      if ((ind.kdjJ as number) > 80) kdjSignal = '超买';
      else if ((ind.kdjJ as number) < 20) kdjSignal = '超卖';
    }

    let rsi: number | null = null;
    if (ind.bollPosition != null) {
      rsi = ind.bollPosition as number;
    }

    return {
      macd: {
        dif: ind.macdDif as number | null,
        dea: ind.macdDea as number | null,
        hist: ind.macdHist as number | null,
        signal: macdSignal,
      },
      kdj: {
        k: ind.kdjK as number | null,
        d: ind.kdjD as number | null,
        j: ind.kdjJ as number | null,
        signal: kdjSignal,
      },
      rsi,
      boll: {
        position: ind.bollPosition as number | null,
        width: ind.bollWidth as number | null,
      },
    };
  }

  detectAnomalies(bars: OHLCV[], indicators: TechnicalValues): AnomalyTag[] {
    const tags: AnomalyTag[] = [];
    if (bars.length < 10) return tags;

    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];

    const volRatio = indicators.volMa5Ratio as number | null;
    if (volRatio != null && volRatio > 2.0 && last.close > prev.close) {
      tags.push({
        type: 'volume_breakout',
        label: '放量上涨',
        direction: 'bullish',
        description: `量比${volRatio.toFixed(1)}倍，放量上攻`,
      });
    }

    if (volRatio != null && volRatio > 2.0 && last.close < prev.close) {
      tags.push({
        type: 'volume_drop',
        label: '放量下跌',
        direction: 'bearish',
        description: `量比${volRatio.toFixed(1)}倍，放量下跌`,
      });
    }

    if (volRatio != null && volRatio < 0.6 && last.close < prev.close) {
      tags.push({
        type: 'shrink_pullback',
        label: '缩量回调',
        direction: 'neutral',
        description: '量能萎缩回调，关注支撑',
      });
    }

    if (last.low > prev.high) {
      const gapPct = prev.close > 0 ? ((last.low - prev.high) / prev.close) * 100 : 0;
      tags.push({
        type: 'gap_up',
        label: '向上跳空',
        direction: 'bullish',
        description: `跳空缺口${gapPct.toFixed(1)}%`,
      });
    }
    if (last.high < prev.low) {
      const gapPct = prev.close > 0 ? ((prev.low - last.high) / prev.close) * 100 : 0;
      tags.push({
        type: 'gap_down',
        label: '向下跳空',
        direction: 'bearish',
        description: `跳空缺口${gapPct.toFixed(1)}%`,
      });
    }

    if (indicators.macdGoldenCross) {
      tags.push({
        type: 'macd_golden',
        label: 'MACD金叉',
        direction: 'bullish',
        description: 'MACD DIF上穿DEA',
      });
    }
    if (indicators.macdDeathCross) {
      tags.push({
        type: 'macd_death',
        label: 'MACD死叉',
        direction: 'bearish',
        description: 'MACD DIF下穿DEA',
      });
    }

    if (indicators.kdjGoldenCross) {
      tags.push({
        type: 'kdj_golden',
        label: 'KDJ金叉',
        direction: 'bullish',
        description: 'KDJ K线上穿D线',
      });
    }
    if (indicators.kdjDeathCross) {
      tags.push({
        type: 'kdj_death',
        label: 'KDJ死叉',
        direction: 'bearish',
        description: 'KDJ K线下穿D线',
      });
    }

    if (bars.length >= 20) {
      const recent5 = bars.slice(-5);
      const prev5 = bars.slice(-10, -5);
      const recentHighest = Math.max(...recent5.map((b) => b.high));
      const prevHighest = Math.max(...prev5.map((b) => b.high));
      const recentAvgVol = recent5.reduce((s, b) => s + b.volume, 0) / 5;
      const prevAvgVol = prev5.reduce((s, b) => s + b.volume, 0) / 5;

      if (recentHighest > prevHighest && recentAvgVol < prevAvgVol * 0.7) {
        tags.push({
          type: 'vol_price_divergence_top',
          label: '顶部量价背离',
          direction: 'bearish',
          description: '价格创新高但量能萎缩，警惕回调',
        });
      }

      const recentLowest = Math.min(...recent5.map((b) => b.low));
      const prevLowest = Math.min(...prev5.map((b) => b.low));
      if (recentLowest < prevLowest && recentAvgVol < prevAvgVol * 0.7) {
        tags.push({
          type: 'vol_price_divergence_bottom',
          label: '底部量价背离',
          direction: 'bullish',
          description: '价格创新低但量能萎缩，可能见底',
        });
      }
    }

    const bollPos = indicators.bollPosition as number | null;
    if (bollPos != null) {
      if (bollPos > 95) {
        tags.push({
          type: 'boll_upper',
          label: '触及布林上轨',
          direction: 'bearish',
          description: '价格接近布林上轨，注意回落风险',
        });
      }
      if (bollPos < 5) {
        tags.push({
          type: 'boll_lower',
          label: '触及布林下轨',
          direction: 'bullish',
          description: '价格接近布林下轨，关注反弹机会',
        });
      }
    }

    return tags;
  }

  computeScore(
    indicators: TechnicalValues,
    anomalies: AnomalyTag[],
    patterns: PatternSignal[],
    flow: any,
  ): ReviewScore {
    let trend = 50;
    const ma5Bias = indicators.ma5Bias as number | null;
    const ma10Bias = indicators.ma10Bias as number | null;
    const ma20Bias = indicators.ma20Bias as number | null;
    if (ma5Bias != null && ma10Bias != null && ma20Bias != null) {
      if (ma5Bias > 0 && ma10Bias > 0 && ma20Bias > 0) trend = 80;
      else if (ma5Bias > 0 && ma10Bias > 0) trend = 70;
      else if (ma5Bias > 0) trend = 60;
      else if (ma5Bias < 0 && ma10Bias < 0 && ma20Bias < 0) trend = 20;
      else if (ma5Bias < 0 && ma10Bias < 0) trend = 30;
      else if (ma5Bias < 0) trend = 40;
    }

    let volume = 50;
    const volRatio = indicators.volMa5Ratio as number | null;
    if (volRatio != null) {
      if (volRatio > 1.5 && ma5Bias != null && ma5Bias > 0) volume = 80;
      else if (volRatio > 1.0 && ma5Bias != null && ma5Bias > 0) volume = 65;
      else if (volRatio < 0.5) volume = 30;
      else volume = 50;
    }

    let technical = 50;
    if (indicators.macdGoldenCross) technical += 20;
    if (indicators.macdDeathCross) technical -= 20;
    if (indicators.kdjGoldenCross) technical += 15;
    if (indicators.kdjDeathCross) technical -= 15;
    if (indicators.macdHist != null) {
      technical += (indicators.macdHist as number) > 0 ? 5 : -5;
    }
    technical = Math.max(0, Math.min(100, technical));

    let moneyFlowScore = 50;
    if (flow?.summary) {
      const netFlow = flow.summary.netFlow ?? 0;
      const largeNet = flow.summary.largeNetFlow ?? 0;
      if (netFlow > 0 && largeNet > 0) moneyFlowScore = 80;
      else if (netFlow > 0) moneyFlowScore = 65;
      else if (netFlow < 0 && largeNet < 0) moneyFlowScore = 20;
      else if (netFlow < 0) moneyFlowScore = 35;
    }

    let patternScore = 50;
    for (const p of patterns) {
      if (p.direction === 'bullish') patternScore += p.strength * 0.3;
      else if (p.direction === 'bearish') patternScore -= p.strength * 0.3;
    }
    patternScore = Math.max(0, Math.min(100, patternScore));

    const total = Math.round(
      trend * 0.25 + volume * 0.2 + technical * 0.2 + moneyFlowScore * 0.2 + patternScore * 0.15,
    );

    const parts: string[] = [];
    if (trend >= 70) parts.push('均线多头排列');
    else if (trend <= 30) parts.push('均线空头排列');
    if (indicators.macdGoldenCross) parts.push('MACD金叉');
    if (indicators.macdDeathCross) parts.push('MACD死叉');
    if (volRatio != null && volRatio > 1.5 && ma5Bias != null && ma5Bias > 0)
      parts.push('放量上攻');
    if (moneyFlowScore >= 70) parts.push('资金净流入');
    else if (moneyFlowScore <= 30) parts.push('资金净流出');

    const bullishAnomalies = anomalies.filter((a) => a.direction === 'bullish').length;
    const bearishAnomalies = anomalies.filter((a) => a.direction === 'bearish').length;
    if (bullishAnomalies > bearishAnomalies) parts.push('偏多信号');
    else if (bearishAnomalies > bullishAnomalies) parts.push('偏空信号');

    let verdict: string;
    if (total >= 75) verdict = '强势看多';
    else if (total >= 60) verdict = '偏多观望';
    else if (total >= 40) verdict = '中性震荡';
    else if (total >= 25) verdict = '偏空谨慎';
    else verdict = '弱势看空';

    const diagnosis = parts.length > 0 ? `${parts.join('，')}，${verdict}` : verdict;

    return {
      total,
      trend,
      volume,
      technical,
      moneyFlow: moneyFlowScore,
      pattern: patternScore,
      diagnosis,
    };
  }
}

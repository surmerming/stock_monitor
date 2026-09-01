import { Injectable, Logger } from '@nestjs/common';
import { AkShareService, ChartQuote } from '../akshare/akshare.service';

interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PatternSignal {
  type: string;
  label: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  date: string;
  price: number;
  description: string;
  strength: number;
}

export interface SupportResistance {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  touchCount: number;
}

export interface PatternResult {
  symbol: string;
  patterns: PatternSignal[];
  supports: SupportResistance[];
  trendLines: {
    startDate: string;
    startPrice: number;
    endDate: string;
    endPrice: number;
    type: 'up' | 'down';
  }[];
}

@Injectable()
export class PatternService {
  private readonly logger = new Logger(PatternService.name);
  private cache = new Map<string, { data: PatternResult; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(private readonly akShareService: AkShareService) {}

  private async fetchBars(symbol: string, range: string): Promise<Bar[]> {
    const periodMap: Record<string, string> = {
      '3mo': 'daily',
      '1y': 'weekly',
      default: 'daily',
    };
    const period = periodMap[range] || periodMap.default;

    const chart = await this.akShareService.getChart(symbol, period);
    if (!chart?.quotes) return [];

    return chart.quotes
      .filter((q: ChartQuote) => q.close != null)
      .map((q: ChartQuote) => ({
        date: q.date || '',
        open: q.open ?? q.close,
        high: q.high ?? q.close,
        low: q.low ?? q.close,
        close: q.close,
        volume: q.volume ?? 0,
      }));
  }

  async detect(symbol: string, range: string): Promise<PatternResult> {
    const cacheKey = `${symbol}:${range}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const bars = await this.fetchBars(symbol, range);
    if (bars.length < 10) {
      return { symbol, patterns: [], supports: [], trendLines: [] };
    }

    const patterns: PatternSignal[] = [];
    patterns.push(...this.detectCandlePatterns(bars));
    patterns.push(...this.detectChartPatterns(bars));
    patterns.push(...this.detectBreakouts(bars));

    const supports = this.findSupportResistance(bars);
    const trendLines = this.findTrendLines(bars);

    patterns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const result: PatternResult = { symbol, patterns, supports, trendLines };
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  private detectCandlePatterns(bars: Bar[]): PatternSignal[] {
    const signals: PatternSignal[] = [];
    const n = bars.length;

    for (let i = 2; i < n; i++) {
      const c = bars[i];
      const p = bars[i - 1];
      const pp = bars[i - 2];
      const body = Math.abs(c.close - c.open);
      const range = c.high - c.low;
      const pBody = Math.abs(p.close - p.open);

      if (range > 0 && body / range < 0.3) {
        const lowerShadow = Math.min(c.open, c.close) - c.low;
        const upperShadow = c.high - Math.max(c.open, c.close);

        if (lowerShadow > body * 2 && upperShadow < body * 0.5) {
          const trend = this.shortTrend(bars, i, 5);
          if (trend < -1) {
            signals.push({
              type: 'hammer',
              label: '锤子线',
              direction: 'bullish',
              date: c.date,
              price: c.close,
              description: '下跌后出现锤子线，可能反转向上',
              strength: 70,
            });
          }
        }

        if (upperShadow > body * 2 && lowerShadow < body * 0.5) {
          const trend = this.shortTrend(bars, i, 5);
          if (trend > 1) {
            signals.push({
              type: 'shooting_star',
              label: '射击之星',
              direction: 'bearish',
              date: c.date,
              price: c.close,
              description: '上涨后出现射击之星，可能反转向下',
              strength: 70,
            });
          }
        }
      }

      if (
        p.close < p.open &&
        c.close > c.open &&
        c.open <= p.close &&
        c.close >= p.open &&
        body > pBody
      ) {
        signals.push({
          type: 'bullish_engulfing',
          label: '看涨吞没',
          direction: 'bullish',
          date: c.date,
          price: c.close,
          description: '阳线完全包裹前一根阴线',
          strength: 80,
        });
      }

      if (
        p.close > p.open &&
        c.close < c.open &&
        c.open >= p.close &&
        c.close <= p.open &&
        body > pBody
      ) {
        signals.push({
          type: 'bearish_engulfing',
          label: '看跌吞没',
          direction: 'bearish',
          date: c.date,
          price: c.close,
          description: '阴线完全包裹前一根阳线',
          strength: 80,
        });
      }

      if (
        i >= 2 &&
        pp.close < pp.open &&
        pBody < Math.abs(pp.close - pp.open) * 0.3 &&
        c.close > c.open &&
        c.close > (pp.open + pp.close) / 2
      ) {
        signals.push({
          type: 'morning_star',
          label: '晨星',
          direction: 'bullish',
          date: c.date,
          price: c.close,
          description: '三根K线组成晨星形态，看涨反转',
          strength: 85,
        });
      }

      if (
        i >= 2 &&
        pp.close > pp.open &&
        pBody < Math.abs(pp.close - pp.open) * 0.3 &&
        c.close < c.open &&
        c.close < (pp.open + pp.close) / 2
      ) {
        signals.push({
          type: 'evening_star',
          label: '暮星',
          direction: 'bearish',
          date: c.date,
          price: c.close,
          description: '三根K线组成暮星形态，看跌反转',
          strength: 85,
        });
      }

      if (range > 0 && body / range < 0.1) {
        signals.push({
          type: 'doji',
          label: '十字星',
          direction: 'neutral',
          date: c.date,
          price: c.close,
          description: '开盘价与收盘价接近，表示多空平衡',
          strength: 50,
        });
      }
    }

    return signals;
  }

  private detectChartPatterns(bars: Bar[]): PatternSignal[] {
    const signals: PatternSignal[] = [];
    const n = bars.length;
    if (n < 20) return signals;

    const lows = bars.map((b) => b.low);
    for (let win = 20; win <= Math.min(60, n); win += 10) {
      const segment = lows.slice(-win);
      const minIdx1 = this.findLocalMinIdx(segment, 0, Math.floor(win / 2));
      const minIdx2 = this.findLocalMinIdx(segment, Math.floor(win / 2), win);

      if (minIdx1 >= 0 && minIdx2 >= 0 && minIdx2 > minIdx1 + 3) {
        const v1 = segment[minIdx1];
        const v2 = segment[minIdx2];
        const diff = Math.abs(v1 - v2) / Math.min(v1, v2);

        if (diff < 0.03) {
          const midHigh = Math.max(
            ...bars.slice(-(win - minIdx1), -(win - minIdx2)).map((b) => b.high),
          );
          const lastClose = bars[n - 1].close;
          if (lastClose > midHigh) {
            signals.push({
              type: 'double_bottom',
              label: '双底 (W底)',
              direction: 'bullish',
              date: bars[n - 1].date,
              price: lastClose,
              description: `两个底部价格接近 (${v1.toFixed(2)} / ${v2.toFixed(2)})，突破颈线`,
              strength: 90,
            });
            break;
          }
        }
      }
    }

    const highs = bars.map((b) => b.high);
    for (let win = 20; win <= Math.min(60, n); win += 10) {
      const segment = highs.slice(-win);
      const maxIdx1 = this.findLocalMaxIdx(segment, 0, Math.floor(win / 2));
      const maxIdx2 = this.findLocalMaxIdx(segment, Math.floor(win / 2), win);

      if (maxIdx1 >= 0 && maxIdx2 >= 0 && maxIdx2 > maxIdx1 + 3) {
        const v1 = segment[maxIdx1];
        const v2 = segment[maxIdx2];
        const diff = Math.abs(v1 - v2) / Math.max(v1, v2);

        if (diff < 0.03) {
          const midLow = Math.min(
            ...bars.slice(-(win - maxIdx1), -(win - maxIdx2)).map((b) => b.low),
          );
          const lastClose = bars[n - 1].close;
          if (lastClose < midLow) {
            signals.push({
              type: 'double_top',
              label: '双顶 (M头)',
              direction: 'bearish',
              date: bars[n - 1].date,
              price: lastClose,
              description: `两个顶部价格接近 (${v1.toFixed(2)} / ${v2.toFixed(2)})，跌破颈线`,
              strength: 90,
            });
            break;
          }
        }
      }
    }

    if (n >= 20) {
      const recent = bars.slice(-20);
      const recentHighs = recent.map((b) => b.high);
      const recentLows = recent.map((b) => b.low);
      const highSlope = this.linearSlope(recentHighs);
      const lowSlope = this.linearSlope(recentLows);

      if (highSlope < 0 && lowSlope > 0) {
        signals.push({
          type: 'triangle',
          label: '三角收敛',
          direction: 'neutral',
          date: bars[n - 1].date,
          price: bars[n - 1].close,
          description: '高点下降、低点上升，即将选择方向突破',
          strength: 75,
        });
      }
    }

    return signals;
  }

  private detectBreakouts(bars: Bar[]): PatternSignal[] {
    const signals: PatternSignal[] = [];
    const n = bars.length;
    if (n < 20) return signals;

    const last = bars[n - 1];
    const prev = bars[n - 2];

    const high20 = Math.max(...bars.slice(-21, -1).map((b) => b.high));
    const avgVol20 = bars.slice(-21, -1).reduce((s, b) => s + b.volume, 0) / 20;

    if (last.close > high20 && prev.close <= high20 && last.volume > avgVol20 * 1.5) {
      signals.push({
        type: 'volume_breakout',
        label: '放量突破',
        direction: 'bullish',
        date: last.date,
        price: last.close,
        description: `放量突破20日新高 ${high20.toFixed(2)}，量比 ${(last.volume / avgVol20).toFixed(1)}`,
        strength: 88,
      });
    }

    const low20 = Math.min(...bars.slice(-21, -1).map((b) => b.low));
    if (last.close < low20 && prev.close >= low20 && last.volume > avgVol20 * 1.5) {
      signals.push({
        type: 'volume_breakdown',
        label: '放量破位',
        direction: 'bearish',
        date: last.date,
        price: last.close,
        description: `放量跌破20日新低 ${low20.toFixed(2)}`,
        strength: 85,
      });
    }

    if (n >= 250) {
      const high52 = Math.max(...bars.slice(-252, -1).map((b) => b.high));
      if (last.close > high52 && prev.close <= high52) {
        signals.push({
          type: 'new_52w_high',
          label: '创52周新高',
          direction: 'bullish',
          date: last.date,
          price: last.close,
          description: `突破52周高点 ${high52.toFixed(2)}`,
          strength: 85,
        });
      }
    }

    if (n >= 60) {
      const closes = bars.map((b) => b.close);
      const ma5 = this.sma(closes, 5);
      const ma20 = this.sma(closes, 20);
      const ma5Prev = this.sma(closes.slice(0, -1), 5);
      const ma20Prev = this.sma(closes.slice(0, -1), 20);

      if (ma5 != null && ma20 != null && ma5Prev != null && ma20Prev != null) {
        if (ma5 > ma20 && ma5Prev <= ma20Prev) {
          signals.push({
            type: 'ma_golden_cross',
            label: '均线金叉(5/20)',
            direction: 'bullish',
            date: last.date,
            price: last.close,
            description: `MA5上穿MA20，短期趋势转强`,
            strength: 72,
          });
        }
        if (ma5 < ma20 && ma5Prev >= ma20Prev) {
          signals.push({
            type: 'ma_death_cross',
            label: '均线死叉(5/20)',
            direction: 'bearish',
            date: last.date,
            price: last.close,
            description: `MA5下穿MA20，短期趋势转弱`,
            strength: 72,
          });
        }
      }
    }

    return signals;
  }

  /**
   * 识别支撑/阻力位，必须结合现价解读：
   * 1) 取最近约一年K线的摆动高低点，按 1.5% 容差聚类；
   * 2) 以现价分类——现价之上为阻力、之下为支撑，并过滤偏离现价 ±25% 的陈旧位；
   * 3) 单边行情下某一侧缺失时，用近期 20/60 日极值补位，保证支撑和阻力都至少有一个；
   * 4) 强度按触碰次数归一化；按距现价远近排序，最近的支撑/阻力排最前。
   */
  private findSupportResistance(bars: Bar[]): SupportResistance[] {
    const n = bars.length;
    if (n < 10) return [];
    const lastPrice = bars[n - 1].close;
    if (!(lastPrice > 0)) return [];

    const tolerance = 0.015;
    const maxDistance = 0.25;

    const pivots: { price: number }[] = [];
    const start = Math.max(2, n - 250);
    for (let i = start; i < n - 2; i++) {
      if (
        bars[i].high > bars[i - 1].high &&
        bars[i].high > bars[i - 2].high &&
        bars[i].high > bars[i + 1].high &&
        bars[i].high > bars[i + 2].high
      ) {
        pivots.push({ price: bars[i].high });
      }
      if (
        bars[i].low < bars[i - 1].low &&
        bars[i].low < bars[i - 2].low &&
        bars[i].low < bars[i + 1].low &&
        bars[i].low < bars[i + 2].low
      ) {
        pivots.push({ price: bars[i].low });
      }
    }

    const clusters: { price: number; count: number }[] = [];
    for (const pivot of pivots) {
      let merged = false;
      for (const cluster of clusters) {
        if (Math.abs(pivot.price - cluster.price) / cluster.price < tolerance) {
          cluster.price = (cluster.price * cluster.count + pivot.price) / (cluster.count + 1);
          cluster.count++;
          merged = true;
          break;
        }
      }
      if (!merged) {
        clusters.push({ price: pivot.price, count: 1 });
      }
    }

    // 结合现价分类，过滤远离现价的陈旧位（如一年前的低点对现价已无意义）
    const levels: SupportResistance[] = clusters
      .filter((c) => c.count >= 2)
      .map((c) => ({
        price: +c.price.toFixed(2),
        type: (c.price > lastPrice ? 'resistance' : 'support') as 'resistance' | 'support',
        strength: 0,
        touchCount: c.count,
      }))
      .filter((l) => Math.abs(l.price - lastPrice) / lastPrice <= maxDistance);

    // 单边行情补位：缺阻力用近期高点、缺支撑用近期低点
    if (!levels.some((l) => l.type === 'resistance')) {
      for (const win of [20, 60]) {
        const high = Math.max(...bars.slice(-win).map((b) => b.high));
        if (high > lastPrice && !levels.some((l) => Math.abs(l.price - high) / high < tolerance)) {
          levels.push({
            price: +high.toFixed(2),
            type: 'resistance',
            strength: 0,
            touchCount: 1,
          });
        }
      }
    }
    if (!levels.some((l) => l.type === 'support')) {
      for (const win of [20, 60]) {
        const low = Math.min(...bars.slice(-win).map((b) => b.low));
        if (low < lastPrice && !levels.some((l) => Math.abs(l.price - low) / low < tolerance)) {
          levels.push({ price: +low.toFixed(2), type: 'support', strength: 0, touchCount: 1 });
        }
      }
    }
    if (!levels.length) return [];

    // 强度按触碰次数归一化，最强簇 100，其余递减
    const maxTouch = Math.max(...levels.map((l) => l.touchCount));
    for (const l of levels) {
      l.strength = Math.round(30 + (70 * (l.touchCount - 1)) / Math.max(1, maxTouch - 1));
    }

    // 按距现价远近排序：最近的有效阻力/支撑排最前
    levels.sort((a, b) => Math.abs(a.price - lastPrice) - Math.abs(b.price - lastPrice));
    return levels.slice(0, 10);
  }

  private findTrendLines(bars: Bar[]): {
    startDate: string;
    startPrice: number;
    endDate: string;
    endPrice: number;
    type: 'up' | 'down';
  }[] {
    const n = bars.length;
    if (n < 10) return [];

    const lines: {
      startDate: string;
      startPrice: number;
      endDate: string;
      endPrice: number;
      type: 'up' | 'down';
    }[] = [];

    const recentLowIdxs: number[] = [];
    for (let i = 2; i < n - 2; i++) {
      if (
        bars[i].low <= bars[i - 1].low &&
        bars[i].low <= bars[i - 2].low &&
        bars[i].low <= bars[i + 1].low &&
        bars[i].low <= bars[i + 2].low
      ) {
        recentLowIdxs.push(i);
      }
    }

    if (recentLowIdxs.length >= 2) {
      const i1 = recentLowIdxs[recentLowIdxs.length - 2];
      const i2 = recentLowIdxs[recentLowIdxs.length - 1];
      if (bars[i2].low > bars[i1].low) {
        lines.push({
          startDate: bars[i1].date,
          startPrice: bars[i1].low,
          endDate: bars[i2].date,
          endPrice: bars[i2].low,
          type: 'up',
        });
      }
    }

    const recentHighIdxs: number[] = [];
    for (let i = 2; i < n - 2; i++) {
      if (
        bars[i].high >= bars[i - 1].high &&
        bars[i].high >= bars[i - 2].high &&
        bars[i].high >= bars[i + 1].high &&
        bars[i].high >= bars[i + 2].high
      ) {
        recentHighIdxs.push(i);
      }
    }

    if (recentHighIdxs.length >= 2) {
      const i1 = recentHighIdxs[recentHighIdxs.length - 2];
      const i2 = recentHighIdxs[recentHighIdxs.length - 1];
      if (bars[i2].high < bars[i1].high) {
        lines.push({
          startDate: bars[i1].date,
          startPrice: bars[i1].high,
          endDate: bars[i2].date,
          endPrice: bars[i2].high,
          type: 'down',
        });
      }
    }

    return lines;
  }

  private shortTrend(bars: Bar[], idx: number, lookback: number): number {
    const start = Math.max(0, idx - lookback);
    if (start === idx) return 0;
    const first = bars[start].close;
    const last = bars[idx - 1].close;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }

  private findLocalMinIdx(arr: number[], start: number, end: number): number {
    let minIdx = -1;
    let minVal = Infinity;
    for (let i = start; i < Math.min(end, arr.length); i++) {
      if (arr[i] < minVal) {
        minVal = arr[i];
        minIdx = i;
      }
    }
    return minIdx;
  }

  private findLocalMaxIdx(arr: number[], start: number, end: number): number {
    let maxIdx = -1;
    let maxVal = -Infinity;
    for (let i = start; i < Math.min(end, arr.length); i++) {
      if (arr[i] > maxVal) {
        maxVal = arr[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  private linearSlope(data: number[]): number {
    const n = data.length;
    if (n < 2) return 0;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    return denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  }

  private sma(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((s, v) => s + v, 0) / period;
  }
}

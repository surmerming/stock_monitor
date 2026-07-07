import { Injectable, Logger } from '@nestjs/common';
import { AkShareService, ChartQuote } from '../akshare/akshare.service';
import { StockService } from '../stock/stock.service';
import { getCnName } from '../common/cn-names';
import { OHLCV, computeIndicators, TECHNICAL_FIELDS } from '../screener/technical.util';

export interface BacktestFilter {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: number;
  value2?: number;
}

export interface BacktestQuery {
  symbol: string;
  filters: BacktestFilter[];
  startDate: string;
  endDate: string;
  initialCapital?: number;
  positionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  holdDays?: number;
}

interface DayBar extends OHLCV {
  date: string;
}

interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  holdDays: number;
  exitReason: 'signal' | 'stop_loss' | 'take_profit' | 'max_hold' | 'end';
}

export interface BacktestResult {
  symbol: string;
  symbolName: string;
  trades: Trade[];
  equity: { date: string; value: number }[];
  benchmark: { date: string; value: number }[];
  stats: {
    totalReturn: number;
    benchmarkReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgHoldDays: number;
    avgPnlPercent: number;
    maxWin: number;
    maxLoss: number;
  };
}

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly akShareService: AkShareService,
    private readonly stockService: StockService,
  ) {}

  private async fetchBars(symbol: string, startDate: string, endDate: string): Promise<DayBar[]> {
    const { akshare: akSymbol } = this.stockService.normalizeSymbol(symbol);
    const chart = await this.akShareService.getChart(akSymbol, 'daily');

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

  private matchFilter(val: number | null, filter: BacktestFilter): boolean {
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

  private computeRollingIndicators(
    bars: OHLCV[],
    windowSize: number,
  ): Record<string, number | null> {
    if (bars.length < windowSize) {
      return computeIndicators(bars);
    }
    return computeIndicators(bars.slice(-windowSize));
  }

  private checkSignal(bars: DayBar[], endIdx: number, filters: BacktestFilter[]): boolean {
    const window = bars.slice(0, endIdx + 1);
    const indicators = this.computeRollingIndicators(window, 300);

    const price = window[window.length - 1].close;
    const prevClose = window.length >= 2 ? window[window.length - 2].close : price;
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const vol = window[window.length - 1].volume;
    const high = window[window.length - 1].high;
    const low = window[window.length - 1].low;

    const fieldValues: Record<string, number | null> = {
      ...indicators,
      price,
      changePercent,
      volume: vol,
      amplitude: prevClose > 0 ? ((high - low) / prevClose) * 100 : null,
      turnover: vol * price,
    };

    return filters.every((f) => this.matchFilter(fieldValues[f.field] ?? null, f));
  }

  async run(query: BacktestQuery): Promise<BacktestResult> {
    const {
      symbol,
      filters,
      startDate,
      endDate,
      initialCapital = 100000,
      positionSize = 100,
      stopLoss,
      takeProfit,
      holdDays = 0,
    } = query;

    const allBars = await this.fetchBars(symbol, startDate, endDate);
    if (allBars.length === 0) {
      throw new Error(`No data for ${symbol}`);
    }

    const startIdx = allBars.findIndex((b) => b.date >= startDate);
    if (startIdx < 0) throw new Error('Start date out of range');

    let symbolName = symbol;
    try {
      const { akshare: akSymbol } = this.stockService.normalizeSymbol(symbol);
      const q = await this.akShareService.getQuote(akSymbol);
      symbolName = getCnName(akSymbol, q?.name || symbol);
    } catch {}

    const trades: Trade[] = [];
    const equity: { date: string; value: number }[] = [];
    const benchmark: { date: string; value: number }[] = [];

    let cash = initialCapital;
    let position = 0;
    let entryPrice = 0;
    let entryDate = '';
    let entryIdx = 0;

    const benchStartPrice = allBars[startIdx].close;
    const sizeRatio = positionSize / 100;

    for (let i = startIdx; i < allBars.length; i++) {
      const bar = allBars[i];
      const currentValue = position > 0 ? cash + position * bar.close : cash;

      equity.push({ date: bar.date, value: currentValue });
      benchmark.push({
        date: bar.date,
        value: initialCapital * (bar.close / benchStartPrice),
      });

      if (position > 0) {
        const pnlPct = ((bar.close - entryPrice) / entryPrice) * 100;
        const daysHeld = i - entryIdx;
        let exitReason: Trade['exitReason'] | null = null;

        if (stopLoss && pnlPct <= -stopLoss) {
          exitReason = 'stop_loss';
        } else if (takeProfit && pnlPct >= takeProfit) {
          exitReason = 'take_profit';
        } else if (holdDays > 0 && daysHeld >= holdDays) {
          exitReason = 'max_hold';
        } else if (i === allBars.length - 1) {
          exitReason = 'end';
        } else if (!this.checkSignal(allBars, i, filters) && daysHeld >= 1) {
          exitReason = 'signal';
        }

        if (exitReason) {
          const exitPrice = bar.close;
          const pnl = position * (exitPrice - entryPrice);
          trades.push({
            entryDate,
            entryPrice,
            exitDate: bar.date,
            exitPrice,
            pnl,
            pnlPercent: pnlPct,
            holdDays: daysHeld,
            exitReason,
          });
          cash += position * exitPrice;
          position = 0;
        }
      } else {
        if (i < allBars.length - 1 && this.checkSignal(allBars, i, filters)) {
          const investAmount = cash * sizeRatio;
          const shares = Math.floor(investAmount / bar.close);
          if (shares > 0) {
            position = shares;
            entryPrice = bar.close;
            entryDate = bar.date;
            entryIdx = i;
            cash -= shares * bar.close;
          }
        }
      }
    }

    const finalValue = equity.length > 0 ? equity[equity.length - 1].value : initialCapital;
    const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
    const benchFinal =
      benchmark.length > 0 ? benchmark[benchmark.length - 1].value : initialCapital;
    const benchmarkReturn = ((benchFinal - initialCapital) / initialCapital) * 100;

    const dayCount = equity.length;
    const years = dayCount / 252;
    const annualizedReturn =
      years > 0 ? (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100 : 0;

    let peak = initialCapital;
    let maxDrawdown = 0;
    for (const e of equity) {
      if (e.value > peak) peak = e.value;
      const dd = ((peak - e.value) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl <= 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

    const totalWin = wins.reduce((s, t) => s + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

    const dailyReturns: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      dailyReturns.push((equity[i].value - equity[i - 1].value) / equity[i - 1].value);
    }
    const avgDailyReturn =
      dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
    const stdDailyReturn =
      dailyReturns.length > 1
        ? Math.sqrt(
            dailyReturns.reduce((s, r) => s + (r - avgDailyReturn) ** 2, 0) /
              (dailyReturns.length - 1),
          )
        : 0;
    const sharpeRatio = stdDailyReturn > 0 ? (avgDailyReturn / stdDailyReturn) * Math.sqrt(252) : 0;

    const avgHoldDays =
      trades.length > 0 ? trades.reduce((s, t) => s + t.holdDays, 0) / trades.length : 0;
    const avgPnlPercent =
      trades.length > 0 ? trades.reduce((s, t) => s + t.pnlPercent, 0) / trades.length : 0;
    const maxWin = trades.length > 0 ? Math.max(...trades.map((t) => t.pnlPercent)) : 0;
    const maxLoss = trades.length > 0 ? Math.min(...trades.map((t) => t.pnlPercent)) : 0;

    return {
      symbol,
      symbolName,
      trades,
      equity: this.samplePoints(equity, 500),
      benchmark: this.samplePoints(benchmark, 500),
      stats: {
        totalReturn,
        benchmarkReturn,
        annualizedReturn,
        maxDrawdown,
        sharpeRatio,
        winRate,
        profitFactor,
        totalTrades: trades.length,
        avgHoldDays,
        avgPnlPercent,
        maxWin,
        maxLoss,
      },
    };
  }

  private samplePoints(
    arr: { date: string; value: number }[],
    maxPoints: number,
  ): { date: string; value: number }[] {
    if (arr.length <= maxPoints) return arr;
    const step = arr.length / maxPoints;
    const result: { date: string; value: number }[] = [];
    for (let i = 0; i < maxPoints; i++) {
      result.push(arr[Math.floor(i * step)]);
    }
    if (result[result.length - 1] !== arr[arr.length - 1]) {
      result.push(arr[arr.length - 1]);
    }
    return result;
  }
}

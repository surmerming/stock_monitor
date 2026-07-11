import { Injectable, Logger } from '@nestjs/common';
import {
  AkShareService,
  ChartQuote,
  QuoteResult,
  FinancialResult,
} from '../akshare/akshare.service';
import { StockService } from '../stock/stock.service';
import { getCnName } from '../common/cn-names';

@Injectable()
export class DetailService {
  private readonly logger = new Logger(DetailService.name);

  constructor(
    private readonly stockService: StockService,
    private readonly akShareService: AkShareService,
  ) {}

  async getChart(
    rawSymbol: string,
    interval: '1m' | '5m' | '15m' | '1d' | '1wk' | '1mo' | '3mo' | '1y' = '1m',
    range = '1d',
  ) {
    const { akshare: symbol, market } = this.stockService.normalizeSymbol(rawSymbol);

    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1d': 'daily',
      '1wk': 'weekly',
      '1mo': 'monthly',
      '3mo': 'monthly',
      '1y': 'monthly',
    };

    const period = intervalMap[interval] || 'daily';
    const isYearly = interval === '1y';

    try {
      const chartResult = await this.akShareService.getChart(symbol, period);
      if (!chartResult) {
        throw new Error(`No chart data for ${symbol}`);
      }

      const quote = await this.akShareService.getQuote(symbol);

      const meta = {
        symbol: symbol,
        currency: quote?.currency || (market === 'A股' ? 'CNY' : market === '港股' ? 'HKD' : 'USD'),
        exchangeName: market,
        longName: getCnName(symbol, quote?.name || symbol),
        shortName: getCnName(symbol, quote?.name || symbol),
        regularMarketPrice: quote?.current_price || 0,
        chartPreviousClose: quote?.prev_close || 0,
        regularMarketDayHigh: quote?.day_high || 0,
        regularMarketDayLow: quote?.day_low || 0,
        regularMarketVolume: quote?.volume || 0,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        timezone: 'Asia/Shanghai',
      };

      let quotes = chartResult.quotes.map((q: ChartQuote) => ({
        date: new Date(q.date).getTime() / 1000,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      }));

      if (isYearly) {
        quotes = this.aggregateToYearly(quotes);
      }

      return { meta, quotes };
    } catch (err) {
      this.logger.error(`Chart fetch error for ${symbol}: ${err.message}`);
      throw err;
    }
  }

  private aggregateToYearly(
    monthlyQuotes: {
      date: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[],
  ) {
    const yearMap = new Map<
      number,
      { date: number; open: number; high: number; low: number; close: number; volume: number }
    >();

    for (const q of monthlyQuotes) {
      if (q.close == null) continue;
      const d = new Date(q.date * 1000);
      const year = d.getFullYear();
      const existing = yearMap.get(year);

      if (!existing) {
        yearMap.set(year, { ...q });
      } else {
        if (q.high != null && (existing.high == null || q.high > existing.high))
          existing.high = q.high;
        if (q.low != null && (existing.low == null || q.low < existing.low)) existing.low = q.low;
        existing.close = q.close;
        existing.volume = (existing.volume ?? 0) + (q.volume ?? 0);
      }
    }

    return [...yearMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, q]) => ({
        date: new Date(year, 0, 1).getTime() / 1000,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      }));
  }

  async getDetail(rawSymbol: string) {
    const { akshare: symbol, market } = this.stockService.normalizeSymbol(rawSymbol);

    try {
      const quote = await this.akShareService.getQuote(symbol);

      if (!quote) {
        return {
          price: null,
          summaryDetail: null,
          financialData: null,
          shortInterest: null,
          majorHolders: null,
          recommendationTrend: [],
          insights: null,
          news: [],
        };
      }

      return {
        price: {
          symbol: symbol,
          shortName: getCnName(symbol, quote.name),
          longName: getCnName(symbol, quote.name),
          currency: quote.currency,
          exchange: market,
          marketState: null,
          regularMarketPrice: quote.current_price,
          regularMarketChange: quote.change,
          regularMarketChangePercent: quote.change_percent,
          regularMarketDayHigh: quote.day_high,
          regularMarketDayLow: quote.day_low,
          regularMarketVolume: quote.volume,
          regularMarketOpen: quote.open_price,
          regularMarketPreviousClose: quote.prev_close,
          marketCap: quote.market_cap || null,
        },
        summaryDetail: {
          trailingPE: quote.pe_ratio || null,
          forwardPE: null,
          priceToBook: quote.pb_ratio || null,
          dividendYield: null,
          dividendRate: null,
          beta: null,
          fiftyTwoWeekHigh: quote.week_52_high || null,
          fiftyTwoWeekLow: quote.week_52_low || null,
          fiftyDayAverage: quote.sixty_day_avg || null,
          twoHundredDayAverage: quote.two_hundred_fifty_day_avg || null,
          averageVolume: null,
          averageVolume10days: null,
          marketCap: quote.market_cap || null,
        },
        financialData: {
          targetHighPrice: null,
          targetLowPrice: null,
          targetMeanPrice: null,
          targetMedianPrice: null,
          recommendationKey: null,
          recommendationMean: null,
          numberOfAnalystOpinions: null,
          totalRevenue: null,
          revenueGrowth: quote.revenue_growth || null,
          grossMargins: quote.gross_margin || null,
          operatingMargins: quote.operating_margin || null,
          profitMargins: quote.net_margin || null,
          returnOnEquity: quote.roe || null,
          debtToEquity: null,
          earningsGrowth: quote.earnings_growth || null,
        },
        shortInterest: null,
        majorHolders: null,
        recommendationTrend: [],
        insights: null,
        news: [],
      };
    } catch (err) {
      this.logger.error(`Detail fetch error for ${symbol}: ${err.message}`);
      throw err;
    }
  }

  async getFinancials(rawSymbol: string) {
    const { akshare: symbol } = this.stockService.normalizeSymbol(rawSymbol);

    try {
      const incomeResult = await this.akShareService.getFinancial(symbol, 'income');
      const balanceResult = await this.akShareService.getFinancial(symbol, 'balance');
      const cashflowResult = await this.akShareService.getFinancial(symbol, 'cashflow');

      const mapIncome = (r: any) => ({
        date: r.report_date,
        periodType: 'annual',
        totalRevenue: r.total_revenue ?? null,
        grossProfit: null,
        operatingIncome: null,
        netIncome: r.net_income ?? null,
        ebit: null,
        ebitda: null,
        dilutedEPS: null,
        basicEPS: r.eps ?? null,
        costOfRevenue: null,
        researchAndDevelopment: null,
        sellingGeneralAndAdministration: null,
      });

      const mapBalance = (r: any) => ({
        date: r.report_date,
        periodType: 'annual',
        totalAssets: null,
        totalLiabilitiesNetMinorityInterest: null,
        stockholdersEquity: null,
        cashAndCashEquivalents: null,
        totalDebt: null,
        currentAssets: null,
        currentLiabilities: null,
        inventory: null,
        receivables: null,
      });

      const mapCashflow = (r: any) => ({
        date: r.report_date,
        periodType: 'annual',
        operatingCashFlow: null,
        capitalExpenditure: null,
        freeCashFlow: null,
        investingCashFlow: null,
        financingCashFlow: null,
      });

      return {
        quarterly: {
          income: [],
          balance: [],
          cashflow: [],
        },
        annual: {
          income: incomeResult?.data?.map(mapIncome) || [],
          balance: balanceResult?.data?.map(mapBalance) || [],
          cashflow: cashflowResult?.data?.map(mapCashflow) || [],
        },
        earningsChart: null,
      };
    } catch (err) {
      this.logger.error(`Financials fetch error for ${symbol}: ${err.message}`);
      throw err;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { StockService } from '../stock/stock.service';

const yahooFinance = new YahooFinance();

type FundamentalsModule = 'financials' | 'balance-sheet' | 'cash-flow';

@Injectable()
export class DetailService {
  private readonly logger = new Logger(DetailService.name);

  constructor(private readonly stockService: StockService) {}

  async getChart(
    rawSymbol: string,
    interval: '1m' | '5m' | '15m' | '1d' = '1m',
    range: string = '1d',
  ) {
    const rangeToP1: Record<string, number> = {
      '1d': 1,
      '5d': 5,
      '1mo': 30,
      '3mo': 90,
      '6mo': 180,
      '1y': 365,
    };
    const days = rangeToP1[range] ?? 1;
    const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { yahoo: symbol } = this.stockService.normalizeSymbol(rawSymbol);

    try {
      const result: any = await yahooFinance.chart(symbol, {
        period1,
        interval,
      }, { validateResult: false });

      return {
        meta: {
          symbol: result.meta.symbol,
          currency: result.meta.currency,
          exchangeName: result.meta.exchangeName,
          longName: result.meta.longName,
          shortName: result.meta.shortName,
          regularMarketPrice: result.meta.regularMarketPrice,
          chartPreviousClose: result.meta.chartPreviousClose ?? result.meta.previousClose,
          regularMarketDayHigh: result.meta.regularMarketDayHigh,
          regularMarketDayLow: result.meta.regularMarketDayLow,
          regularMarketVolume: result.meta.regularMarketVolume,
          fiftyTwoWeekHigh: result.meta.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: result.meta.fiftyTwoWeekLow,
          timezone: result.meta.timezone,
        },
        quotes: result.quotes.map((q) => ({
          date: q.date,
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume,
        })),
      };
    } catch (err) {
      this.logger.error(`Chart fetch error for ${symbol}: ${err.message}`);
      throw err;
    }
  }

  async getDetail(rawSymbol: string) {
    const { yahoo: symbol } = this.stockService.normalizeSymbol(rawSymbol);
    try {
      const [summary, insightsData, newsData] = await Promise.allSettled([
        yahooFinance.quoteSummary(symbol, {
          modules: [
            'price',
            'summaryDetail',
            'financialData',
            'recommendationTrend',
            'defaultKeyStatistics',
            'majorHoldersBreakdown',
          ],
        }, { validateResult: false }),
        yahooFinance.insights(symbol),
        yahooFinance.search(symbol, { newsCount: 10 }, { validateResult: false }),
      ]);

      const summaryResult: any = summary.status === 'fulfilled' ? summary.value : null;
      const insightsResult: any = insightsData.status === 'fulfilled' ? insightsData.value : null;
      const newsResult: any = newsData.status === 'fulfilled' ? newsData.value : null;

      const price = summaryResult?.price;
      const summaryDetail = summaryResult?.summaryDetail;
      const financialData = summaryResult?.financialData;
      const recTrend = summaryResult?.recommendationTrend;
      const keyStats = summaryResult?.defaultKeyStatistics;
      const holders = summaryResult?.majorHoldersBreakdown;

      return {
        price: price
          ? {
              symbol: price.symbol,
              shortName: price.shortName,
              longName: price.longName,
              currency: price.currency,
              exchange: price.exchangeName,
              marketState: price.marketState,
              regularMarketPrice: price.regularMarketPrice,
              regularMarketChange: price.regularMarketChange,
              regularMarketChangePercent: price.regularMarketChangePercent,
              regularMarketDayHigh: price.regularMarketDayHigh,
              regularMarketDayLow: price.regularMarketDayLow,
              regularMarketVolume: price.regularMarketVolume,
              regularMarketOpen: price.regularMarketOpen,
              regularMarketPreviousClose: price.regularMarketPreviousClose,
              marketCap: price.marketCap,
            }
          : null,
        summaryDetail: summaryDetail
          ? {
              trailingPE: summaryDetail.trailingPE,
              forwardPE: summaryDetail.forwardPE,
              priceToBook: summaryDetail.priceToBook,
              dividendYield: summaryDetail.dividendYield,
              dividendRate: summaryDetail.dividendRate,
              beta: summaryDetail.beta,
              fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow,
              fiftyDayAverage: summaryDetail.fiftyDayAverage,
              twoHundredDayAverage: summaryDetail.twoHundredDayAverage,
              averageVolume: summaryDetail.averageVolume,
              averageVolume10days: summaryDetail.averageVolume10days,
              marketCap: summaryDetail.marketCap,
            }
          : null,
        financialData: financialData
          ? {
              targetHighPrice: financialData.targetHighPrice,
              targetLowPrice: financialData.targetLowPrice,
              targetMeanPrice: financialData.targetMeanPrice,
              targetMedianPrice: financialData.targetMedianPrice,
              recommendationKey: financialData.recommendationKey,
              recommendationMean: financialData.recommendationMean,
              numberOfAnalystOpinions: financialData.numberOfAnalystOpinions,
              totalRevenue: financialData.totalRevenue,
              revenueGrowth: financialData.revenueGrowth,
              grossMargins: financialData.grossMargins,
              operatingMargins: financialData.operatingMargins,
              profitMargins: financialData.profitMargins,
              returnOnEquity: financialData.returnOnEquity,
              debtToEquity: financialData.debtToEquity,
              earningsGrowth: financialData.earningsGrowth,
            }
          : null,
        shortInterest: keyStats
          ? {
              sharesShort: keyStats.sharesShort,
              sharesShortPriorMonth: keyStats.sharesShortPriorMonth,
              shortRatio: keyStats.shortRatio,
              shortPercentOfFloat: keyStats.shortPercentOfFloat,
              dateShortInterest: keyStats.dateShortInterest,
              sharesOutstanding: keyStats.sharesOutstanding,
              floatShares: keyStats.floatShares,
              heldPercentInsiders: keyStats.heldPercentInsiders,
              heldPercentInstitutions: keyStats.heldPercentInstitutions,
            }
          : null,
        majorHolders: holders
          ? {
              insidersPercentHeld: holders.insidersPercentHeld,
              institutionsPercentHeld: holders.institutionsPercentHeld,
              institutionsFloatPercentHeld: holders.institutionsFloatPercentHeld,
              institutionsCount: holders.institutionsCount,
            }
          : null,
        recommendationTrend: recTrend?.trend ?? [],
        insights: insightsResult
          ? {
              instrumentInfo: insightsResult.instrumentInfo,
              recommendation: insightsResult.recommendation,
              companySnapshot: insightsResult.companySnapshot,
              sigDevs: insightsResult.sigDevs?.slice(0, 5) ?? [],
            }
          : null,
        news: (newsResult?.news ?? []).slice(0, 10).map((n: any) => ({
          title: n.title,
          link: n.link,
          publisher: n.publisher,
          publishTime: n.providerPublishTime,
        })),
      };
    } catch (err) {
      this.logger.error(`Detail fetch error for ${symbol}: ${err.message}`);
      throw err;
    }
  }

  async getFinancials(rawSymbol: string) {
    const { yahoo: symbol } = this.stockService.normalizeSymbol(rawSymbol);
    const period1 = new Date(Date.now() - 4 * 365 * 24 * 60 * 60 * 1000);
    const period2 = new Date();
    const opts = { validateResult: false } as const;

    const fetchTimeSeries = async (type: 'quarterly' | 'annual', module: FundamentalsModule) => {
      try {
        const res: any = await yahooFinance.fundamentalsTimeSeries(
          symbol,
          { period1, period2, type, module },
          opts,
        );
        return Array.isArray(res) ? res : [];
      } catch (err) {
        this.logger.warn(`fundamentalsTimeSeries ${module}/${type} for ${symbol}: ${err.message}`);
        return [];
      }
    };

    try {
      const [qIncome, aIncome, qBalance, aBalance, qCashflow, aCashflow, earningsData] =
        await Promise.all([
          fetchTimeSeries('quarterly', 'financials'),
          fetchTimeSeries('annual', 'financials'),
          fetchTimeSeries('quarterly', 'balance-sheet'),
          fetchTimeSeries('annual', 'balance-sheet'),
          fetchTimeSeries('quarterly', 'cash-flow'),
          fetchTimeSeries('annual', 'cash-flow'),
          yahooFinance
            .quoteSummary(symbol, { modules: ['earnings'] }, opts)
            .then((r: any) => r?.earnings ?? null)
            .catch(() => null),
        ]);

      const mapIncome = (r: any) => ({
        date: r.date,
        periodType: r.periodType,
        totalRevenue: r.totalRevenue ?? null,
        grossProfit: r.grossProfit ?? null,
        operatingIncome: r.operatingIncome ?? null,
        netIncome: r.netIncome ?? null,
        ebit: r.EBIT ?? null,
        ebitda: r.EBITDA ?? null,
        dilutedEPS: r.dilutedEPS ?? null,
        basicEPS: r.basicEPS ?? null,
        costOfRevenue: r.costOfRevenue ?? null,
        researchAndDevelopment: r.researchAndDevelopment ?? null,
        sellingGeneralAndAdministration: r.sellingGeneralAndAdministration ?? null,
      });

      const mapBalance = (r: any) => ({
        date: r.date,
        periodType: r.periodType,
        totalAssets: r.totalAssets ?? null,
        totalLiabilitiesNetMinorityInterest: r.totalLiabilitiesNetMinorityInterest ?? null,
        stockholdersEquity: r.stockholdersEquity ?? null,
        cashAndCashEquivalents: r.cashCashEquivalentsAndShortTermInvestments ?? r.cashAndCashEquivalents ?? null,
        totalDebt: r.totalDebt ?? null,
        currentAssets: r.currentAssets ?? null,
        currentLiabilities: r.currentLiabilities ?? null,
        inventory: r.inventory ?? null,
        receivables: r.receivables ?? null,
      });

      const mapCashflow = (r: any) => ({
        date: r.date,
        periodType: r.periodType,
        operatingCashFlow: r.operatingCashFlow ?? null,
        capitalExpenditure: r.capitalExpenditure ?? null,
        freeCashFlow: r.freeCashFlow ?? null,
        investingCashFlow: r.investingCashFlow ?? null,
        financingCashFlow: r.financingCashFlow ?? null,
      });

      return {
        quarterly: {
          income: qIncome.filter((r: any) => r.totalRevenue != null || r.netIncome != null).map(mapIncome),
          balance: qBalance.filter((r: any) => r.totalAssets != null).map(mapBalance),
          cashflow: qCashflow.filter((r: any) => r.operatingCashFlow != null).map(mapCashflow),
        },
        annual: {
          income: aIncome.filter((r: any) => r.totalRevenue != null || r.netIncome != null).map(mapIncome),
          balance: aBalance.filter((r: any) => r.totalAssets != null).map(mapBalance),
          cashflow: aCashflow.filter((r: any) => r.operatingCashFlow != null).map(mapCashflow),
        },
        earningsChart: earningsData?.financialsChart ?? null,
      };
    } catch (err) {
      this.logger.error(`Financials fetch error for ${symbol}: ${err.message}`);
      throw err;
    }
  }
}

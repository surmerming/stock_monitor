import { StockService } from '../stock/stock.service';
export declare class DetailService {
    private readonly stockService;
    private readonly logger;
    constructor(stockService: StockService);
    getChart(rawSymbol: string, interval?: '1m' | '5m' | '15m' | '1d' | '1wk' | '1mo' | '3mo' | '1y', range?: string): Promise<{
        meta: {
            symbol: any;
            currency: any;
            exchangeName: any;
            longName: any;
            shortName: any;
            regularMarketPrice: any;
            chartPreviousClose: any;
            regularMarketDayHigh: any;
            regularMarketDayLow: any;
            regularMarketVolume: any;
            fiftyTwoWeekHigh: any;
            fiftyTwoWeekLow: any;
            timezone: any;
        };
        quotes: any;
    }>;
    private aggregateToYearly;
    getDetail(rawSymbol: string): Promise<{
        price: {
            symbol: any;
            shortName: any;
            longName: any;
            currency: any;
            exchange: any;
            marketState: any;
            regularMarketPrice: any;
            regularMarketChange: any;
            regularMarketChangePercent: any;
            regularMarketDayHigh: any;
            regularMarketDayLow: any;
            regularMarketVolume: any;
            regularMarketOpen: any;
            regularMarketPreviousClose: any;
            marketCap: any;
        };
        summaryDetail: {
            trailingPE: any;
            forwardPE: any;
            priceToBook: any;
            dividendYield: any;
            dividendRate: any;
            beta: any;
            fiftyTwoWeekHigh: any;
            fiftyTwoWeekLow: any;
            fiftyDayAverage: any;
            twoHundredDayAverage: any;
            averageVolume: any;
            averageVolume10days: any;
            marketCap: any;
        };
        financialData: {
            targetHighPrice: any;
            targetLowPrice: any;
            targetMeanPrice: any;
            targetMedianPrice: any;
            recommendationKey: any;
            recommendationMean: any;
            numberOfAnalystOpinions: any;
            totalRevenue: any;
            revenueGrowth: any;
            grossMargins: any;
            operatingMargins: any;
            profitMargins: any;
            returnOnEquity: any;
            debtToEquity: any;
            earningsGrowth: any;
        };
        shortInterest: {
            sharesShort: any;
            sharesShortPriorMonth: any;
            shortRatio: any;
            shortPercentOfFloat: any;
            dateShortInterest: any;
            sharesOutstanding: any;
            floatShares: any;
            heldPercentInsiders: any;
            heldPercentInstitutions: any;
        };
        majorHolders: {
            insidersPercentHeld: any;
            institutionsPercentHeld: any;
            institutionsFloatPercentHeld: any;
            institutionsCount: any;
        };
        recommendationTrend: any;
        insights: {
            instrumentInfo: any;
            recommendation: any;
            companySnapshot: any;
            sigDevs: any;
        };
        news: any;
    }>;
    getFinancials(rawSymbol: string): Promise<{
        quarterly: {
            income: {
                date: any;
                periodType: any;
                totalRevenue: any;
                grossProfit: any;
                operatingIncome: any;
                netIncome: any;
                ebit: any;
                ebitda: any;
                dilutedEPS: any;
                basicEPS: any;
                costOfRevenue: any;
                researchAndDevelopment: any;
                sellingGeneralAndAdministration: any;
            }[];
            balance: {
                date: any;
                periodType: any;
                totalAssets: any;
                totalLiabilitiesNetMinorityInterest: any;
                stockholdersEquity: any;
                cashAndCashEquivalents: any;
                totalDebt: any;
                currentAssets: any;
                currentLiabilities: any;
                inventory: any;
                receivables: any;
            }[];
            cashflow: {
                date: any;
                periodType: any;
                operatingCashFlow: any;
                capitalExpenditure: any;
                freeCashFlow: any;
                investingCashFlow: any;
                financingCashFlow: any;
            }[];
        };
        annual: {
            income: {
                date: any;
                periodType: any;
                totalRevenue: any;
                grossProfit: any;
                operatingIncome: any;
                netIncome: any;
                ebit: any;
                ebitda: any;
                dilutedEPS: any;
                basicEPS: any;
                costOfRevenue: any;
                researchAndDevelopment: any;
                sellingGeneralAndAdministration: any;
            }[];
            balance: {
                date: any;
                periodType: any;
                totalAssets: any;
                totalLiabilitiesNetMinorityInterest: any;
                stockholdersEquity: any;
                cashAndCashEquivalents: any;
                totalDebt: any;
                currentAssets: any;
                currentLiabilities: any;
                inventory: any;
                receivables: any;
            }[];
            cashflow: {
                date: any;
                periodType: any;
                operatingCashFlow: any;
                capitalExpenditure: any;
                freeCashFlow: any;
                investingCashFlow: any;
                financingCashFlow: any;
            }[];
        };
        earningsChart: any;
    }>;
}

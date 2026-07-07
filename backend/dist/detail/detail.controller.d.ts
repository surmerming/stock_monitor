import { DetailService } from './detail.service';
export declare class DetailController {
    private readonly detailService;
    constructor(detailService: DetailService);
    getChart(symbol: string, interval?: string, range?: string): Promise<{
        meta: {
            symbol: string;
            currency: string;
            exchangeName: string;
            longName: string;
            shortName: string;
            regularMarketPrice: number;
            chartPreviousClose: number;
            regularMarketDayHigh: number;
            regularMarketDayLow: number;
            regularMarketVolume: number;
            fiftyTwoWeekHigh: any;
            fiftyTwoWeekLow: any;
            timezone: string;
        };
        quotes: {
            date: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
        }[];
    }>;
    getDetail(symbol: string): Promise<{
        price: {
            symbol: string;
            shortName: string;
            longName: string;
            currency: string;
            exchange: string;
            marketState: any;
            regularMarketPrice: number;
            regularMarketChange: number;
            regularMarketChangePercent: number;
            regularMarketDayHigh: number;
            regularMarketDayLow: number;
            regularMarketVolume: number;
            regularMarketOpen: number;
            regularMarketPreviousClose: number;
            marketCap: number;
        };
        summaryDetail: {
            trailingPE: number;
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
            marketCap: number;
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
        shortInterest: any;
        majorHolders: any;
        recommendationTrend: any[];
        insights: any;
        news: any[];
    }>;
    getFinancials(symbol: string): Promise<{
        quarterly: {
            income: any[];
            balance: any[];
            cashflow: any[];
        };
        annual: {
            income: {
                date: any;
                periodType: string;
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
                periodType: string;
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
                periodType: string;
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

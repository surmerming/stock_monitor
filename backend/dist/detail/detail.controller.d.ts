import { DetailService } from './detail.service';
export declare class DetailController {
    private readonly detailService;
    constructor(detailService: DetailService);
    getChart(symbol: string, interval?: string, range?: string): Promise<{
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
    getDetail(symbol: string): Promise<{
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
    }>;
}

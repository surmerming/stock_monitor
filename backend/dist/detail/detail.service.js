"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DetailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetailService = void 0;
const common_1 = require("@nestjs/common");
const akshare_service_1 = require("../akshare/akshare.service");
const stock_service_1 = require("../stock/stock.service");
const cn_names_1 = require("../common/cn-names");
let DetailService = DetailService_1 = class DetailService {
    constructor(stockService, akShareService) {
        this.stockService = stockService;
        this.akShareService = akShareService;
        this.logger = new common_1.Logger(DetailService_1.name);
    }
    async getChart(rawSymbol, interval = '1m', range = '1d') {
        const { akshare: symbol, market } = this.stockService.normalizeSymbol(rawSymbol);
        const intervalMap = {
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
            const rawQuotes = interval === '1m' || interval === '5m'
                ? ((await this.akShareService.getIntradayChart(symbol, interval === '1m' ? 1 : 5)) ?? [])
                : ((await this.akShareService.getChart(symbol, period))?.quotes ?? []);
            const quote = await this.akShareService.getQuote(symbol);
            const meta = {
                symbol: symbol,
                currency: quote?.currency || (market === 'A股' ? 'CNY' : market === '港股' ? 'HKD' : 'USD'),
                exchangeName: market,
                longName: (0, cn_names_1.getCnName)(symbol, quote?.name || symbol),
                shortName: (0, cn_names_1.getCnName)(symbol, quote?.name || symbol),
                regularMarketPrice: quote?.current_price || 0,
                chartPreviousClose: quote?.prev_close || 0,
                regularMarketDayHigh: quote?.day_high || 0,
                regularMarketDayLow: quote?.day_low || 0,
                regularMarketVolume: quote?.volume || 0,
                fiftyTwoWeekHigh: null,
                fiftyTwoWeekLow: null,
                timezone: 'Asia/Shanghai',
            };
            let quotes = rawQuotes.map((q) => ({
                date: q.date,
                open: q.open,
                high: q.high,
                low: q.low,
                close: q.close,
                volume: q.volume,
                turnover: q.turnover ?? null,
            }));
            if (isYearly) {
                quotes = this.aggregateToYearly(quotes);
            }
            return { meta, quotes };
        }
        catch (err) {
            this.logger.error(`Chart fetch error for ${symbol}: ${err.message}`);
            throw err;
        }
    }
    aggregateToYearly(monthlyQuotes) {
        const yearMap = new Map();
        for (const q of monthlyQuotes) {
            if (q.close == null)
                continue;
            const year = parseInt(q.date.slice(0, 4), 10);
            if (!Number.isFinite(year))
                continue;
            const existing = yearMap.get(year);
            if (!existing) {
                yearMap.set(year, { ...q });
            }
            else {
                if (q.high != null && (existing.high == null || q.high > existing.high))
                    existing.high = q.high;
                if (q.low != null && (existing.low == null || q.low < existing.low))
                    existing.low = q.low;
                existing.close = q.close;
                existing.volume = (existing.volume ?? 0) + (q.volume ?? 0);
                existing.date = q.date;
            }
        }
        return [...yearMap.entries()].sort(([a], [b]) => a - b).map(([, q]) => q);
    }
    async getDetail(rawSymbol) {
        const { akshare: symbol, market } = this.stockService.normalizeSymbol(rawSymbol);
        try {
            const quote = await this.akShareService.getQuote(symbol);
            if (!quote) {
                return {
                    price: null,
                    summaryDetail: null,
                    financialData: null,
                    moneyflow: null,
                    shortInterest: null,
                    majorHolders: null,
                    recommendationTrend: [],
                    insights: null,
                    news: [],
                };
            }
            const mf = await this.akShareService.getMoneyflowDetail(symbol);
            return {
                price: {
                    symbol: symbol,
                    shortName: (0, cn_names_1.getCnName)(symbol, quote.name),
                    longName: (0, cn_names_1.getCnName)(symbol, quote.name),
                    currency: quote.currency,
                    exchange: market,
                    marketState: null,
                    regularMarketPrice: quote.current_price,
                    regularMarketChange: quote.change,
                    regularMarketChangePercent: quote.change_percent / 100,
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
                    dividendYield: quote.dividend_rate ?? quote.dividend_yield ?? null,
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
                    totalRevenue: quote.revenue || null,
                    revenueGrowth: quote.revenue_growth || null,
                    grossMargins: quote.gross_margin || null,
                    operatingMargins: quote.operating_margin || null,
                    profitMargins: quote.net_margin || null,
                    returnOnEquity: quote.roe || null,
                    debtToEquity: null,
                    earningsGrowth: quote.earnings_growth || null,
                    roeAvg: quote.roe_avg || null,
                    roeDiluted: quote.roe_diluted || null,
                    roeNet: quote.roe_net || null,
                    roa: quote.roa || null,
                    roic: quote.roic || null,
                    ebitMargin: quote.ebit_margin || null,
                    currentRatio: quote.current_ratio || null,
                    quickRatio: quote.quick_ratio || null,
                    debtRatio: quote.debt_ratio || null,
                    equityMultiplier: quote.equity_multiplier || null,
                    cashRatio: quote.cash_ratio || null,
                    arTurn: quote.ar_turn || null,
                    arDays: quote.ar_days || null,
                    invTurn: quote.inv_turn || null,
                    invDays: quote.inv_days || null,
                    taTurn: quote.ta_turn || null,
                    ocfToProfit: quote.ocf_to_profit || null,
                    costExpenseRatio: quote.cost_expense_ratio || null,
                    basicEPS: quote.basic_eps || null,
                    dilutedEPS: quote.diluted_eps || null,
                    bps: quote.bps || null,
                    ocfps: quote.ocfps || null,
                    fcps: quote.fcps || null,
                    udpps: quote.udpps || null,
                    cappps: quote.cappps || null,
                    surppps: quote.surppps || null,
                    revenue: quote.revenue || null,
                    cost: quote.cost || null,
                    netProfit: quote.net_profit || null,
                    netProfitParent: quote.net_profit_parent || null,
                    netProfitDeducted: quote.net_profit_deducted || null,
                    equity: quote.equity || null,
                    totalAssets: quote.total_assets || null,
                    totalLiabilities: quote.total_liabilities || null,
                    ocf: quote.ocf || null,
                },
                moneyflow: mf
                    ? {
                        date: mf.date,
                        netFlow: mf.net_flow,
                        superNet: mf.super_net,
                        largeNet: mf.large_net,
                        mediumNet: mf.medium_net,
                        smallNet: mf.small_net,
                    }
                    : null,
                shortInterest: null,
                majorHolders: null,
                recommendationTrend: [],
                insights: null,
                news: [],
            };
        }
        catch (err) {
            this.logger.error(`Detail fetch error for ${symbol}: ${err.message}`);
            throw err;
        }
    }
    async getFinancials(rawSymbol) {
        const { akshare: symbol } = this.stockService.normalizeSymbol(rawSymbol);
        try {
            const incomeResult = await this.akShareService.getFinancial(symbol, 'income');
            const balanceResult = await this.akShareService.getFinancial(symbol, 'balance');
            const cashflowResult = await this.akShareService.getFinancial(symbol, 'cashflow');
            const mapIncome = (r) => ({
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
            const mapBalance = (r) => ({
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
            const mapCashflow = (r) => ({
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
        }
        catch (err) {
            this.logger.error(`Financials fetch error for ${symbol}: ${err.message}`);
            throw err;
        }
    }
};
exports.DetailService = DetailService;
exports.DetailService = DetailService = DetailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [stock_service_1.StockService,
        akshare_service_1.AkShareService])
], DetailService);
//# sourceMappingURL=detail.service.js.map
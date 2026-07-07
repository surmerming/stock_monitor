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
var ScannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScannerService = void 0;
const common_1 = require("@nestjs/common");
const akshare_service_1 = require("../akshare/akshare.service");
const cn_names_1 = require("../common/cn-names");
const CACHE_TTL = 2 * 60 * 1000;
const US_TOP_STOCKS = [
    'AAPL',
    'MSFT',
    'NVDA',
    'GOOGL',
    'AMZN',
    'META',
    'TSLA',
    'BRK-B',
    'JPM',
    'V',
    'UNH',
    'MA',
    'JNJ',
    'PG',
    'HD',
    'AVGO',
    'COST',
    'MRK',
    'ABBV',
    'CRM',
    'AMD',
    'NFLX',
    'PEP',
    'KO',
    'TMO',
    'ADBE',
    'LIN',
];
let ScannerService = ScannerService_1 = class ScannerService {
    constructor(akShareService) {
        this.akShareService = akShareService;
        this.logger = new common_1.Logger(ScannerService_1.name);
        this.cache = new Map();
    }
    getCached(key) {
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
            return entry.data;
        }
        return null;
    }
    setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    transformQuote(q) {
        return {
            symbol: q.symbol,
            name: (0, cn_names_1.getCnName)(q.symbol, q.name),
            price: q.current_price,
            change: q.change,
            changePercent: q.change_percent,
            volume: q.volume,
            marketCap: q.market_cap || null,
            exchange: q.market,
            avgVolume3m: null,
        };
    }
    async getGainers(count = 25) {
        const cached = this.getCached('gainers');
        if (cached)
            return cached;
        try {
            const sectorResult = await this.akShareService.getSector('a_share');
            const sectors = sectorResult?.sectors || [];
            const results = await this.akShareService.getQuotesBatch(US_TOP_STOCKS);
            const quotes = results.filter((r) => r.data).map((r) => r.data);
            quotes.sort((a, b) => b.change_percent - a.change_percent);
            const items = quotes.slice(0, count).map((q) => this.transformQuote(q));
            this.setCache('gainers', items);
            this.logger.debug(`Fetched ${items.length} gainers`);
            return items;
        }
        catch (err) {
            this.logger.error(`Failed to fetch gainers: ${err.message}`);
            return this.getCached('gainers') ?? [];
        }
    }
    async getLosers(count = 25) {
        const cached = this.getCached('losers');
        if (cached)
            return cached;
        try {
            const results = await this.akShareService.getQuotesBatch(US_TOP_STOCKS);
            const quotes = results.filter((r) => r.data).map((r) => r.data);
            quotes.sort((a, b) => a.change_percent - b.change_percent);
            const items = quotes.slice(0, count).map((q) => this.transformQuote(q));
            this.setCache('losers', items);
            this.logger.debug(`Fetched ${items.length} losers`);
            return items;
        }
        catch (err) {
            this.logger.error(`Failed to fetch losers: ${err.message}`);
            return this.getCached('losers') ?? [];
        }
    }
    async getActive(count = 25) {
        const cached = this.getCached('active');
        if (cached)
            return cached;
        try {
            const results = await this.akShareService.getQuotesBatch(US_TOP_STOCKS);
            const quotes = results.filter((r) => r.data).map((r) => r.data);
            quotes.sort((a, b) => b.volume - a.volume);
            const items = quotes.slice(0, count).map((q) => this.transformQuote(q));
            this.setCache('active', items);
            this.logger.debug(`Fetched ${items.length} most active`);
            return items;
        }
        catch (err) {
            this.logger.error(`Failed to fetch active: ${err.message}`);
            return this.getCached('active') ?? [];
        }
    }
    async getTrending() {
        const cached = this.getCached('trending');
        if (cached)
            return cached;
        const regions = ['US', 'HK'];
        const results = [];
        const usSymbols = US_TOP_STOCKS;
        const hkSymbols = ['HK2800', 'HK3067', 'HK3033', 'HK2828', 'HK3188'];
        results.push({ region: 'US', symbols: usSymbols });
        results.push({ region: 'HK', symbols: hkSymbols });
        this.setCache('trending', results);
        this.logger.debug(`Fetched trending for ${regions.join(', ')}`);
        return results;
    }
    async getTrendingWithQuotes() {
        const cached = this.getCached('trending_quotes');
        if (cached)
            return cached;
        const trending = await this.getTrending();
        const regionNames = { US: '美股', HK: '港股' };
        const allSymbols = trending.flatMap((t) => t.symbols);
        if (allSymbols.length === 0)
            return [];
        try {
            const results = await this.akShareService.getQuotesBatch(allSymbols);
            const quotes = results.filter((r) => r.data).map((r) => r.data);
            const quoteMap = new Map();
            for (const q of quotes) {
                quoteMap.set(q.symbol, q);
            }
            const resultsWithQuotes = trending.map((t) => ({
                region: t.region,
                regionName: regionNames[t.region] || t.region,
                items: t.symbols
                    .filter((s) => quoteMap.has(s))
                    .map((s) => {
                    const q = quoteMap.get(s);
                    return this.transformQuote(q);
                }),
            }));
            this.setCache('trending_quotes', resultsWithQuotes);
            return resultsWithQuotes;
        }
        catch (err) {
            this.logger.error(`Failed to fetch trending quotes: ${err.message}`);
            return [];
        }
    }
};
exports.ScannerService = ScannerService;
exports.ScannerService = ScannerService = ScannerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [akshare_service_1.AkShareService])
], ScannerService);
//# sourceMappingURL=scanner.service.js.map
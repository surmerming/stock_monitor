"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ScannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScannerService = void 0;
const common_1 = require("@nestjs/common");
const yahoo_finance2_1 = require("yahoo-finance2");
const cn_names_1 = require("../common/cn-names");
const yahooFinance = new yahoo_finance2_1.default();
const CACHE_TTL = 2 * 60 * 1000;
let ScannerService = exports.ScannerService = ScannerService_1 = class ScannerService {
    constructor() {
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
            name: (0, cn_names_1.getCnName)(q.symbol, q.shortName || q.longName || q.displayName || q.symbol),
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChange ?? 0,
            changePercent: q.regularMarketChangePercent ?? 0,
            volume: q.regularMarketVolume ?? 0,
            marketCap: q.marketCap ?? null,
            exchange: q.fullExchangeName || q.exchange || '',
            avgVolume3m: q.averageDailyVolume3Month ?? null,
        };
    }
    async getGainers(count = 25) {
        const cached = this.getCached('gainers');
        if (cached)
            return cached;
        try {
            const result = await yahooFinance.screener({ scrIds: 'day_gainers', count });
            const items = result.quotes.map((q) => this.transformQuote(q));
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
            const result = await yahooFinance.screener({ scrIds: 'day_losers', count });
            const items = result.quotes.map((q) => this.transformQuote(q));
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
            const result = await yahooFinance.screener({ scrIds: 'most_actives', count });
            const items = result.quotes.map((q) => this.transformQuote(q));
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
        for (const region of regions) {
            try {
                const result = await yahooFinance.trendingSymbols(region, { count: 20 });
                results.push({
                    region,
                    symbols: result.quotes.map((q) => q.symbol),
                });
            }
            catch (err) {
                this.logger.error(`Failed to fetch trending for ${region}: ${err.message}`);
                results.push({ region, symbols: [] });
            }
        }
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
            const quotes = await yahooFinance.quote(allSymbols);
            const quoteMap = new Map();
            const arr = Array.isArray(quotes) ? quotes : [quotes];
            for (const q of arr) {
                if (q?.symbol)
                    quoteMap.set(q.symbol, q);
            }
            const results = trending.map((t) => ({
                region: t.region,
                regionName: regionNames[t.region] || t.region,
                items: t.symbols
                    .filter((s) => quoteMap.has(s))
                    .map((s) => {
                    const q = quoteMap.get(s);
                    return {
                        symbol: q.symbol,
                        name: (0, cn_names_1.getCnName)(q.symbol, q.shortName || q.longName || q.displayName || q.symbol),
                        price: q.regularMarketPrice ?? 0,
                        change: q.regularMarketChange ?? 0,
                        changePercent: q.regularMarketChangePercent ?? 0,
                        volume: q.regularMarketVolume ?? 0,
                        marketCap: q.marketCap ?? null,
                        exchange: q.fullExchangeName || q.exchange || '',
                        avgVolume3m: q.averageDailyVolume3Month ?? null,
                    };
                }),
            }));
            this.setCache('trending_quotes', results);
            return results;
        }
        catch (err) {
            this.logger.error(`Failed to fetch trending quotes: ${err.message}`);
            return [];
        }
    }
};
exports.ScannerService = ScannerService = ScannerService_1 = __decorate([
    (0, common_1.Injectable)()
], ScannerService);
//# sourceMappingURL=scanner.service.js.map
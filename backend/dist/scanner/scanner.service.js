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
const LIMIT_UP_CACHE_TTL = 10 * 60 * 1000;
const SNAPSHOT_CACHE_TTL = 60 * 1000;
let ScannerService = ScannerService_1 = class ScannerService {
    constructor(akShareService) {
        this.akShareService = akShareService;
        this.logger = new common_1.Logger(ScannerService_1.name);
        this.cache = new Map();
    }
    getCached(key, ttlMs = CACHE_TTL) {
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < ttlMs) {
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
    async getSnapshot(market) {
        const key = `${market}_snapshot`;
        const cached = this.getCached(key, SNAPSHOT_CACHE_TTL);
        if (cached)
            return cached;
        const list = await this.akShareService.getMarketStockList(market);
        this.setCache(key, list);
        return list;
    }
    normalizeMarket(market) {
        return market === 'hk' || market === 'us' ? market : 'a_share';
    }
    async getGainers(count = 25, market = 'a_share') {
        const cacheKey = `gainers_${market}`;
        const cached = this.getCached(cacheKey);
        if (cached)
            return cached;
        try {
            const snapshot = await this.getSnapshot(market);
            const items = [...snapshot]
                .sort((a, b) => b.change_percent - a.change_percent)
                .slice(0, count)
                .map((q) => this.transformQuote(q));
            this.setCache(cacheKey, items);
            this.logger.debug(`Fetched ${items.length} gainers (${market})`);
            return items;
        }
        catch (err) {
            this.logger.error(`Failed to fetch gainers: ${err.message}`);
            return this.getCached(cacheKey) ?? [];
        }
    }
    async getLosers(count = 25, market = 'a_share') {
        const cacheKey = `losers_${market}`;
        const cached = this.getCached(cacheKey);
        if (cached)
            return cached;
        try {
            const snapshot = await this.getSnapshot(market);
            const items = [...snapshot]
                .sort((a, b) => a.change_percent - b.change_percent)
                .slice(0, count)
                .map((q) => this.transformQuote(q));
            this.setCache(cacheKey, items);
            this.logger.debug(`Fetched ${items.length} losers (${market})`);
            return items;
        }
        catch (err) {
            this.logger.error(`Failed to fetch losers: ${err.message}`);
            return this.getCached(cacheKey) ?? [];
        }
    }
    async getActive(count = 25, market = 'a_share') {
        const cacheKey = `active_${market}`;
        const cached = this.getCached(cacheKey);
        if (cached)
            return cached;
        try {
            const snapshot = await this.getSnapshot(market);
            const items = [...snapshot]
                .sort((a, b) => (b.turnover || 0) - (a.turnover || 0))
                .slice(0, count)
                .map((q) => this.transformQuote(q));
            this.setCache(cacheKey, items);
            this.logger.debug(`Fetched ${items.length} most active (${market})`);
            return items;
        }
        catch (err) {
            this.logger.error(`Failed to fetch active: ${err.message}`);
            return this.getCached(cacheKey) ?? [];
        }
    }
    async getTrending(market = 'a_share') {
        const cacheKey = `trending_${market}`;
        const cached = this.getCached(cacheKey);
        if (cached)
            return cached;
        try {
            const snapshot = await this.getSnapshot(market);
            const symbols = [...snapshot]
                .sort((a, b) => (b.turnover_rate || 0) - (a.turnover_rate || 0))
                .slice(0, 25)
                .map((q) => q.symbol);
            const region = market === 'a_share' ? 'CN' : market === 'hk' ? 'HK' : 'US';
            const results = [{ region, symbols }];
            this.setCache(cacheKey, results);
            return results;
        }
        catch (err) {
            this.logger.error(`Failed to fetch trending: ${err.message}`);
            return this.getCached(cacheKey) ?? [];
        }
    }
    async getTrendingWithQuotes(market = 'a_share') {
        const cacheKey = `trending_quotes_${market}`;
        const cached = this.getCached(cacheKey);
        if (cached)
            return cached;
        const trending = await this.getTrending(market);
        const regionNames = { CN: 'A股', US: '美股', HK: '港股' };
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
            this.setCache(cacheKey, resultsWithQuotes);
            return resultsWithQuotes;
        }
        catch (err) {
            this.logger.error(`Failed to fetch trending quotes: ${err.message}`);
            return [];
        }
    }
    limitRateFor(symbol) {
        const code = symbol.replace(/^(SH|SZ)/, '');
        if (code.startsWith('688') || code.startsWith('300') || code.startsWith('301'))
            return 20;
        return 10;
    }
    isLimitUpBar(bars, i, rate) {
        if (i < 1)
            return false;
        const prevClose = bars[i - 1].close;
        if (!prevClose)
            return false;
        const limitPrice = Math.round(prevClose * (1 + rate / 100) * 100) / 100;
        return bars[i].close >= limitPrice - 0.001;
    }
    async getLimitUp() {
        const cached = this.getCached('limitup', LIMIT_UP_CACHE_TTL);
        if (cached)
            return cached;
        const empty = {
            stats: { total: 0, lianban: 0, maxLianban: 0 },
            items: [],
        };
        try {
            const list = await this.akShareService.getMarketStockList('a_share');
            const prefiltered = list.filter((q) => {
                const rate = this.limitRateFor(q.symbol);
                return q.change_percent >= rate - 0.5;
            });
            const limitPrices = await this.akShareService.getTencentLimitPrices(prefiltered.map((q) => q.symbol));
            const candidates = prefiltered.filter((q) => {
                const limitPrice = limitPrices.get(q.symbol.toUpperCase());
                if (limitPrice != null)
                    return q.current_price >= limitPrice - 0.001;
                return q.change_percent >= this.limitRateFor(q.symbol) - 0.25;
            });
            this.logger.log(`Limit-up candidates: ${candidates.length}`);
            const items = [];
            const batchSize = 20;
            for (let i = 0; i < candidates.length; i += batchSize) {
                const batch = candidates.slice(i, i + batchSize);
                const settled = await Promise.allSettled(batch.map(async (q) => {
                    const rate = this.limitRateFor(q.symbol);
                    const days = await this.countConsecutiveLimitUp(q.symbol, rate);
                    return { q, rate, days };
                }));
                for (const s of settled) {
                    if (s.status !== 'fulfilled')
                        continue;
                    const { q, rate, days } = s.value;
                    items.push({
                        ...this.transformQuote(q),
                        limitUpDays: days,
                        limitRate: rate,
                    });
                }
            }
            items.sort((a, b) => b.limitUpDays - a.limitUpDays || b.changePercent - a.changePercent);
            const result = {
                stats: {
                    total: items.length,
                    lianban: items.filter((it) => it.limitUpDays >= 2).length,
                    maxLianban: items.reduce((max, it) => Math.max(max, it.limitUpDays), 0),
                },
                items,
            };
            this.setCache('limitup', result);
            return result;
        }
        catch (err) {
            this.logger.error(`Failed to fetch limit-up: ${err.message}`);
            return this.getCached('limitup', Infinity) ?? empty;
        }
    }
    async countConsecutiveLimitUp(symbol, rate) {
        try {
            const chart = await this.akShareService.getChart(symbol, 'daily');
            const bars = (chart?.quotes ?? [])
                .filter((b) => b.close > 0)
                .sort((a, b) => (a.date < b.date ? -1 : 1));
            if (bars.length < 2)
                return 1;
            let days = 0;
            for (let i = bars.length - 1; i >= 1; i--) {
                if (this.isLimitUpBar(bars, i, rate))
                    days++;
                else
                    break;
            }
            return Math.max(days, 1);
        }
        catch {
            return 1;
        }
    }
};
exports.ScannerService = ScannerService;
exports.ScannerService = ScannerService = ScannerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [akshare_service_1.AkShareService])
], ScannerService);
//# sourceMappingURL=scanner.service.js.map
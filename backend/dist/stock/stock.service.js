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
var StockService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const common_1 = require("@nestjs/common");
const akshare_service_1 = require("../akshare/akshare.service");
const cn_names_1 = require("../common/cn-names");
let StockService = StockService_1 = class StockService {
    constructor(akShareService) {
        this.akShareService = akShareService;
        this.logger = new common_1.Logger(StockService_1.name);
    }
    normalizeSymbol(input) {
        const trimmed = input.trim();
        const s = trimmed.toLowerCase();
        if (s.endsWith('.ss')) {
            return { akshare: trimmed, display: `SH${trimmed.slice(0, -3)}`, market: 'A股' };
        }
        if (s.endsWith('.sz')) {
            return { akshare: trimmed, display: `SZ${trimmed.slice(0, -3)}`, market: 'A股' };
        }
        if (s.endsWith('.bj')) {
            return { akshare: trimmed, display: `BJ${trimmed.slice(0, -3)}`, market: 'A股' };
        }
        if (s.endsWith('.hk')) {
            return { akshare: trimmed, display: `HK${trimmed.slice(0, -3)}`, market: '港股' };
        }
        if (/^(sh|sz|bj)?\d{6}$/i.test(trimmed)) {
            const code = s.replace(/^(sh|sz|bj)/, '');
            if (code.startsWith('6')) {
                return { akshare: `SH${code}`, display: `SH${code}`, market: 'A股' };
            }
            else if (code.startsWith('0') || code.startsWith('3')) {
                return { akshare: `SZ${code}`, display: `SZ${code}`, market: 'A股' };
            }
            else if (code.startsWith('4') || code.startsWith('8')) {
                return { akshare: `BJ${code}`, display: `BJ${code}`, market: 'A股' };
            }
            else {
                return { akshare: `SH${code}`, display: `SH${code}`, market: 'A股' };
            }
        }
        if (/^(hk)?\d{4,5}$/i.test(trimmed)) {
            const code = s.replace(/^hk/, '').padStart(5, '0');
            return { akshare: `HK${code}`, display: `HK${code}`, market: '港股' };
        }
        return {
            akshare: trimmed.toUpperCase(),
            display: trimmed.toUpperCase(),
            market: '美股',
        };
    }
    transformAkShareQuote(raw, display) {
        return {
            symbol: display,
            name: (0, cn_names_1.getCnName)(display, raw.name),
            currency: raw.currency,
            current_price: raw.current_price,
            prev_close: raw.prev_close,
            open_price: raw.open_price,
            day_high: raw.day_high,
            day_low: raw.day_low,
            volume: raw.volume,
            market_cap: raw.market_cap ?? null,
            pe_ratio: raw.pe_ratio ?? null,
            week_52_high: null,
            week_52_low: null,
            avg_volume: null,
            turnover: raw.turnover ?? null,
            turnover_rate: raw.turnover_rate ?? null,
            volume_ratio: null,
            change: raw.change,
            change_percent: raw.change_percent,
            timestamp: new Date().toISOString(),
            market: raw.market,
            is_up: raw.change >= 0,
            market_state: null,
            pre_market_price: null,
            pre_market_change: null,
            pre_market_change_percent: null,
            post_market_price: null,
            post_market_change: null,
            post_market_change_percent: null,
        };
    }
    async fetchQuote(symbol) {
        const { akshare, display } = this.normalizeSymbol(symbol);
        const raw = await this.akShareService.getQuote(akshare);
        if (!raw)
            throw new Error(`No data returned for ${akshare}`);
        return this.transformAkShareQuote(raw, display);
    }
    async fetchQuotes(symbols) {
        const results = await Promise.all(symbols.map(async (sym) => {
            try {
                const data = await this.fetchQuote(sym);
                return { symbol: sym, data, error: null };
            }
            catch (err) {
                this.logger.warn(`Failed to fetch ${sym}: ${err.message}`);
                return { symbol: sym, data: null, error: err.message };
            }
        }));
        return results;
    }
    async fetchQuotesBatch(inputSymbols) {
        const result = new Map();
        if (inputSymbols.length === 0)
            return result;
        const entries = inputSymbols.map((sym) => ({
            input: sym,
            ...this.normalizeSymbol(sym),
        }));
        const akshareSymbols = entries.map((e) => e.akshare);
        const batchResults = await this.akShareService.getQuotesBatch(akshareSymbols);
        const rawMap = new Map();
        for (const res of batchResults) {
            if (res.data) {
                rawMap.set(res.symbol, res.data);
            }
        }
        for (const entry of entries) {
            const raw = rawMap.get(entry.akshare);
            if (raw) {
                result.set(entry.input, this.transformAkShareQuote(raw, entry.display));
            }
        }
        return result;
    }
};
exports.StockService = StockService;
exports.StockService = StockService = StockService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [akshare_service_1.AkShareService])
], StockService);
//# sourceMappingURL=stock.service.js.map
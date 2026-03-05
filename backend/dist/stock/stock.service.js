"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var StockService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const common_1 = require("@nestjs/common");
const yahoo_finance2_1 = require("yahoo-finance2");
const cn_names_1 = require("../common/cn-names");
const yahooFinance = new yahoo_finance2_1.default();
const A_SHARE_RE = /^(sh|sz|bj)?\d{6}$/i;
const HK_RE = /^(hk)?\d{4,5}$/i;
function isAShare(symbol) {
    return A_SHARE_RE.test(symbol.trim());
}
function isHK(symbol) {
    const s = symbol.trim().toLowerCase();
    return s.endsWith('.hk') || HK_RE.test(s);
}
function toYahooAShare(symbol) {
    const s = symbol.trim().toLowerCase();
    let prefix;
    let code;
    if (['sh', 'sz', 'bj'].includes(s.slice(0, 2))) {
        prefix = s.slice(0, 2);
        code = s.slice(2);
    }
    else {
        code = s;
        if (code.startsWith('6'))
            prefix = 'sh';
        else if (code.startsWith('0') || code.startsWith('3'))
            prefix = 'sz';
        else if (code.startsWith('4') || code.startsWith('8'))
            prefix = 'bj';
        else
            prefix = 'sh';
    }
    const suffix = prefix === 'sh' ? '.SS' : prefix === 'sz' ? '.SZ' : '.BJ';
    return {
        yahoo: `${code}${suffix}`,
        display: `${prefix.toUpperCase()}${code}`,
    };
}
function toYahooHK(symbol) {
    let s = symbol.trim().toLowerCase();
    if (s.endsWith('.hk'))
        s = s.slice(0, -3);
    else if (s.startsWith('hk'))
        s = s.slice(2);
    const code = (s.replace(/^0+/, '') || '0').padStart(4, '0');
    return { yahoo: `${code}.HK`, display: `HK${code}` };
}
let StockService = exports.StockService = StockService_1 = class StockService {
    constructor() {
        this.logger = new common_1.Logger(StockService_1.name);
    }
    normalizeSymbol(input) {
        const trimmed = input.trim();
        if (/\.(SS|SZ|BJ)$/i.test(trimmed)) {
            return { yahoo: trimmed, display: trimmed, market: 'A股' };
        }
        if (/\.HK$/i.test(trimmed)) {
            return { yahoo: trimmed, display: trimmed, market: '港股' };
        }
        if (trimmed.startsWith('^')) {
            return { yahoo: trimmed, display: trimmed, market: '美股' };
        }
        if (isAShare(trimmed)) {
            const r = toYahooAShare(trimmed);
            return { yahoo: r.yahoo, display: r.display, market: 'A股' };
        }
        if (isHK(trimmed)) {
            const r = toYahooHK(trimmed);
            return { yahoo: r.yahoo, display: r.display, market: '港股' };
        }
        return {
            yahoo: trimmed.toUpperCase(),
            display: trimmed.toUpperCase(),
            market: '美股',
        };
    }
    transformRawQuote(raw, display, market) {
        const current = raw.regularMarketPrice ?? 0;
        const prevClose = raw.regularMarketPreviousClose ?? 0;
        const change = current - prevClose;
        const changePct = prevClose ? (change / prevClose) * 100 : 0;
        const defaultCurrency = market === 'A股' ? 'CNY' : market === '港股' ? 'HKD' : 'USD';
        return {
            symbol: display,
            name: (0, cn_names_1.getCnName)(display, raw.shortName || raw.longName || display),
            currency: raw.currency || defaultCurrency,
            current_price: current,
            prev_close: prevClose,
            open_price: raw.regularMarketOpen ?? 0,
            day_high: raw.regularMarketDayHigh ?? 0,
            day_low: raw.regularMarketDayLow ?? 0,
            volume: raw.regularMarketVolume ?? 0,
            market_cap: raw.marketCap ?? null,
            pe_ratio: raw.trailingPE ?? null,
            week_52_high: raw.fiftyTwoWeekHigh ?? null,
            week_52_low: raw.fiftyTwoWeekLow ?? null,
            avg_volume: raw.averageDailyVolume10Day ?? null,
            turnover: (raw.regularMarketVolume ?? 0) && current ? (raw.regularMarketVolume ?? 0) * current : null,
            turnover_rate: raw.sharesOutstanding && (raw.regularMarketVolume ?? 0)
                ? ((raw.regularMarketVolume ?? 0) / raw.sharesOutstanding) * 100
                : null,
            volume_ratio: (raw.regularMarketVolume ?? 0) && (raw.averageDailyVolume10Day ?? 0)
                ? (raw.regularMarketVolume ?? 0) / (raw.averageDailyVolume10Day ?? 1)
                : null,
            change,
            change_percent: changePct,
            timestamp: new Date().toISOString(),
            market,
            is_up: change >= 0,
            market_state: raw.marketState ?? null,
            pre_market_price: raw.preMarketPrice ?? null,
            pre_market_change: raw.preMarketChange ?? null,
            pre_market_change_percent: raw.preMarketChangePercent ?? null,
            post_market_price: raw.postMarketPrice ?? null,
            post_market_change: raw.postMarketChange ?? null,
            post_market_change_percent: raw.postMarketChangePercent ?? null,
        };
    }
    async fetchQuote(symbol) {
        const { yahoo, display, market } = this.normalizeSymbol(symbol);
        const raw = await yahooFinance.quote(yahoo, {}, { validateResult: false });
        if (!raw)
            throw new Error(`No data returned for ${yahoo}`);
        return this.transformRawQuote(raw, display, market);
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
        const yahooToEntries = new Map();
        for (const entry of entries) {
            const list = yahooToEntries.get(entry.yahoo) || [];
            list.push(entry);
            yahooToEntries.set(entry.yahoo, list);
        }
        const uniqueYahoo = [...yahooToEntries.keys()];
        const CHUNK_SIZE = 50;
        const allRaw = [];
        for (let i = 0; i < uniqueYahoo.length; i += CHUNK_SIZE) {
            const chunk = uniqueYahoo.slice(i, i + CHUNK_SIZE);
            try {
                const res = await yahooFinance.quote(chunk, {}, { validateResult: false });
                const arr = Array.isArray(res) ? res : [res];
                allRaw.push(...arr);
            }
            catch (err) {
                this.logger.warn(`Batch quote chunk failed: ${err.message}`);
                for (const sym of chunk) {
                    try {
                        const single = await yahooFinance.quote(sym, {}, { validateResult: false });
                        if (single)
                            allRaw.push(single);
                    }
                    catch {
                    }
                }
            }
        }
        const rawMap = new Map();
        for (const raw of allRaw) {
            if (raw?.symbol)
                rawMap.set(raw.symbol, raw);
        }
        for (const entry of entries) {
            const raw = rawMap.get(entry.yahoo);
            if (raw) {
                result.set(entry.input, this.transformRawQuote(raw, entry.display, entry.market));
            }
        }
        return result;
    }
};
exports.StockService = StockService = StockService_1 = __decorate([
    (0, common_1.Injectable)()
], StockService);
//# sourceMappingURL=stock.service.js.map
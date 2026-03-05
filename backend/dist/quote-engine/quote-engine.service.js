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
var QuoteEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteEngineService = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const stock_service_1 = require("../stock/stock.service");
const watchlist_service_1 = require("../watchlist/watchlist.service");
const alert_engine_service_1 = require("../alert/alert-engine.service");
const market_hours_1 = require("./market-hours");
let QuoteEngineService = exports.QuoteEngineService = QuoteEngineService_1 = class QuoteEngineService {
    constructor(stockService, watchlistService, alertEngine) {
        this.stockService = stockService;
        this.watchlistService = watchlistService;
        this.alertEngine = alertEngine;
        this.logger = new common_1.Logger(QuoteEngineService_1.name);
        this.cache = new Map();
        this.updateSubject = new rxjs_1.Subject();
        this.alertSubject = new rxjs_1.Subject();
        this.timer = null;
        this.running = false;
    }
    async onModuleInit() {
        this.running = true;
        setTimeout(() => this.tick(), 2000);
        this.logger.log('Quote engine started');
    }
    onModuleDestroy() {
        this.running = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.updateSubject.complete();
        this.alertSubject.complete();
        this.logger.log('Quote engine stopped');
    }
    async tick() {
        if (!this.running)
            return;
        try {
            const watchlistItems = await this.watchlistService.findAll();
            const watchlistSymbols = watchlistItems.map((item) => item.symbol);
            const allSymbols = [
                ...QuoteEngineService_1.MARKET_INDICES,
                ...QuoteEngineService_1.INDUSTRY_ETFS,
                ...watchlistSymbols,
            ];
            const uniqueSymbols = [...new Set(allSymbols)];
            this.logger.debug(`Fetching ${uniqueSymbols.length} symbols`);
            const quotes = await this.stockService.fetchQuotesBatch(uniqueSymbols);
            for (const [symbol, quote] of quotes) {
                this.cache.set(symbol, quote);
            }
            const snapshot = Object.fromEntries(this.cache);
            this.updateSubject.next(snapshot);
            this.logger.debug(`Updated ${quotes.size} quotes`);
            try {
                const alerts = await this.alertEngine.checkRules(quotes);
                if (alerts.length > 0) {
                    this.alertSubject.next(alerts);
                    this.logger.log(`Triggered ${alerts.length} alert(s)`);
                }
            }
            catch (err) {
                this.logger.error(`Alert engine error: ${err.message}`);
            }
        }
        catch (err) {
            this.logger.error(`Quote engine tick error: ${err.message}`);
        }
        const interval = (0, market_hours_1.getPollingInterval)();
        this.logger.debug(`Next tick in ${interval / 1000}s (${interval < 60000 ? 'trading' : 'off-hours'})`);
        this.timer = setTimeout(() => this.tick(), interval);
    }
    getSnapshot() {
        return Object.fromEntries(this.cache);
    }
    getMarketStatus() {
        return (0, market_hours_1.getMarketSessions)();
    }
    subscribe() {
        return new rxjs_1.Observable((subscriber) => {
            const snapshot = this.getSnapshot();
            if (Object.keys(snapshot).length > 0) {
                subscriber.next({
                    data: {
                        type: 'snapshot',
                        quotes: snapshot,
                        marketStatus: this.getMarketStatus(),
                        timestamp: new Date().toISOString(),
                    },
                });
            }
            const quoteSub = this.updateSubject.subscribe((quotes) => {
                subscriber.next({
                    data: {
                        type: 'update',
                        quotes,
                        marketStatus: this.getMarketStatus(),
                        timestamp: new Date().toISOString(),
                    },
                });
            });
            const alertSub = this.alertSubject.subscribe((alerts) => {
                subscriber.next({
                    data: {
                        type: 'alert',
                        alerts,
                        timestamp: new Date().toISOString(),
                    },
                });
            });
            const heartbeat = setInterval(() => {
                subscriber.next({
                    data: {
                        type: 'heartbeat',
                        timestamp: new Date().toISOString(),
                    },
                });
            }, 30000);
            return () => {
                quoteSub.unsubscribe();
                alertSub.unsubscribe();
                clearInterval(heartbeat);
            };
        });
    }
};
QuoteEngineService.MARKET_INDICES = [
    '000001.SS', '399001.SZ', '399006.SZ', '000300.SS', '399005.SZ',
    '^HSI', '^HSCE', 'HSTECH.HK', '^HSCC', '^HSNU',
    '^GSPC', '^DJI', '^IXIC',
    '399997.SZ', '399967.SZ', '399395.SZ',
    'GC=F', 'SI=F', 'CL=F', 'HG=F', 'NG=F',
    '^TNX', '^TYX', '^FVX', '^IRX',
    'DX-Y.NYB', 'CNY=X', '^VIX', 'BTC-USD',
];
QuoteEngineService.INDUSTRY_ETFS = [
    'XLK', 'XLF', 'XLV', 'XLE', 'XLY', 'XLP', 'XLI', 'XLU', 'XLB', 'XLRE', 'XLC',
    'SMH', 'XBI', 'KRE', 'GDX', 'XOP', 'ITA', 'TAN', 'HACK', 'ITB', 'IYT', 'JETS',
    '512000.SS', '512800.SS', '512010.SS', '515030.SS', '515790.SS', '512660.SS',
    '512690.SS', '512200.SS', '512400.SS', '512980.SS', '512070.SS', '512170.SS',
    '159869.SZ', '512580.SS', '159995.SZ', '515880.SS', '516160.SS', '515230.SS',
    '159870.SZ', '515220.SS', '159766.SZ', '512600.SS', '159825.SZ', '512480.SS',
    '3033.HK', '3143.HK', '3174.HK', '3191.HK', '2845.HK', '2826.HK',
    '3193.HK', '3162.HK', '3058.HK', '3173.HK',
];
exports.QuoteEngineService = QuoteEngineService = QuoteEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [stock_service_1.StockService,
        watchlist_service_1.WatchlistService,
        alert_engine_service_1.AlertEngineService])
], QuoteEngineService);
//# sourceMappingURL=quote-engine.service.js.map
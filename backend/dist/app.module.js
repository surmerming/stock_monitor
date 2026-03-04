"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const stock_module_1 = require("./stock/stock.module");
const watchlist_module_1 = require("./watchlist/watchlist.module");
const quote_engine_module_1 = require("./quote-engine/quote-engine.module");
const alert_module_1 = require("./alert/alert.module");
const scanner_module_1 = require("./scanner/scanner.module");
const detail_module_1 = require("./detail/detail.module");
const watchlist_entity_1 = require("./watchlist/watchlist.entity");
const alert_rule_entity_1 = require("./alert/alert-rule.entity");
const alert_history_entity_1 = require("./alert/alert-history.entity");
let AppModule = exports.AppModule = class AppModule {
};
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mysql',
                host: 'localhost',
                port: 3306,
                username: 'root',
                password: '123456',
                database: 'stock_monitor',
                entities: [watchlist_entity_1.WatchlistItem, alert_rule_entity_1.AlertRule, alert_history_entity_1.AlertHistory],
                synchronize: true,
            }),
            stock_module_1.StockModule,
            watchlist_module_1.WatchlistModule,
            quote_engine_module_1.QuoteEngineModule,
            alert_module_1.AlertModule,
            scanner_module_1.ScannerModule,
            detail_module_1.DetailModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
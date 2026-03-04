"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteEngineModule = void 0;
const common_1 = require("@nestjs/common");
const quote_engine_service_1 = require("./quote-engine.service");
const quote_engine_controller_1 = require("./quote-engine.controller");
const stock_module_1 = require("../stock/stock.module");
const watchlist_module_1 = require("../watchlist/watchlist.module");
const alert_module_1 = require("../alert/alert.module");
let QuoteEngineModule = exports.QuoteEngineModule = class QuoteEngineModule {
};
exports.QuoteEngineModule = QuoteEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [stock_module_1.StockModule, watchlist_module_1.WatchlistModule, alert_module_1.AlertModule],
        providers: [quote_engine_service_1.QuoteEngineService],
        controllers: [quote_engine_controller_1.QuoteEngineController],
        exports: [quote_engine_service_1.QuoteEngineService],
    })
], QuoteEngineModule);
//# sourceMappingURL=quote-engine.module.js.map
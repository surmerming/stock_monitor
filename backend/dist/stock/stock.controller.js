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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockController = void 0;
const common_1 = require("@nestjs/common");
const stock_service_1 = require("./stock.service");
let StockController = class StockController {
    constructor(stockService) {
        this.stockService = stockService;
    }
    async getQuotes(symbol, symbols) {
        const list = (symbols || symbol || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const quotes = await this.stockService.fetchQuotes(list);
        return { quotes };
    }
};
exports.StockController = StockController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('symbol')),
    __param(1, (0, common_1.Query)('symbols')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getQuotes", null);
exports.StockController = StockController = __decorate([
    (0, common_1.Controller)('quote'),
    __metadata("design:paramtypes", [stock_service_1.StockService])
], StockController);
//# sourceMappingURL=stock.controller.js.map
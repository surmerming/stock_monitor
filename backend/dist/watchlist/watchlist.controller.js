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
exports.WatchlistController = void 0;
const common_1 = require("@nestjs/common");
const watchlist_service_1 = require("./watchlist.service");
const stock_service_1 = require("../stock/stock.service");
let WatchlistController = class WatchlistController {
    constructor(watchlistService, stockService) {
        this.watchlistService = watchlistService;
        this.stockService = stockService;
    }
    async findAll(req) {
        const items = await this.watchlistService.findAll(req.user.userId);
        return { items };
    }
    async add(req, body) {
        const symbols = body.symbols || [];
        if (symbols.length === 0)
            return { items: [] };
        const results = await this.stockService.fetchQuotes(symbols);
        const toSave = results.map((r) => ({
            symbol: r.symbol.toUpperCase(),
            name: r.data?.name || '',
            market: r.data?.market || '',
        }));
        const items = await this.watchlistService.addBatch(req.user.userId, toSave);
        return { items };
    }
    async remove(req, symbol) {
        const ok = await this.watchlistService.remove(req.user.userId, symbol);
        return { success: ok };
    }
};
exports.WatchlistController = WatchlistController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WatchlistController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WatchlistController.prototype, "add", null);
__decorate([
    (0, common_1.Delete)(':symbol'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('symbol')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WatchlistController.prototype, "remove", null);
exports.WatchlistController = WatchlistController = __decorate([
    (0, common_1.Controller)('watchlist'),
    __metadata("design:paramtypes", [watchlist_service_1.WatchlistService,
        stock_service_1.StockService])
], WatchlistController);
//# sourceMappingURL=watchlist.controller.js.map
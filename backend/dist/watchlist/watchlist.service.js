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
exports.WatchlistService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const watchlist_entity_1 = require("./watchlist.entity");
let WatchlistService = class WatchlistService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(userId) {
        const where = userId ? { userId } : {};
        return this.repo.find({ where, order: { createdAt: 'ASC' } });
    }
    findAllSymbols() {
        return this.repo.find({ order: { createdAt: 'ASC' } });
    }
    async add(userId, symbol, name, market) {
        const upper = symbol.toUpperCase();
        const existing = await this.repo.findOneBy({ userId, symbol: upper });
        if (existing) {
            if (name)
                existing.name = name;
            if (market)
                existing.market = market;
            return this.repo.save(existing);
        }
        return this.repo.save(this.repo.create({
            userId,
            symbol: upper,
            name: name || '',
            market: market || '',
        }));
    }
    async addBatch(userId, items) {
        const results = [];
        for (const item of items) {
            results.push(await this.add(userId, item.symbol, item.name, item.market));
        }
        return results;
    }
    async remove(userId, symbol) {
        const result = await this.repo.delete({ userId, symbol: symbol.toUpperCase() });
        return (result.affected ?? 0) > 0;
    }
    async updateNameAndMarket(symbol, name, market) {
        await this.repo.update({ symbol: symbol.toUpperCase() }, { name, market });
    }
};
exports.WatchlistService = WatchlistService;
exports.WatchlistService = WatchlistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(watchlist_entity_1.WatchlistItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WatchlistService);
//# sourceMappingURL=watchlist.service.js.map
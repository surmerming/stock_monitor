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
exports.AlertService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const alert_rule_entity_1 = require("./alert-rule.entity");
const alert_history_entity_1 = require("./alert-history.entity");
let AlertService = class AlertService {
    constructor(ruleRepo, historyRepo) {
        this.ruleRepo = ruleRepo;
        this.historyRepo = historyRepo;
    }
    findAllRules(userId) {
        return this.ruleRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    }
    findEnabledRules() {
        return this.ruleRepo.find({ where: { enabled: true }, order: { createdAt: 'ASC' } });
    }
    createRule(userId, data) {
        return this.ruleRepo.save(this.ruleRepo.create({ ...data, userId }));
    }
    async updateRule(userId, id, data) {
        await this.ruleRepo.update({ id, userId }, data);
        return this.ruleRepo.findOneBy({ id, userId });
    }
    async deleteRule(userId, id) {
        const result = await this.ruleRepo.delete({ id, userId });
        return (result.affected ?? 0) > 0;
    }
    async markRuleTriggered(id) {
        await this.ruleRepo.update(id, { triggered: true, lastTriggeredAt: new Date() });
    }
    async resetRule(userId, id) {
        await this.ruleRepo.update({ id, userId }, { triggered: false });
    }
    createHistory(data) {
        return this.historyRepo.save(this.historyRepo.create(data));
    }
    findHistory(userId, limit = 50) {
        return this.historyRepo.find({ where: { userId }, order: { triggeredAt: 'DESC' }, take: limit });
    }
    async getUnreadCount(userId) {
        return this.historyRepo.count({ where: { userId, read: false } });
    }
    async markAllRead(userId) {
        await this.historyRepo.update({ userId, read: false }, { read: true });
    }
};
exports.AlertService = AlertService;
exports.AlertService = AlertService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(alert_rule_entity_1.AlertRule)),
    __param(1, (0, typeorm_1.InjectRepository)(alert_history_entity_1.AlertHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AlertService);
//# sourceMappingURL=alert.service.js.map
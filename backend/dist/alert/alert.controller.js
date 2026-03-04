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
exports.AlertController = void 0;
const common_1 = require("@nestjs/common");
const alert_service_1 = require("./alert.service");
let AlertController = exports.AlertController = class AlertController {
    constructor(alertService) {
        this.alertService = alertService;
    }
    getRules() {
        return this.alertService.findAllRules();
    }
    createRule(body) {
        return this.alertService.createRule({
            symbol: body.symbol,
            type: body.type,
            threshold: body.threshold,
            cooldownMinutes: body.cooldownMinutes ?? 30,
        });
    }
    updateRule(id, body) {
        return this.alertService.updateRule(+id, body);
    }
    deleteRule(id) {
        return this.alertService.deleteRule(+id);
    }
    resetRule(id) {
        return this.alertService.resetRule(+id);
    }
    getHistory(limit) {
        return this.alertService.findHistory(limit ? +limit : 50);
    }
    getUnreadCount() {
        return this.alertService.getUnreadCount();
    }
    markAllRead() {
        return this.alertService.markAllRead();
    }
};
__decorate([
    (0, common_1.Get)('rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "getRules", null);
__decorate([
    (0, common_1.Post)('rules'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "createRule", null);
__decorate([
    (0, common_1.Put)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "deleteRule", null);
__decorate([
    (0, common_1.Put)('rules/:id/reset'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "resetRule", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('history/unread-count'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Put)('history/read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "markAllRead", null);
exports.AlertController = AlertController = __decorate([
    (0, common_1.Controller)('alerts'),
    __metadata("design:paramtypes", [alert_service_1.AlertService])
], AlertController);
//# sourceMappingURL=alert.controller.js.map
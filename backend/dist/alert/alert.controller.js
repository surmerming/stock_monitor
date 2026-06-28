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
let AlertController = class AlertController {
    constructor(alertService) {
        this.alertService = alertService;
    }
    getRules(req) {
        return this.alertService.findAllRules(req.user.userId);
    }
    createRule(req, body) {
        return this.alertService.createRule(req.user.userId, {
            symbol: body.symbol,
            type: body.type,
            threshold: body.threshold,
            cooldownMinutes: body.cooldownMinutes ?? 30,
        });
    }
    updateRule(req, id, body) {
        return this.alertService.updateRule(req.user.userId, +id, body);
    }
    deleteRule(req, id) {
        return this.alertService.deleteRule(req.user.userId, +id);
    }
    resetRule(req, id) {
        return this.alertService.resetRule(req.user.userId, +id);
    }
    getHistory(req, limit) {
        return this.alertService.findHistory(req.user.userId, limit ? +limit : 50);
    }
    getUnreadCount(req) {
        return this.alertService.getUnreadCount(req.user.userId);
    }
    markAllRead(req) {
        return this.alertService.markAllRead(req.user.userId);
    }
};
exports.AlertController = AlertController;
__decorate([
    (0, common_1.Get)('rules'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "getRules", null);
__decorate([
    (0, common_1.Post)('rules'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "createRule", null);
__decorate([
    (0, common_1.Put)('rules/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "deleteRule", null);
__decorate([
    (0, common_1.Put)('rules/:id/reset'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "resetRule", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('history/unread-count'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Put)('history/read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AlertController.prototype, "markAllRead", null);
exports.AlertController = AlertController = __decorate([
    (0, common_1.Controller)('alerts'),
    __metadata("design:paramtypes", [alert_service_1.AlertService])
], AlertController);
//# sourceMappingURL=alert.controller.js.map
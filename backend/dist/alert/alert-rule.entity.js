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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertRule = void 0;
const typeorm_1 = require("typeorm");
let AlertRule = exports.AlertRule = class AlertRule {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AlertRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], AlertRule.prototype, "symbol", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30 }),
    __metadata("design:type", String)
], AlertRule.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 20, scale: 4 }),
    __metadata("design:type", Number)
], AlertRule.prototype, "threshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], AlertRule.prototype, "enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], AlertRule.prototype, "triggered", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AlertRule.prototype, "lastTriggeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 30 }),
    __metadata("design:type", Number)
], AlertRule.prototype, "cooldownMinutes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AlertRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AlertRule.prototype, "updatedAt", void 0);
exports.AlertRule = AlertRule = __decorate([
    (0, typeorm_1.Entity)('alert_rules')
], AlertRule);
//# sourceMappingURL=alert-rule.entity.js.map
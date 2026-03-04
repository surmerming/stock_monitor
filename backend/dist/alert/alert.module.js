"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const alert_rule_entity_1 = require("./alert-rule.entity");
const alert_history_entity_1 = require("./alert-history.entity");
const alert_service_1 = require("./alert.service");
const alert_engine_service_1 = require("./alert-engine.service");
const alert_controller_1 = require("./alert.controller");
let AlertModule = exports.AlertModule = class AlertModule {
};
exports.AlertModule = AlertModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([alert_rule_entity_1.AlertRule, alert_history_entity_1.AlertHistory])],
        providers: [alert_service_1.AlertService, alert_engine_service_1.AlertEngineService],
        controllers: [alert_controller_1.AlertController],
        exports: [alert_engine_service_1.AlertEngineService],
    })
], AlertModule);
//# sourceMappingURL=alert.module.js.map
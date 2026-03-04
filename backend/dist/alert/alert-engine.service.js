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
var AlertEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertEngineService = void 0;
const common_1 = require("@nestjs/common");
const alert_service_1 = require("./alert.service");
const ALERT_TYPE_LABELS = {
    price_above: '价格突破',
    price_below: '价格跌破',
    change_pct_above: '涨幅超过',
    change_pct_below: '跌幅超过',
    volume_ratio_above: '量比超过',
    turnover_rate_above: '换手率超过',
};
let AlertEngineService = exports.AlertEngineService = AlertEngineService_1 = class AlertEngineService {
    constructor(alertService) {
        this.alertService = alertService;
        this.logger = new common_1.Logger(AlertEngineService_1.name);
    }
    async checkRules(quotes) {
        const rules = await this.alertService.findEnabledRules();
        const triggered = [];
        for (const rule of rules) {
            const quote = quotes.get(rule.symbol);
            if (!quote)
                continue;
            if (rule.lastTriggeredAt) {
                const elapsed = Date.now() - new Date(rule.lastTriggeredAt).getTime();
                if (elapsed < rule.cooldownMinutes * 60 * 1000)
                    continue;
            }
            if (!this.evaluate(rule, quote))
                continue;
            const message = this.formatMessage(rule, quote);
            this.logger.warn(`Alert triggered: ${message}`);
            const history = await this.alertService.createHistory({
                ruleId: rule.id,
                symbol: rule.symbol,
                type: rule.type,
                message,
                quoteSnapshot: quote,
            });
            await this.alertService.markRuleTriggered(rule.id);
            triggered.push(history);
        }
        return triggered;
    }
    evaluate(rule, quote) {
        const threshold = Number(rule.threshold);
        switch (rule.type) {
            case 'price_above':
                return quote.current_price >= threshold;
            case 'price_below':
                return quote.current_price <= threshold;
            case 'change_pct_above':
                return quote.change_percent >= threshold;
            case 'change_pct_below':
                return quote.change_percent <= -Math.abs(threshold);
            case 'volume_ratio_above':
                return (quote.volume_ratio ?? 0) >= threshold;
            case 'turnover_rate_above':
                return (quote.turnover_rate ?? 0) >= threshold;
            default:
                return false;
        }
    }
    formatMessage(rule, quote) {
        const label = ALERT_TYPE_LABELS[rule.type] || rule.type;
        const name = quote.name || quote.symbol;
        const threshold = Number(rule.threshold);
        switch (rule.type) {
            case 'price_above':
            case 'price_below':
                return `${name} ${label} ${threshold}, 当前 ${quote.current_price.toFixed(2)}`;
            case 'change_pct_above':
            case 'change_pct_below':
                return `${name} ${label} ${threshold}%, 当前 ${quote.change_percent >= 0 ? '+' : ''}${quote.change_percent.toFixed(2)}%`;
            case 'volume_ratio_above':
                return `${name} ${label} ${threshold}, 当前 ${(quote.volume_ratio ?? 0).toFixed(2)}`;
            case 'turnover_rate_above':
                return `${name} ${label} ${threshold}%, 当前 ${(quote.turnover_rate ?? 0).toFixed(2)}%`;
            default:
                return `${name} 触发预警 ${rule.type}`;
        }
    }
};
exports.AlertEngineService = AlertEngineService = AlertEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [alert_service_1.AlertService])
], AlertEngineService);
//# sourceMappingURL=alert-engine.service.js.map
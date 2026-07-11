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
exports.QuoteEngineController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const quote_engine_service_1 = require("./quote-engine.service");
const public_decorator_1 = require("../auth/public.decorator");
let QuoteEngineController = class QuoteEngineController {
    constructor(quoteEngineService) {
        this.quoteEngineService = quoteEngineService;
    }
    stream() {
        return this.quoteEngineService.subscribe();
    }
    getSnapshot() {
        return {
            quotes: this.quoteEngineService.getSnapshot(),
            marketStatus: this.quoteEngineService.getMarketStatus(),
            timestamp: new Date().toISOString(),
        };
    }
};
exports.QuoteEngineController = QuoteEngineController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Sse)('stream'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rxjs_1.Observable)
], QuoteEngineController.prototype, "stream", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('snapshot'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QuoteEngineController.prototype, "getSnapshot", null);
exports.QuoteEngineController = QuoteEngineController = __decorate([
    (0, common_1.Controller)('quotes'),
    __metadata("design:paramtypes", [quote_engine_service_1.QuoteEngineService])
], QuoteEngineController);
//# sourceMappingURL=quote-engine.controller.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetailModule = void 0;
const common_1 = require("@nestjs/common");
const stock_module_1 = require("../stock/stock.module");
const akshare_module_1 = require("../akshare/akshare.module");
const detail_service_1 = require("./detail.service");
const detail_controller_1 = require("./detail.controller");
let DetailModule = class DetailModule {
};
exports.DetailModule = DetailModule;
exports.DetailModule = DetailModule = __decorate([
    (0, common_1.Module)({
        imports: [stock_module_1.StockModule, akshare_module_1.AkShareModule],
        providers: [detail_service_1.DetailService],
        controllers: [detail_controller_1.DetailController],
        exports: [detail_service_1.DetailService],
    })
], DetailModule);
//# sourceMappingURL=detail.module.js.map
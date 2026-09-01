"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const stock_module_1 = require("./stock/stock.module");
const watchlist_module_1 = require("./watchlist/watchlist.module");
const quote_engine_module_1 = require("./quote-engine/quote-engine.module");
const alert_module_1 = require("./alert/alert.module");
const scanner_module_1 = require("./scanner/scanner.module");
const detail_module_1 = require("./detail/detail.module");
const screener_module_1 = require("./screener/screener.module");
const moneyflow_module_1 = require("./moneyflow/moneyflow.module");
const backtest_module_1 = require("./backtest/backtest.module");
const sector_module_1 = require("./sector/sector.module");
const pattern_module_1 = require("./pattern/pattern.module");
const sentiment_module_1 = require("./sentiment/sentiment.module");
const review_module_1 = require("./review/review.module");
const trade_module_1 = require("./trade/trade.module");
const review_note_module_1 = require("./review-note/review-note.module");
const daily_review_module_1 = require("./daily-review/daily-review.module");
const auth_module_1 = require("./auth/auth.module");
const stock_comment_module_1 = require("./stock-comment/stock-comment.module");
const news_module_1 = require("./news/news.module");
const watchlist_entity_1 = require("./watchlist/watchlist.entity");
const alert_rule_entity_1 = require("./alert/alert-rule.entity");
const alert_history_entity_1 = require("./alert/alert-history.entity");
const strategy_entity_1 = require("./screener/strategy.entity");
const trade_entity_1 = require("./trade/trade.entity");
const review_note_entity_1 = require("./review-note/review-note.entity");
const config_entity_1 = require("./daily-review/config.entity");
const review_entity_1 = require("./daily-review/review.entity");
const run_entity_1 = require("./daily-review/run.entity");
const user_entity_1 = require("./auth/user.entity");
const login_attempt_entity_1 = require("./auth/login-attempt.entity");
const comment_entity_1 = require("./stock-comment/comment.entity");
const news_entity_1 = require("./news/news.entity");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mysql',
                host: 'localhost',
                port: 3306,
                username: 'root',
                password: '123456',
                database: 'stock_monitor',
                entities: [
                    watchlist_entity_1.WatchlistItem,
                    alert_rule_entity_1.AlertRule,
                    alert_history_entity_1.AlertHistory,
                    strategy_entity_1.ScreenerStrategy,
                    trade_entity_1.Trade,
                    review_note_entity_1.ReviewNote,
                    config_entity_1.DailyReviewConfig,
                    review_entity_1.DailyReview,
                    run_entity_1.DailyReviewRun,
                    user_entity_1.User,
                    login_attempt_entity_1.LoginAttempt,
                    comment_entity_1.StockComment,
                    news_entity_1.NewsArticle,
                ],
                synchronize: true,
            }),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            stock_module_1.StockModule,
            watchlist_module_1.WatchlistModule,
            quote_engine_module_1.QuoteEngineModule,
            alert_module_1.AlertModule,
            scanner_module_1.ScannerModule,
            detail_module_1.DetailModule,
            screener_module_1.ScreenerModule,
            moneyflow_module_1.MoneyFlowModule,
            backtest_module_1.BacktestModule,
            sector_module_1.SectorModule,
            pattern_module_1.PatternModule,
            sentiment_module_1.SentimentModule,
            review_module_1.ReviewModule,
            trade_module_1.TradeModule,
            review_note_module_1.ReviewNoteModule,
            daily_review_module_1.DailyReviewModule,
            stock_comment_module_1.StockCommentModule,
            news_module_1.NewsModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockModule } from './stock/stock.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { QuoteEngineModule } from './quote-engine/quote-engine.module';
import { AlertModule } from './alert/alert.module';
import { ScannerModule } from './scanner/scanner.module';
import { DetailModule } from './detail/detail.module';
import { ScreenerModule } from './screener/screener.module';
import { MoneyFlowModule } from './moneyflow/moneyflow.module';
import { BacktestModule } from './backtest/backtest.module';
import { SectorModule } from './sector/sector.module';
import { PatternModule } from './pattern/pattern.module';
import { SentimentModule } from './sentiment/sentiment.module';
import { ReviewModule } from './review/review.module';
import { TradeModule } from './trade/trade.module';
import { ReviewNoteModule } from './review-note/review-note.module';
import { DailyReviewModule } from './daily-review/daily-review.module';
import { AuthModule } from './auth/auth.module';
import { StockCommentModule } from './stock-comment/stock-comment.module';
import { WatchlistItem } from './watchlist/watchlist.entity';
import { AlertRule } from './alert/alert-rule.entity';
import { AlertHistory } from './alert/alert-history.entity';
import { ScreenerStrategy } from './screener/strategy.entity';
import { Trade } from './trade/trade.entity';
import { ReviewNote } from './review-note/review-note.entity';
import { DailyReviewConfig } from './daily-review/config.entity';
import { DailyReview } from './daily-review/review.entity';
import { DailyReviewRun } from './daily-review/run.entity';
import { User } from './auth/user.entity';
import { LoginAttempt } from './auth/login-attempt.entity';
import { StockComment } from './stock-comment/comment.entity';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'stock_monitor',
      entities: [
        WatchlistItem,
        AlertRule,
        AlertHistory,
        ScreenerStrategy,
        Trade,
        ReviewNote,
        DailyReviewConfig,
        DailyReview,
        DailyReviewRun,
        User,
        LoginAttempt,
        StockComment,
      ],
      synchronize: true,
    }),
    AuthModule,
    StockModule,
    WatchlistModule,
    QuoteEngineModule,
    AlertModule,
    ScannerModule,
    DetailModule,
    ScreenerModule,
    MoneyFlowModule,
    BacktestModule,
    SectorModule,
    PatternModule,
    SentimentModule,
    ReviewModule,
    TradeModule,
    ReviewNoteModule,
    DailyReviewModule,
    StockCommentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

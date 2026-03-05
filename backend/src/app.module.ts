import { Module } from '@nestjs/common';
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
import { WatchlistItem } from './watchlist/watchlist.entity';
import { AlertRule } from './alert/alert-rule.entity';
import { AlertHistory } from './alert/alert-history.entity';
import { ScreenerStrategy } from './screener/strategy.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'stock_monitor',
      entities: [WatchlistItem, AlertRule, AlertHistory, ScreenerStrategy],
      synchronize: true,
    }),
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
  ],
})
export class AppModule {}

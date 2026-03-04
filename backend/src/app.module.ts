import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockModule } from './stock/stock.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { QuoteEngineModule } from './quote-engine/quote-engine.module';
import { AlertModule } from './alert/alert.module';
import { ScannerModule } from './scanner/scanner.module';
import { DetailModule } from './detail/detail.module';
import { WatchlistItem } from './watchlist/watchlist.entity';
import { AlertRule } from './alert/alert-rule.entity';
import { AlertHistory } from './alert/alert-history.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'stock_monitor',
      entities: [WatchlistItem, AlertRule, AlertHistory],
      synchronize: true,
    }),
    StockModule,
    WatchlistModule,
    QuoteEngineModule,
    AlertModule,
    ScannerModule,
    DetailModule,
  ],
})
export class AppModule {}

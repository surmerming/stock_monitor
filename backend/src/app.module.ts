import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockModule } from './stock/stock.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { WatchlistItem } from './watchlist/watchlist.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'stock_monitor',
      entities: [WatchlistItem],
      synchronize: true,
    }),
    StockModule,
    WatchlistModule,
  ],
})
export class AppModule {}

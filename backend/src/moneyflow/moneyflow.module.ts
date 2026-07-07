import { Module } from '@nestjs/common';
import { MoneyFlowService } from './moneyflow.service';
import { MoneyFlowController } from './moneyflow.controller';
import { StockModule } from '../stock/stock.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { AkShareModule } from '../akshare/akshare.module';

@Module({
  imports: [StockModule, WatchlistModule, AkShareModule],
  providers: [MoneyFlowService],
  controllers: [MoneyFlowController],
  exports: [MoneyFlowService],
})
export class MoneyFlowModule {}
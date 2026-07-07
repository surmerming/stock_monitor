import { Module } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { BacktestController } from './backtest.controller';
import { AkShareModule } from '../akshare/akshare.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [AkShareModule, StockModule],
  providers: [BacktestService],
  controllers: [BacktestController],
  exports: [BacktestService],
})
export class BacktestModule {}

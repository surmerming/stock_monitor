import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { AkShareModule } from '../akshare/akshare.module';

@Module({
  imports: [AkShareModule],
  providers: [StockService],
  controllers: [StockController],
  exports: [StockService],
})
export class StockModule {}
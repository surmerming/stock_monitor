import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { AkShareModule } from '../akshare/akshare.module';
import { DetailService } from './detail.service';
import { DetailController } from './detail.controller';

@Module({
  imports: [StockModule, AkShareModule],
  providers: [DetailService],
  controllers: [DetailController],
  exports: [DetailService],
})
export class DetailModule {}

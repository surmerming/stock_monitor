import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { DetailService } from './detail.service';
import { DetailController } from './detail.controller';

@Module({
  imports: [StockModule],
  providers: [DetailService],
  controllers: [DetailController],
  exports: [DetailService],
})
export class DetailModule {}

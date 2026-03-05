import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trade } from './trade.entity';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Trade])],
  providers: [TradeService],
  controllers: [TradeController],
  exports: [TradeService],
})
export class TradeModule {}

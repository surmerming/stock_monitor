import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreenerService } from './screener.service';
import { ScreenerController } from './screener.controller';
import { ScreenerStrategy } from './strategy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScreenerStrategy])],
  providers: [ScreenerService],
  controllers: [ScreenerController],
  exports: [ScreenerService],
})
export class ScreenerModule {}

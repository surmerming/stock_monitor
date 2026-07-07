import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreenerService } from './screener.service';
import { ScreenerController } from './screener.controller';
import { ScreenerStrategy } from './strategy.entity';
import { AkShareModule } from '../akshare/akshare.module';

@Module({
  imports: [TypeOrmModule.forFeature([ScreenerStrategy]), AkShareModule],
  providers: [ScreenerService],
  controllers: [ScreenerController],
  exports: [ScreenerService],
})
export class ScreenerModule {}
import { Module } from '@nestjs/common';
import { SentimentService } from './sentiment.service';
import { SentimentController } from './sentiment.controller';
import { AkShareModule } from '../akshare/akshare.module';

@Module({
  imports: [AkShareModule],
  providers: [SentimentService],
  controllers: [SentimentController],
  exports: [SentimentService],
})
export class SentimentModule {}
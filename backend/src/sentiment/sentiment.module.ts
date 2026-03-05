import { Module } from '@nestjs/common';
import { SentimentService } from './sentiment.service';
import { SentimentController } from './sentiment.controller';

@Module({
  providers: [SentimentService],
  controllers: [SentimentController],
  exports: [SentimentService],
})
export class SentimentModule {}

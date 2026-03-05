import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { StockModule } from '../stock/stock.module';
import { MoneyFlowModule } from '../moneyflow/moneyflow.module';
import { PatternModule } from '../pattern/pattern.module';
import { SentimentModule } from '../sentiment/sentiment.module';
import { SectorModule } from '../sector/sector.module';
import { DetailModule } from '../detail/detail.module';

@Module({
  imports: [
    WatchlistModule,
    StockModule,
    MoneyFlowModule,
    PatternModule,
    SentimentModule,
    SectorModule,
    DetailModule,
  ],
  providers: [ReviewService],
  controllers: [ReviewController],
  exports: [ReviewService],
})
export class ReviewModule {}

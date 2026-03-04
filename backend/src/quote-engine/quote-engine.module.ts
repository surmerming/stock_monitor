import { Module } from '@nestjs/common';
import { QuoteEngineService } from './quote-engine.service';
import { QuoteEngineController } from './quote-engine.controller';
import { StockModule } from '../stock/stock.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { AlertModule } from '../alert/alert.module';

@Module({
  imports: [StockModule, WatchlistModule, AlertModule],
  providers: [QuoteEngineService],
  controllers: [QuoteEngineController],
  exports: [QuoteEngineService],
})
export class QuoteEngineModule {}

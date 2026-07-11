import { Controller, Get, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { QuoteEngineService } from './quote-engine.service';
import { Public } from '../auth/public.decorator';

@Controller('quotes')
export class QuoteEngineController {
  constructor(private readonly quoteEngineService: QuoteEngineService) {}

  @Public()
  @Sse('stream')
  stream(): Observable<any> {
    return this.quoteEngineService.subscribe();
  }

  @Public()
  @Get('snapshot')
  getSnapshot() {
    return {
      quotes: this.quoteEngineService.getSnapshot(),
      marketStatus: this.quoteEngineService.getMarketStatus(),
      timestamp: new Date().toISOString(),
    };
  }
}

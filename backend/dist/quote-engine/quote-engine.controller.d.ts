import { Observable } from 'rxjs';
import { QuoteEngineService } from './quote-engine.service';
export declare class QuoteEngineController {
    private readonly quoteEngineService;
    constructor(quoteEngineService: QuoteEngineService);
    stream(): Observable<any>;
    getSnapshot(): {
        quotes: Record<string, import("../stock/stock.service").StockQuote>;
        marketStatus: import("./market-hours").MarketSession[];
        timestamp: string;
    };
}

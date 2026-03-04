import { StockService } from './stock.service';
export declare class StockController {
    private readonly stockService;
    constructor(stockService: StockService);
    getQuotes(symbols: string): Promise<{
        quotes: {
            symbol: string;
            data: import("./stock.service").StockQuote;
            error: string;
        }[];
    }>;
}

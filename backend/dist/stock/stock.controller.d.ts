import { StockService } from './stock.service';
export declare class StockController {
    private readonly stockService;
    constructor(stockService: StockService);
    getQuotes(symbol?: string, symbols?: string): Promise<{
        quotes: {
            symbol: string;
            data: import("./stock.service").StockQuote | null;
            error: string | null;
        }[];
    }>;
}

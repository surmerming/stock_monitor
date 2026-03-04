import { WatchlistService } from './watchlist.service';
import { StockService } from '../stock/stock.service';
export declare class WatchlistController {
    private readonly watchlistService;
    private readonly stockService;
    constructor(watchlistService: WatchlistService, stockService: StockService);
    findAll(): Promise<{
        items: import("./watchlist.entity").WatchlistItem[];
    }>;
    add(body: {
        symbols: string[];
    }): Promise<{
        items: import("./watchlist.entity").WatchlistItem[];
    }>;
    remove(symbol: string): Promise<{
        success: boolean;
    }>;
}

import { WatchlistService } from './watchlist.service';
import { StockService } from '../stock/stock.service';
export declare class WatchlistController {
    private readonly watchlistService;
    private readonly stockService;
    constructor(watchlistService: WatchlistService, stockService: StockService);
    findAll(req: any): Promise<{
        items: import("./watchlist.entity").WatchlistItem[];
    }>;
    add(req: any, body: {
        symbols: string[];
    }): Promise<{
        items: import("./watchlist.entity").WatchlistItem[];
    }>;
    remove(req: any, symbol: string): Promise<{
        success: boolean;
    }>;
}

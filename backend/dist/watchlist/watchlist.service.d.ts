import { Repository } from 'typeorm';
import { WatchlistItem } from './watchlist.entity';
export declare class WatchlistService {
    private readonly repo;
    constructor(repo: Repository<WatchlistItem>);
    findAll(): Promise<WatchlistItem[]>;
    add(symbol: string, name?: string, market?: string): Promise<WatchlistItem>;
    addBatch(items: {
        symbol: string;
        name?: string;
        market?: string;
    }[]): Promise<WatchlistItem[]>;
    remove(symbol: string): Promise<boolean>;
    updateNameAndMarket(symbol: string, name: string, market: string): Promise<void>;
}

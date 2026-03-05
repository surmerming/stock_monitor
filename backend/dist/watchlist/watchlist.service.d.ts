import { Repository } from 'typeorm';
import { WatchlistItem } from './watchlist.entity';
export declare class WatchlistService {
    private readonly repo;
    constructor(repo: Repository<WatchlistItem>);
    findAll(userId?: number): Promise<WatchlistItem[]>;
    findAllSymbols(): Promise<WatchlistItem[]>;
    add(userId: number, symbol: string, name?: string, market?: string): Promise<WatchlistItem>;
    addBatch(userId: number, items: {
        symbol: string;
        name?: string;
        market?: string;
    }[]): Promise<WatchlistItem[]>;
    remove(userId: number, symbol: string): Promise<boolean>;
    updateNameAndMarket(symbol: string, name: string, market: string): Promise<void>;
}

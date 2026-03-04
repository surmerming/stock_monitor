import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Observable } from 'rxjs';
import { StockService, StockQuote } from '../stock/stock.service';
import { WatchlistService } from '../watchlist/watchlist.service';
import { AlertEngineService } from '../alert/alert-engine.service';
import { MarketSession } from './market-hours';
interface SseEvent {
    data: string | object;
    id?: string;
    type?: string;
    retry?: number;
}
export declare class QuoteEngineService implements OnModuleInit, OnModuleDestroy {
    private readonly stockService;
    private readonly watchlistService;
    private readonly alertEngine;
    private readonly logger;
    private cache;
    private readonly updateSubject;
    private readonly alertSubject;
    private timer;
    private running;
    private static readonly MARKET_INDICES;
    private static readonly INDUSTRY_ETFS;
    constructor(stockService: StockService, watchlistService: WatchlistService, alertEngine: AlertEngineService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private tick;
    getSnapshot(): Record<string, StockQuote>;
    getMarketStatus(): MarketSession[];
    subscribe(): Observable<SseEvent>;
}
export {};

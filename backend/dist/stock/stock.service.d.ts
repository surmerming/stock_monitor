import { AkShareService } from '../akshare/akshare.service';
export interface StockQuote {
    symbol: string;
    name: string;
    currency: string;
    current_price: number;
    prev_close: number;
    open_price: number;
    day_high: number;
    day_low: number;
    volume: number;
    market_cap: number | null;
    pe_ratio: number | null;
    week_52_high: number | null;
    week_52_low: number | null;
    avg_volume: number | null;
    turnover: number | null;
    turnover_rate: number | null;
    volume_ratio: number | null;
    change: number;
    change_percent: number;
    timestamp: string;
    market: string;
    is_up: boolean;
    market_state: string | null;
    pre_market_price: number | null;
    pre_market_change: number | null;
    pre_market_change_percent: number | null;
    post_market_price: number | null;
    post_market_change: number | null;
    post_market_change_percent: number | null;
}
export declare class StockService {
    private readonly akShareService;
    private readonly logger;
    constructor(akShareService: AkShareService);
    normalizeSymbol(input: string): {
        akshare: string;
        display: string;
        market: string;
    };
    private transformAkShareQuote;
    fetchQuote(symbol: string): Promise<StockQuote>;
    fetchQuotes(symbols: string[]): Promise<{
        symbol: string;
        data: StockQuote | null;
        error: string | null;
    }[]>;
    fetchQuotesBatch(inputSymbols: string[]): Promise<Map<string, StockQuote>>;
}

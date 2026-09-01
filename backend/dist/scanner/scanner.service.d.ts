import { AkShareService } from '../akshare/akshare.service';
export interface ScannerItem {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number | null;
    exchange: string;
    avgVolume3m: number | null;
}
export interface LimitUpItem extends ScannerItem {
    limitUpDays: number;
    limitRate: number;
}
export interface LimitUpStats {
    total: number;
    lianban: number;
    maxLianban: number;
}
export interface LimitUpResult {
    stats: LimitUpStats;
    items: LimitUpItem[];
}
export type ScannerMarket = 'a_share' | 'hk' | 'us';
export declare class ScannerService {
    private readonly akShareService;
    private readonly logger;
    private cache;
    constructor(akShareService: AkShareService);
    private getCached;
    private setCache;
    private transformQuote;
    private getSnapshot;
    normalizeMarket(market?: string): ScannerMarket;
    getGainers(count?: number, market?: ScannerMarket): Promise<ScannerItem[]>;
    getLosers(count?: number, market?: ScannerMarket): Promise<ScannerItem[]>;
    getActive(count?: number, market?: ScannerMarket): Promise<ScannerItem[]>;
    getTrending(market?: ScannerMarket): Promise<{
        region: string;
        symbols: string[];
    }[]>;
    getTrendingWithQuotes(market?: ScannerMarket): Promise<{
        region: string;
        regionName: string;
        items: ScannerItem[];
    }[]>;
    private limitRateFor;
    private isLimitUpBar;
    getLimitUp(): Promise<LimitUpResult>;
    private countConsecutiveLimitUp;
}

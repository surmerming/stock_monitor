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
export declare class ScannerService {
    private readonly akShareService;
    private readonly logger;
    private cache;
    constructor(akShareService: AkShareService);
    private getCached;
    private setCache;
    private transformQuote;
    private getAShareSnapshot;
    getGainers(count?: number): Promise<ScannerItem[]>;
    getLosers(count?: number): Promise<ScannerItem[]>;
    getActive(count?: number): Promise<ScannerItem[]>;
    getTrending(): Promise<{
        region: string;
        symbols: string[];
    }[]>;
    getTrendingWithQuotes(): Promise<{
        region: string;
        regionName: string;
        items: ScannerItem[];
    }[]>;
    private limitRateFor;
    private isLimitUpBar;
    getLimitUp(): Promise<LimitUpResult>;
    private countConsecutiveLimitUp;
}

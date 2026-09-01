import { ScannerService } from './scanner.service';
export declare class ScannerController {
    private readonly scannerService;
    constructor(scannerService: ScannerService);
    getGainers(count?: string, market?: string): Promise<import("./scanner.service").ScannerItem[]>;
    getLosers(count?: string, market?: string): Promise<import("./scanner.service").ScannerItem[]>;
    getActive(count?: string, market?: string): Promise<import("./scanner.service").ScannerItem[]>;
    getTrending(market?: string): Promise<{
        region: string;
        regionName: string;
        items: import("./scanner.service").ScannerItem[];
    }[]>;
    getLimitUp(): Promise<import("./scanner.service").LimitUpResult>;
}

import { ScannerService } from './scanner.service';
export declare class ScannerController {
    private readonly scannerService;
    constructor(scannerService: ScannerService);
    getGainers(count?: string): Promise<import("./scanner.service").ScannerItem[]>;
    getLosers(count?: string): Promise<import("./scanner.service").ScannerItem[]>;
    getActive(count?: string): Promise<import("./scanner.service").ScannerItem[]>;
    getTrending(): Promise<{
        region: string;
        regionName: string;
        items: import("./scanner.service").ScannerItem[];
    }[]>;
}

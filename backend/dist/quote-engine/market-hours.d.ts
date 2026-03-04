export interface MarketSession {
    market: string;
    isTrading: boolean;
}
export declare function getMarketSessions(): MarketSession[];
export declare function getPollingInterval(): number;

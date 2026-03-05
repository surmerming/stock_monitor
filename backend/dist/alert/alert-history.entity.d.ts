export declare class AlertHistory {
    id: number;
    userId: number;
    ruleId: number;
    symbol: string;
    type: string;
    message: string;
    quoteSnapshot: any;
    triggeredAt: Date;
    read: boolean;
}

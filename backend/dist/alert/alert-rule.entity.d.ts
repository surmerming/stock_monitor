export declare class AlertRule {
    id: number;
    userId: number;
    symbol: string;
    type: string;
    threshold: number;
    enabled: boolean;
    triggered: boolean;
    lastTriggeredAt: Date | null;
    cooldownMinutes: number;
    createdAt: Date;
    updatedAt: Date;
}

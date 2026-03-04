import { AlertService } from './alert.service';
export declare class AlertController {
    private readonly alertService;
    constructor(alertService: AlertService);
    getRules(): Promise<import("./alert-rule.entity").AlertRule[]>;
    createRule(body: {
        symbol: string;
        type: string;
        threshold: number;
        cooldownMinutes?: number;
    }): Promise<import("./alert-rule.entity").AlertRule>;
    updateRule(id: string, body: Record<string, any>): Promise<import("./alert-rule.entity").AlertRule>;
    deleteRule(id: string): Promise<boolean>;
    resetRule(id: string): Promise<void>;
    getHistory(limit?: string): Promise<import("./alert-history.entity").AlertHistory[]>;
    getUnreadCount(): Promise<number>;
    markAllRead(): Promise<void>;
}

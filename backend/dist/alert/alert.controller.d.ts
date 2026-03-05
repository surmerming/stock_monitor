import { AlertService } from './alert.service';
export declare class AlertController {
    private readonly alertService;
    constructor(alertService: AlertService);
    getRules(req: any): Promise<import("./alert-rule.entity").AlertRule[]>;
    createRule(req: any, body: {
        symbol: string;
        type: string;
        threshold: number;
        cooldownMinutes?: number;
    }): Promise<import("./alert-rule.entity").AlertRule>;
    updateRule(req: any, id: string, body: Record<string, any>): Promise<import("./alert-rule.entity").AlertRule>;
    deleteRule(req: any, id: string): Promise<boolean>;
    resetRule(req: any, id: string): Promise<void>;
    getHistory(req: any, limit?: string): Promise<import("./alert-history.entity").AlertHistory[]>;
    getUnreadCount(req: any): Promise<number>;
    markAllRead(req: any): Promise<void>;
}

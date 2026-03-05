import { Repository } from 'typeorm';
import { AlertRule } from './alert-rule.entity';
import { AlertHistory } from './alert-history.entity';
export declare class AlertService {
    private readonly ruleRepo;
    private readonly historyRepo;
    constructor(ruleRepo: Repository<AlertRule>, historyRepo: Repository<AlertHistory>);
    findAllRules(userId: number): Promise<AlertRule[]>;
    findEnabledRules(): Promise<AlertRule[]>;
    createRule(userId: number, data: Partial<AlertRule>): Promise<AlertRule>;
    updateRule(userId: number, id: number, data: Partial<AlertRule>): Promise<AlertRule | null>;
    deleteRule(userId: number, id: number): Promise<boolean>;
    markRuleTriggered(id: number): Promise<void>;
    resetRule(userId: number, id: number): Promise<void>;
    createHistory(data: Partial<AlertHistory>): Promise<AlertHistory>;
    findHistory(userId: number, limit?: number): Promise<AlertHistory[]>;
    getUnreadCount(userId: number): Promise<number>;
    markAllRead(userId: number): Promise<void>;
}

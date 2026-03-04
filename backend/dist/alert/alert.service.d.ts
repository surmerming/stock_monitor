import { Repository } from 'typeorm';
import { AlertRule } from './alert-rule.entity';
import { AlertHistory } from './alert-history.entity';
export declare class AlertService {
    private readonly ruleRepo;
    private readonly historyRepo;
    constructor(ruleRepo: Repository<AlertRule>, historyRepo: Repository<AlertHistory>);
    findAllRules(): Promise<AlertRule[]>;
    findEnabledRules(): Promise<AlertRule[]>;
    createRule(data: Partial<AlertRule>): Promise<AlertRule>;
    updateRule(id: number, data: Partial<AlertRule>): Promise<AlertRule | null>;
    deleteRule(id: number): Promise<boolean>;
    markRuleTriggered(id: number): Promise<void>;
    resetRule(id: number): Promise<void>;
    createHistory(data: Partial<AlertHistory>): Promise<AlertHistory>;
    findHistory(limit?: number): Promise<AlertHistory[]>;
    getUnreadCount(): Promise<number>;
    markAllRead(): Promise<void>;
}

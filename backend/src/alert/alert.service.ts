import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule } from './alert-rule.entity';
import { AlertHistory } from './alert-history.entity';

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(AlertRule) private readonly ruleRepo: Repository<AlertRule>,
    @InjectRepository(AlertHistory) private readonly historyRepo: Repository<AlertHistory>,
  ) {}

  findAllRules(): Promise<AlertRule[]> {
    return this.ruleRepo.find({ order: { createdAt: 'DESC' } });
  }

  findEnabledRules(): Promise<AlertRule[]> {
    return this.ruleRepo.find({ where: { enabled: true }, order: { createdAt: 'ASC' } });
  }

  createRule(data: Partial<AlertRule>): Promise<AlertRule> {
    return this.ruleRepo.save(this.ruleRepo.create(data));
  }

  async updateRule(id: number, data: Partial<AlertRule>): Promise<AlertRule | null> {
    await this.ruleRepo.update(id, data);
    return this.ruleRepo.findOneBy({ id });
  }

  async deleteRule(id: number): Promise<boolean> {
    const result = await this.ruleRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async markRuleTriggered(id: number): Promise<void> {
    await this.ruleRepo.update(id, { triggered: true, lastTriggeredAt: new Date() });
  }

  async resetRule(id: number): Promise<void> {
    await this.ruleRepo.update(id, { triggered: false });
  }

  createHistory(data: Partial<AlertHistory>): Promise<AlertHistory> {
    return this.historyRepo.save(this.historyRepo.create(data));
  }

  findHistory(limit = 50): Promise<AlertHistory[]> {
    return this.historyRepo.find({ order: { triggeredAt: 'DESC' }, take: limit });
  }

  async getUnreadCount(): Promise<number> {
    return this.historyRepo.count({ where: { read: false } });
  }

  async markAllRead(): Promise<void> {
    await this.historyRepo.update({ read: false }, { read: true });
  }
}

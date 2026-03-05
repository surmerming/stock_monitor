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

  findAllRules(userId: number): Promise<AlertRule[]> {
    return this.ruleRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  findEnabledRules(): Promise<AlertRule[]> {
    return this.ruleRepo.find({ where: { enabled: true }, order: { createdAt: 'ASC' } });
  }

  createRule(userId: number, data: Partial<AlertRule>): Promise<AlertRule> {
    return this.ruleRepo.save(this.ruleRepo.create({ ...data, userId }));
  }

  async updateRule(userId: number, id: number, data: Partial<AlertRule>): Promise<AlertRule | null> {
    await this.ruleRepo.update({ id, userId }, data);
    return this.ruleRepo.findOneBy({ id, userId });
  }

  async deleteRule(userId: number, id: number): Promise<boolean> {
    const result = await this.ruleRepo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  async markRuleTriggered(id: number): Promise<void> {
    await this.ruleRepo.update(id, { triggered: true, lastTriggeredAt: new Date() });
  }

  async resetRule(userId: number, id: number): Promise<void> {
    await this.ruleRepo.update({ id, userId }, { triggered: false });
  }

  createHistory(data: Partial<AlertHistory>): Promise<AlertHistory> {
    return this.historyRepo.save(this.historyRepo.create(data));
  }

  findHistory(userId: number, limit = 50): Promise<AlertHistory[]> {
    return this.historyRepo.find({ where: { userId }, order: { triggeredAt: 'DESC' }, take: limit });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.historyRepo.count({ where: { userId, read: false } });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.historyRepo.update({ userId, read: false }, { read: true });
  }
}

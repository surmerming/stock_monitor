import { Injectable, Logger } from '@nestjs/common';
import { StockQuote } from '../stock/stock.service';
import { AlertService } from './alert.service';
import { AlertRule } from './alert-rule.entity';
import { AlertHistory } from './alert-history.entity';

const ALERT_TYPE_LABELS: Record<string, string> = {
  price_above: '价格突破',
  price_below: '价格跌破',
  change_pct_above: '涨幅超过',
  change_pct_below: '跌幅超过',
  volume_ratio_above: '量比超过',
  turnover_rate_above: '换手率超过',
};

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);

  constructor(private readonly alertService: AlertService) {}

  async checkRules(quotes: Map<string, StockQuote>): Promise<AlertHistory[]> {
    const rules = await this.alertService.findEnabledRules();
    const triggered: AlertHistory[] = [];

    for (const rule of rules) {
      const quote = quotes.get(rule.symbol);
      if (!quote) continue;

      if (rule.lastTriggeredAt) {
        const elapsed = Date.now() - new Date(rule.lastTriggeredAt).getTime();
        if (elapsed < rule.cooldownMinutes * 60 * 1000) continue;
      }

      if (!this.evaluate(rule, quote)) continue;

      const message = this.formatMessage(rule, quote);
      this.logger.warn(`Alert triggered: ${message}`);

      const history = await this.alertService.createHistory({
        userId: rule.userId,
        ruleId: rule.id,
        symbol: rule.symbol,
        type: rule.type,
        message,
        quoteSnapshot: quote,
      });

      await this.alertService.markRuleTriggered(rule.id);
      triggered.push(history);
    }

    return triggered;
  }

  private evaluate(rule: AlertRule, quote: StockQuote): boolean {
    const threshold = Number(rule.threshold);
    switch (rule.type) {
      case 'price_above':
        return quote.current_price >= threshold;
      case 'price_below':
        return quote.current_price <= threshold;
      case 'change_pct_above':
        return quote.change_percent >= threshold;
      case 'change_pct_below':
        return quote.change_percent <= -Math.abs(threshold);
      case 'volume_ratio_above':
        return (quote.volume_ratio ?? 0) >= threshold;
      case 'turnover_rate_above':
        return (quote.turnover_rate ?? 0) >= threshold;
      default:
        return false;
    }
  }

  private formatMessage(rule: AlertRule, quote: StockQuote): string {
    const label = ALERT_TYPE_LABELS[rule.type] || rule.type;
    const name = quote.name || quote.symbol;
    const threshold = Number(rule.threshold);

    switch (rule.type) {
      case 'price_above':
      case 'price_below':
        return `${name} ${label} ${threshold}, 当前 ${quote.current_price.toFixed(2)}`;
      case 'change_pct_above':
      case 'change_pct_below':
        return `${name} ${label} ${threshold}%, 当前 ${quote.change_percent >= 0 ? '+' : ''}${quote.change_percent.toFixed(2)}%`;
      case 'volume_ratio_above':
        return `${name} ${label} ${threshold}, 当前 ${(quote.volume_ratio ?? 0).toFixed(2)}`;
      case 'turnover_rate_above':
        return `${name} ${label} ${threshold}%, 当前 ${(quote.turnover_rate ?? 0).toFixed(2)}%`;
      default:
        return `${name} 触发预警 ${rule.type}`;
    }
  }
}

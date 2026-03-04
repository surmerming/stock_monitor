import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AlertService } from './alert.service';

@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get('rules')
  getRules() {
    return this.alertService.findAllRules();
  }

  @Post('rules')
  createRule(
    @Body() body: { symbol: string; type: string; threshold: number; cooldownMinutes?: number },
  ) {
    return this.alertService.createRule({
      symbol: body.symbol,
      type: body.type,
      threshold: body.threshold,
      cooldownMinutes: body.cooldownMinutes ?? 30,
    });
  }

  @Put('rules/:id')
  updateRule(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.alertService.updateRule(+id, body);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.alertService.deleteRule(+id);
  }

  @Put('rules/:id/reset')
  resetRule(@Param('id') id: string) {
    return this.alertService.resetRule(+id);
  }

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    return this.alertService.findHistory(limit ? +limit : 50);
  }

  @Get('history/unread-count')
  getUnreadCount() {
    return this.alertService.getUnreadCount();
  }

  @Put('history/read')
  markAllRead() {
    return this.alertService.markAllRead();
  }
}

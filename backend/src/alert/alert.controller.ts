import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { AlertService } from './alert.service';

@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get('rules')
  getRules(@Request() req: any) {
    return this.alertService.findAllRules(req.user.userId);
  }

  @Post('rules')
  createRule(
    @Request() req: any,
    @Body() body: { symbol: string; type: string; threshold: number; cooldownMinutes?: number },
  ) {
    return this.alertService.createRule(req.user.userId, {
      symbol: body.symbol,
      type: body.type,
      threshold: body.threshold,
      cooldownMinutes: body.cooldownMinutes ?? 30,
    });
  }

  @Put('rules/:id')
  updateRule(@Request() req: any, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.alertService.updateRule(req.user.userId, +id, body);
  }

  @Delete('rules/:id')
  deleteRule(@Request() req: any, @Param('id') id: string) {
    return this.alertService.deleteRule(req.user.userId, +id);
  }

  @Put('rules/:id/reset')
  resetRule(@Request() req: any, @Param('id') id: string) {
    return this.alertService.resetRule(req.user.userId, +id);
  }

  @Get('history')
  getHistory(@Request() req: any, @Query('limit') limit?: string) {
    return this.alertService.findHistory(req.user.userId, limit ? +limit : 50);
  }

  @Get('history/unread-count')
  getUnreadCount(@Request() req: any) {
    return this.alertService.getUnreadCount(req.user.userId);
  }

  @Put('history/read')
  markAllRead(@Request() req: any) {
    return this.alertService.markAllRead(req.user.userId);
  }
}

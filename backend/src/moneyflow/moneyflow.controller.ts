import { Controller, Get, Param, Query } from '@nestjs/common';
import { MoneyFlowService } from './moneyflow.service';

@Controller('moneyflow')
export class MoneyFlowController {
  constructor(private readonly moneyFlowService: MoneyFlowService) {}

  @Get('overview')
  getOverview(@Query('market') market?: string, @Query('date') date?: string) {
    return this.moneyFlowService.getOverview(market || undefined, date || undefined);
  }

  @Get(':symbol')
  getDetail(@Param('symbol') symbol: string, @Query('date') date?: string) {
    return this.moneyFlowService.getDetail(symbol, date || undefined);
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import { DetailService } from './detail.service';

@Controller('stock')
export class DetailController {
  constructor(private readonly detailService: DetailService) {}

  @Get(':symbol/chart')
  getChart(
    @Param('symbol') symbol: string,
    @Query('interval') interval?: string,
    @Query('range') range?: string,
  ) {
    const validIntervals = ['1m', '5m', '15m', '1d'] as const;
    const iv = validIntervals.includes(interval as any)
      ? (interval as (typeof validIntervals)[number])
      : '1m';
    return this.detailService.getChart(symbol, iv, range || '1d');
  }

  @Get(':symbol/detail')
  getDetail(@Param('symbol') symbol: string) {
    return this.detailService.getDetail(symbol);
  }
}

import { Controller, Post, Body } from '@nestjs/common';
import { BacktestService, BacktestQuery } from './backtest.service';

@Controller('backtest')
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Post('run')
  async run(@Body() query: BacktestQuery) {
    return this.backtestService.run(query);
  }
}

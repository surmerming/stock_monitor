import { Controller, Get, Query } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('quote')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  async getQuotes(@Query('symbol') symbol?: string, @Query('symbols') symbols?: string) {
    const list = (symbols || symbol || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const quotes = await this.stockService.fetchQuotes(list);
    return { quotes };
  }
}

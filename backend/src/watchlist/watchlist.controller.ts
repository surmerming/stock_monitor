import { Body, Controller, Delete, Get, Param, Post, Request } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { StockService } from '../stock/stock.service';

@Controller('watchlist')
export class WatchlistController {
  constructor(
    private readonly watchlistService: WatchlistService,
    private readonly stockService: StockService,
  ) {}

  @Get()
  async findAll(@Request() req: any) {
    const items = await this.watchlistService.findAll(req.user.userId);
    return { items };
  }

  @Post()
  async add(@Request() req: any, @Body() body: { symbols: string[] }) {
    const symbols: string[] = body.symbols || [];
    if (symbols.length === 0) return { items: [] };

    const results = await this.stockService.fetchQuotes(symbols);

    const toSave = results.map((r) => ({
      symbol: r.symbol.toUpperCase(),
      name: r.data?.name || '',
      market: r.data?.market || '',
    }));

    const items = await this.watchlistService.addBatch(req.user.userId, toSave);
    return { items };
  }

  @Delete(':symbol')
  async remove(@Request() req: any, @Param('symbol') symbol: string) {
    const ok = await this.watchlistService.remove(req.user.userId, symbol);
    return { success: ok };
  }
}

import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { StockService } from '../stock/stock.service';

@Controller('watchlist')
export class WatchlistController {
  constructor(
    private readonly watchlistService: WatchlistService,
    private readonly stockService: StockService,
  ) {}

  @Get()
  async findAll() {
    const items = await this.watchlistService.findAll();
    return { items };
  }

  @Post()
  async add(@Body() body: { symbols: string[] }) {
    const symbols: string[] = body.symbols || [];
    if (symbols.length === 0) return { items: [] };

    const results = await this.stockService.fetchQuotes(symbols);

    const toSave = results.map((r) => ({
      symbol: r.symbol.toUpperCase(),
      name: r.data?.name || '',
      market: r.data?.market || '',
    }));

    const items = await this.watchlistService.addBatch(toSave);
    return { items };
  }

  @Delete(':symbol')
  async remove(@Param('symbol') symbol: string) {
    const ok = await this.watchlistService.remove(symbol);
    return { success: ok };
  }
}

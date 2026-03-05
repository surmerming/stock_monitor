import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { ReviewService } from './review.service';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('watchlist-summary')
  async getWatchlistSummary(@Request() req: any) {
    const items = await this.reviewService.getWatchlistSummary(req.user.userId);
    return { items };
  }

  @Get('market-overview')
  async getMarketOverview() {
    return this.reviewService.getMarketOverview();
  }

  @Get('sector-ranking')
  async getSectorRanking(@Query('market') market?: string) {
    return this.reviewService.getSectorRanking(market || 'us');
  }

  @Get('compare')
  async getComparison(
    @Query('symbols') symbols: string,
    @Query('range') range?: string,
  ) {
    const symbolList = symbols.split(',').map((s) => s.trim()).filter(Boolean);
    if (symbolList.length < 2) return { error: 'At least 2 symbols required' };
    return this.reviewService.getComparison(symbolList, range || '3mo');
  }

  @Get('stock/:symbol')
  async getStockReview(@Param('symbol') symbol: string) {
    const detail = await this.reviewService.getStockReview(symbol);
    if (!detail) return { error: 'Not found' };
    return detail;
  }
}

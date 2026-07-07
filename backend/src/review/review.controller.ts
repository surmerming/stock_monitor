import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { ReviewService } from './review.service';
import { readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// process.cwd() 是 backend/ 目录，回退 1 级到项目根
const DAILY_REVIEW_DIR = resolve(process.cwd(), '..', 'daily_review');

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // 每日复盘文件列表
  @Get('daily-files')
  getDailyFiles() {
    if (!existsSync(DAILY_REVIEW_DIR)) return { files: [] };
    const files = readdirSync(DAILY_REVIEW_DIR)
      .filter((f) => f.startsWith('每日复盘-') && f.endsWith('.html'))
      .map((f) => {
        const match = f.match(/每日复盘-(\d{4})(\d{2})(\d{2})\.html$/);
        const date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;
        return { fileName: f, date };
      })
      .filter((f) => f.date !== null);
    return { files };
  }

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
  async getComparison(@Query('symbols') symbols: string, @Query('range') range?: string) {
    const symbolList = symbols
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
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

import { Controller, Get, Query } from '@nestjs/common';
import { ScannerService } from './scanner.service';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('gainers')
  getGainers(@Query('count') count?: string, @Query('market') market?: string) {
    return this.scannerService.getGainers(
      count ? +count : 25,
      this.scannerService.normalizeMarket(market),
    );
  }

  @Get('losers')
  getLosers(@Query('count') count?: string, @Query('market') market?: string) {
    return this.scannerService.getLosers(
      count ? +count : 25,
      this.scannerService.normalizeMarket(market),
    );
  }

  @Get('active')
  getActive(@Query('count') count?: string, @Query('market') market?: string) {
    return this.scannerService.getActive(
      count ? +count : 25,
      this.scannerService.normalizeMarket(market),
    );
  }

  @Get('trending')
  getTrending(@Query('market') market?: string) {
    return this.scannerService.getTrendingWithQuotes(this.scannerService.normalizeMarket(market));
  }

  @Get('limit-up')
  getLimitUp() {
    return this.scannerService.getLimitUp();
  }
}

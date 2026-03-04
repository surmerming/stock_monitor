import { Controller, Get, Query } from '@nestjs/common';
import { ScannerService } from './scanner.service';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('gainers')
  getGainers(@Query('count') count?: string) {
    return this.scannerService.getGainers(count ? +count : 25);
  }

  @Get('losers')
  getLosers(@Query('count') count?: string) {
    return this.scannerService.getLosers(count ? +count : 25);
  }

  @Get('active')
  getActive(@Query('count') count?: string) {
    return this.scannerService.getActive(count ? +count : 25);
  }

  @Get('trending')
  getTrending() {
    return this.scannerService.getTrendingWithQuotes();
  }
}

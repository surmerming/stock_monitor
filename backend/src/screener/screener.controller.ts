import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ScreenerService, ScanQuery } from './screener.service';

@Controller('screener')
export class ScreenerController {
  constructor(private readonly screenerService: ScreenerService) {}

  @Post('scan')
  async scan(@Body() query: ScanQuery) {
    return this.screenerService.scan(query);
  }

  @Get('strategies')
  async getStrategies(@Request() req: any) {
    return this.screenerService.getStrategies(req.user.userId);
  }

  @Post('strategies')
  async createStrategy(@Request() req: any, @Body() body: any) {
    return this.screenerService.createStrategy(req.user.userId, body);
  }

  @Put('strategies/:id')
  async updateStrategy(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.screenerService.updateStrategy(req.user.userId, +id, body);
  }

  @Delete('strategies/:id')
  async deleteStrategy(@Request() req: any, @Param('id') id: string) {
    return this.screenerService.deleteStrategy(req.user.userId, +id);
  }
}

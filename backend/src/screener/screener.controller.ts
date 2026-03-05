import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ScreenerService, ScanQuery } from './screener.service';

@Controller('screener')
export class ScreenerController {
  constructor(private readonly screenerService: ScreenerService) {}

  @Post('scan')
  async scan(@Body() query: ScanQuery) {
    return this.screenerService.scan(query);
  }

  @Get('strategies')
  async getStrategies() {
    return this.screenerService.getStrategies();
  }

  @Post('strategies')
  async createStrategy(@Body() body: any) {
    return this.screenerService.createStrategy(body);
  }

  @Put('strategies/:id')
  async updateStrategy(@Param('id') id: string, @Body() body: any) {
    return this.screenerService.updateStrategy(+id, body);
  }

  @Delete('strategies/:id')
  async deleteStrategy(@Param('id') id: string) {
    return this.screenerService.deleteStrategy(+id);
  }
}

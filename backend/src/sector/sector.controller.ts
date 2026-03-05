import { Controller, Get, Query } from '@nestjs/common';
import { SectorService } from './sector.service';

@Controller('sector')
export class SectorController {
  constructor(private readonly sectorService: SectorService) {}

  @Get('rotation')
  getRotation(@Query('market') market?: string) {
    return this.sectorService.getRotation(market || '美股');
  }

  @Get('heatmap')
  getHeatmap(@Query('market') market?: string) {
    return this.sectorService.getHeatmap(market || '美股');
  }
}

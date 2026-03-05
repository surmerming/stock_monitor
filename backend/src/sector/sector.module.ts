import { Module } from '@nestjs/common';
import { SectorService } from './sector.service';
import { SectorController } from './sector.controller';

@Module({
  providers: [SectorService],
  controllers: [SectorController],
  exports: [SectorService],
})
export class SectorModule {}

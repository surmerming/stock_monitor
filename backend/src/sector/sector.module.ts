import { Module } from '@nestjs/common';
import { SectorService } from './sector.service';
import { SectorController } from './sector.controller';
import { AkShareModule } from '../akshare/akshare.module';

@Module({
  imports: [AkShareModule],
  providers: [SectorService],
  controllers: [SectorController],
  exports: [SectorService],
})
export class SectorModule {}

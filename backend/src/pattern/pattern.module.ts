import { Module } from '@nestjs/common';
import { PatternService } from './pattern.service';
import { PatternController } from './pattern.controller';
import { AkShareModule } from '../akshare/akshare.module';

@Module({
  imports: [AkShareModule],
  providers: [PatternService],
  controllers: [PatternController],
  exports: [PatternService],
})
export class PatternModule {}
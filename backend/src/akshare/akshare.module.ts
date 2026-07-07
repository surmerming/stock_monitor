import { Module } from '@nestjs/common';
import { AkShareService } from './akshare.service';

@Module({
  providers: [AkShareService],
  exports: [AkShareService],
})
export class AkShareModule {}

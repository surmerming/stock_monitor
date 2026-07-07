import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';
import { AkShareModule } from '../akshare/akshare.module';

@Module({
  imports: [AkShareModule],
  providers: [ScannerService],
  controllers: [ScannerController],
  exports: [ScannerService],
})
export class ScannerModule {}
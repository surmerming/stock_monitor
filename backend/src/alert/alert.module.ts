import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertRule } from './alert-rule.entity';
import { AlertHistory } from './alert-history.entity';
import { AlertService } from './alert.service';
import { AlertEngineService } from './alert-engine.service';
import { AlertController } from './alert.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AlertRule, AlertHistory])],
  providers: [AlertService, AlertEngineService],
  controllers: [AlertController],
  exports: [AlertEngineService],
})
export class AlertModule {}

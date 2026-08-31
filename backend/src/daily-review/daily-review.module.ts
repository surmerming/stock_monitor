import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DailyReviewConfig } from './config.entity';
import { DailyReview } from './review.entity';
import { DailyReviewRun } from './run.entity';
import { DailyReviewService } from './daily-review.service';
import { DailyReviewController } from './daily-review.controller';
import { JWT_SECRET } from '../auth/auth.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyReviewConfig, DailyReview, DailyReviewRun]),
    // 用于触发运行时给 runner 自动签发短时效 token（无需用户手动配置环境变量）
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [DailyReviewService],
  controllers: [DailyReviewController],
  exports: [DailyReviewService],
})
export class DailyReviewModule {}

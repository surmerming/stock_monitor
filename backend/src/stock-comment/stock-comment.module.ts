import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockComment } from './comment.entity';
import { User } from '../auth/user.entity';
import { StockCommentService } from './stock-comment.service';
import { StockCommentController } from './stock-comment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockComment, User])],
  providers: [StockCommentService],
  controllers: [StockCommentController],
})
export class StockCommentModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsArticle } from './news.entity';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsArticle])],
  providers: [NewsService],
  controllers: [NewsController],
  exports: [NewsService],
})
export class NewsModule {}

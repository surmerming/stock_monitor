import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  /**
   * 获取资讯列表
   * @param category 分类：all / headline / stock / market / world
   * @param page 页码，从 1 开始
   * @param pageSize 每页条数（默认20）
   * @param live 是否实时调用新浪接口（默认true）
   */
  @Get()
  getList(
    @Query('category', new DefaultValuePipe('all')) category: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('live', new DefaultValuePipe(true), ParseBoolPipe) live: boolean,
  ) {
    return this.newsService.getList(
      category,
      Math.max(1, page),
      Math.min(50, Math.max(1, pageSize)),
      live,
    );
  }

  /** 获取单条资讯基础信息 */
  @Get(':id')
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.getDetail(id);
  }

  /**
   * 获取正文（按需爬取并缓存到 DB）
   * 返回 { content, title, alreadyCached? }
   */
  @Get(':id/content')
  getContent(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.fetchAndCacheContent(id);
  }

  /** 支持的分类列表 */
  @Get('meta/categories')
  getCategories() {
    return this.newsService.listCategories();
  }

  /** 手动触发爬取（调试用） */
  @Post('crawl')
  manualCrawl(@Query('pageSize', new DefaultValuePipe(30), ParseIntPipe) pageSize: number) {
    return this.newsService.manualCrawl(Math.min(100, pageSize));
  }

  /** 定时任务状态（调试用） */
  @Get('meta/jobs')
  getJobs() {
    return this.newsService.getJobStatus();
  }
}

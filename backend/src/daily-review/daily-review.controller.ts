import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DailyReviewService } from './daily-review.service';

const CONFIG_KEYS = new Set(['daily_review_prompt', 'holdings']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Controller('daily-review')
export class DailyReviewController {
  constructor(private readonly service: DailyReviewService) {}

  // ============== 配置 ==============

  @Get('configs')
  async listConfigs(@Request() req: any) {
    return { items: await this.service.listConfigs(req.user.userId) };
  }

  @Get('config/:key')
  async getConfig(@Request() req: any, @Param('key') key: string) {
    if (!CONFIG_KEYS.has(key)) throw new BadRequestException(`unknown config key: ${key}`);
    const row = await this.service.getConfig(req.user.userId, key);
    if (!row) throw new NotFoundException(`config not found: ${key}`);
    return row;
  }

  @Put('config/:key')
  async upsertConfig(
    @Request() req: any,
    @Param('key') key: string,
    @Body() body: { content: string },
  ) {
    if (!CONFIG_KEYS.has(key)) throw new BadRequestException(`unknown config key: ${key}`);
    if (typeof body?.content !== 'string')
      throw new BadRequestException('content must be a string');
    return this.service.upsertConfig(req.user.userId, key, body.content);
  }

  // ============== HTML 报告 ==============

  @Get('list')
  async listReviews(@Request() req: any) {
    return { items: await this.service.listReviews(req.user.userId) };
  }

  @Get('by-date/:date')
  async getByDate(@Request() req: any, @Param('date') date: string, @Res() res: Response) {
    if (!DATE_RE.test(date)) throw new BadRequestException('date must be YYYY-MM-DD');
    const row = await this.service.getReviewByDate(req.user.userId, date);
    if (!row) {
      res.status(HttpStatus.NOT_FOUND).json({ error: 'Not found' });
      return;
    }
    // 直接返回 HTML 文本，便于前端 window.open 预览渲染
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(row.content);
  }

  @Put('by-date/:date')
  async upsertByDate(
    @Request() req: any,
    @Param('date') date: string,
    @Body() body: { title?: string; content: string; meta?: any; runId?: number },
  ) {
    if (!DATE_RE.test(date)) throw new BadRequestException('date must be YYYY-MM-DD');
    if (typeof body?.content !== 'string' || body.content.length === 0) {
      throw new BadRequestException('content is required');
    }
    const row = await this.service.upsertReview(req.user.userId, date, {
      title: body.title,
      content: body.content,
      meta: body.meta,
      runId: body.runId,
    });
    return row;
  }

  /**
   * 上传 HTML 文件（multipart/form-data）覆盖某日报告。
   * - 表单字段 'file' 是 .html 文件
   * - 可选 'runId'（关联 run 标 completed）、'source'（默认 'manual'）
   * - 大小上限 10MB（multer）
   */
  @Post('by-date/:date/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadByDate(
    @Request() req: any,
    @Param('date') date: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { runId?: string; source?: string },
  ) {
    if (!DATE_RE.test(date)) throw new BadRequestException('date must be YYYY-MM-DD');
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('file is required');
    }
    const content = file.buffer.toString('utf8');
    const runId = body?.runId ? parseInt(body.runId, 10) : undefined;
    const source = body?.source || 'manual';
    const row = await this.service.upsertReview(req.user.userId, date, {
      title: `每日复盘-${date.replace(/-/g, '')}`,
      content,
      meta: { source, fileSize: content.length, originalFileName: file.originalname },
      runId,
    });
    return row;
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const ok = await this.service.deleteReview(req.user.userId, parseInt(id, 10));
    return { success: ok };
  }

  // ============== Run ==============

  @Get('runs')
  async listRuns(@Request() req: any, @Query('limit') limit?: string) {
    const n = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    return { items: await this.service.listRuns(req.user.userId, n) };
  }

  @Get('runs/:runId')
  async getRun(@Request() req: any, @Param('runId') runId: string) {
    const row = await this.service.getRun(req.user.userId, parseInt(runId, 10));
    if (!row) throw new NotFoundException(`run not found: ${runId}`);
    return row;
  }

  /**
   * runner 回调：把 run 标为 running。
   * 鉴权：复用同一 JWT（runner 拿 DAILY_REVIEW_RUNNER_TOKEN 调用）。
   */
  @Post('runs/:runId/start')
  async markRunRunning(@Request() req: any, @Param('runId') runId: string) {
    await this.service.markRunRunning(req.user.userId, parseInt(runId, 10));
    return { success: true };
  }

  /**
   * runner 回调：把 run 标为 failed 并写错误消息。
   */
  @Post('runs/:runId/fail')
  async markRunFailed(
    @Request() req: any,
    @Param('runId') runId: string,
    @Body() body: { message?: string },
  ) {
    await this.service.markRunFailed(
      req.user.userId,
      parseInt(runId, 10),
      body?.message || 'runner 失败（未提供原因）',
    );
    return { success: true };
  }

  @Post('run')
  async triggerRun(@Request() req: any, @Body() body: { date: string }) {
    if (!body?.date || !DATE_RE.test(body.date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return this.service.triggerRun(req.user.userId, body.date);
  }
}

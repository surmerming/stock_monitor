import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { StockCommentService } from './stock-comment.service';

@Controller('stock-comment')
export class StockCommentController {
  constructor(private readonly service: StockCommentService) {}

  @Get(':symbol')
  async list(@Param('symbol') symbol: string) {
    return { items: await this.service.list(symbol) };
  }

  /**
   * 发表评论（multipart/form-data）。
   * - 字段 'symbol'：股票代码
   * - 字段 'content'：文字内容（与附件至少一项）
   * - 字段 'files'：附件，可多个，单个上限 10MB
   */
  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async create(
    @Request() req: any,
    @Body() body: { symbol?: string; content?: string },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const symbol = body?.symbol?.trim();
    if (!symbol) throw new BadRequestException('symbol is required');
    const attachments = files || [];
    if ((!body?.content || !body.content.trim()) && attachments.length === 0) {
      throw new BadRequestException('评论内容不能为空');
    }
    return this.service.create(req.user.userId, symbol, body.content, attachments);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const ok = await this.service.remove(req.user.userId, parseInt(id, 10));
    return { success: ok };
  }
}

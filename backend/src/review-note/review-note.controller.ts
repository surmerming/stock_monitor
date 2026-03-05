import { Body, Controller, Delete, Get, Param, Post, Put, Request } from '@nestjs/common';
import { ReviewNoteService } from './review-note.service';

@Controller('review/notes')
export class ReviewNoteController {
  constructor(private readonly reviewNoteService: ReviewNoteService) {}

  @Get()
  async findAll(@Request() req: any) {
    const items = await this.reviewNoteService.findAll(req.user.userId);
    return { items };
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: {
      date: string;
      content: string;
      sentimentScore?: number;
      plan?: string;
      tags?: string[];
    },
  ) {
    return this.reviewNoteService.create(req.user.userId, {
      date: body.date,
      content: body.content,
      sentimentScore: body.sentimentScore ?? 3,
      plan: body.plan || '',
      tags: body.tags || [],
    });
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<{
      content: string;
      sentimentScore: number;
      plan: string;
      tags: string[];
    }>,
  ) {
    const note = await this.reviewNoteService.update(req.user.userId, parseInt(id), body);
    if (!note) return { error: 'Not found' };
    return note;
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const ok = await this.reviewNoteService.remove(req.user.userId, parseInt(id));
    return { success: ok };
  }
}

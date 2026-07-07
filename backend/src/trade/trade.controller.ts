import { Body, Controller, Delete, Get, Param, Post, Put, Request } from '@nestjs/common';
import { TradeService } from './trade.service';

@Controller('trades')
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Get()
  async findAll(@Request() req: any) {
    const items = await this.tradeService.findAll(req.user.userId);
    return { items };
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.tradeService.getStats(req.user.userId);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body()
    body: {
      symbol: string;
      direction: string;
      price: number;
      quantity: number;
      tradeTime: string;
      notes?: string;
    },
  ) {
    const trade = await this.tradeService.create(req.user.userId, {
      symbol: body.symbol.toUpperCase(),
      direction: body.direction,
      price: body.price,
      quantity: body.quantity,
      tradeTime: new Date(body.tradeTime),
      notes: body.notes || '',
    });
    return trade;
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      symbol: string;
      direction: string;
      price: number;
      quantity: number;
      tradeTime: string;
      notes: string;
    }>,
  ) {
    const data: any = { ...body };
    if (body.symbol) data.symbol = body.symbol.toUpperCase();
    if (body.tradeTime) data.tradeTime = new Date(body.tradeTime);
    const trade = await this.tradeService.update(req.user.userId, parseInt(id), data);
    if (!trade) return { error: 'Not found' };
    return trade;
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const ok = await this.tradeService.remove(req.user.userId, parseInt(id));
    return { success: ok };
  }
}

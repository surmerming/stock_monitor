import { Controller, Get, Param, Query } from '@nestjs/common';
import { PatternService } from './pattern.service';

@Controller('pattern')
export class PatternController {
  constructor(private readonly patternService: PatternService) {}

  @Get(':symbol')
  detect(@Param('symbol') symbol: string, @Query('range') range?: string) {
    return this.patternService.detect(symbol, range || '6mo');
  }
}

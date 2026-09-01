import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SectorService } from './sector.service';

@Public()
@Controller('sector')
export class SectorController {
  constructor(private readonly sectorService: SectorService) {}

  /**
   * 板块排行（A 股真实数据 / 港股美股 ETF 模拟）
   * Query:
   *   market: A股 | 港股 | 美股 (默认 A股)
   *   type: industry | concept (默认 industry)
   *   sortBy: change | turnover | marketcap (默认 change)
   *   limit: 最多返回数量 (默认 50)
   */
  @Get('ranking')
  getRanking(
    @Query('market') market?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sectorService.getSectorRanking(
      market || 'A股',
      (type as 'industry' | 'concept') || 'industry',
      (sortBy as 'change' | 'turnover' | 'marketcap') || 'change',
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * 板块轮动（兼容旧接口）— A股优先真实板块，港股/美股 ETF 模拟
   */
  @Get('rotation')
  getRotation(@Query('market') market?: string) {
    return this.sectorService.getRotation(market || '美股');
  }

  @Get('heatmap')
  getHeatmap(@Query('market') market?: string) {
    return this.sectorService.getHeatmap(market || '美股');
  }
}

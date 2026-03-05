export interface IndexDef {
  symbol: string;
  name: string;
  market: string;
}

export const DASHBOARD_INDICES: IndexDef[] = [
  { symbol: '000001.SS', name: '上证', market: 'A股' },
  { symbol: '399001.SZ', name: '深证', market: 'A股' },
  { symbol: '399006.SZ', name: '创业板', market: 'A股' },
  { symbol: '000300.SS', name: '沪深300', market: 'A股' },
  { symbol: '399005.SZ', name: '中小100', market: 'A股' },
  { symbol: '^HSI', name: '恒指', market: '港股' },
  { symbol: '^HSCE', name: '国企', market: '港股' },
  { symbol: 'HSTECH.HK', name: '恒生科技', market: '港股' },
  { symbol: '^HSCC', name: '红筹指数', market: '港股' },
  { symbol: '^HSNU', name: '公用事业', market: '港股' },
  { symbol: '^GSPC', name: '标普', market: '美股' },
  { symbol: '^DJI', name: '道琼', market: '美股' },
  { symbol: '^IXIC', name: '纳指', market: '美股' },
  { symbol: 'GC=F', name: '黄金', market: '宏观' },
  { symbol: '^VIX', name: 'VIX', market: '宏观' },
  { symbol: 'CL=F', name: '原油', market: '宏观' },
  { symbol: 'DX-Y.NYB', name: '美元', market: '宏观' },
];

export const HEATMAP_SECTORS: { symbol: string; name: string }[] = [
  { symbol: 'XLK', name: '科技' },
  { symbol: 'XLF', name: '金融' },
  { symbol: 'XLV', name: '医疗' },
  { symbol: 'XLE', name: '能源' },
  { symbol: 'XLY', name: '消费' },
  { symbol: 'XLI', name: '工业' },
  { symbol: 'XLC', name: '通信' },
  { symbol: 'SMH', name: '半导体' },
  { symbol: '512000.SS', name: '券商' },
  { symbol: '512800.SS', name: '银行' },
  { symbol: '512010.SS', name: '医药' },
  { symbol: '515030.SS', name: '新能车' },
  { symbol: '512660.SS', name: '军工' },
  { symbol: '512690.SS', name: '白酒' },
  { symbol: '3033.HK', name: '港科技' },
  { symbol: '3110.HK', name: '恒科' },
];

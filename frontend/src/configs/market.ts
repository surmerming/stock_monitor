export interface MarketIndexDef {
  symbol: string;
  name: string;
  category: string;
}

export const MARKET_CATEGORIES = [
  'A股指数',
  '港股指数',
  '美股指数',
  'A股行业指数',
  '大宗商品',
  '利率债券',
  '外汇宏观',
];

export const MARKET_INDICES: MarketIndexDef[] = [
  // ─── A股指数 ───
  { symbol: '000001.SS', name: '上证指数', category: 'A股指数' },
  { symbol: '399001.SZ', name: '深证成指', category: 'A股指数' },
  { symbol: '399006.SZ', name: '创业板指', category: 'A股指数' },
  { symbol: '000300.SS', name: '沪深300', category: 'A股指数' },
  { symbol: '399005.SZ', name: '中小100', category: 'A股指数' },

  // ─── 港股指数 ───
  { symbol: '^HSI', name: '恒生指数', category: '港股指数' },
  { symbol: '^HSCE', name: '国企指数', category: '港股指数' },
  { symbol: 'HSTECH.HK', name: '恒生科技指数', category: '港股指数' },
  { symbol: '^HSCC', name: '恒生红筹指数', category: '港股指数' },
  { symbol: '^HSNU', name: '恒生公用事业', category: '港股指数' },

  // ─── 美股指数 ───
  { symbol: '^GSPC', name: '标普500', category: '美股指数' },
  { symbol: '^DJI', name: '道琼斯', category: '美股指数' },
  { symbol: '^IXIC', name: '纳斯达克', category: '美股指数' },

  // ─── A股行业指数 ───
  { symbol: '399997.SZ', name: '中证白酒', category: 'A股行业指数' },
  { symbol: '399967.SZ', name: '中证国防军工', category: 'A股行业指数' },
  { symbol: '399395.SZ', name: '有色金属', category: 'A股行业指数' },

  // ─── 大宗商品 ───
  { symbol: 'GC=F', name: '黄金', category: '大宗商品' },
  { symbol: 'SI=F', name: '白银', category: '大宗商品' },
  { symbol: 'CL=F', name: '原油', category: '大宗商品' },
  { symbol: 'HG=F', name: '铜', category: '大宗商品' },
  { symbol: 'NG=F', name: '天然气', category: '大宗商品' },

  // ─── 利率债券 ───
  { symbol: '^TNX', name: '美10年国债', category: '利率债券' },
  { symbol: '^TYX', name: '美30年国债', category: '利率债券' },
  { symbol: '^FVX', name: '美5年国债', category: '利率债券' },
  { symbol: '^IRX', name: '美3月国债', category: '利率债券' },

  // ─── 外汇宏观 ───
  { symbol: 'CNY=X', name: '美元/人民币', category: '外汇宏观' },
  { symbol: '^VIX', name: 'VIX恐慌指数', category: '外汇宏观' },
];

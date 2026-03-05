export interface SectorDef {
  symbol: string;
  name: string;
  fullName: string;
  market: string;
}

export const INDUSTRY_MARKET_TABS = [
  { key: 'all', label: '全部' },
  { key: '美股', label: '美股' },
  { key: 'A股', label: 'A股' },
  { key: '港股', label: '港股' },
];

export const SECTORS: SectorDef[] = [
  // ─── 美股 GICS 行业 + 主题 ───
  { symbol: 'XLK', name: '科技', fullName: 'Technology Select Sector', market: '美股' },
  { symbol: 'XLF', name: '金融', fullName: 'Financial Select Sector', market: '美股' },
  { symbol: 'XLV', name: '医疗', fullName: 'Health Care Select Sector', market: '美股' },
  { symbol: 'XLE', name: '能源', fullName: 'Energy Select Sector', market: '美股' },
  { symbol: 'XLY', name: '消费', fullName: 'Consumer Discretionary', market: '美股' },
  { symbol: 'XLP', name: '必需品', fullName: 'Consumer Staples', market: '美股' },
  { symbol: 'XLI', name: '工业', fullName: 'Industrial Select Sector', market: '美股' },
  { symbol: 'XLU', name: '公用事业', fullName: 'Utilities Select Sector', market: '美股' },
  { symbol: 'XLB', name: '材料', fullName: 'Materials Select Sector', market: '美股' },
  { symbol: 'XLRE', name: '房地产', fullName: 'Real Estate Select Sector', market: '美股' },
  { symbol: 'XLC', name: '通信', fullName: 'Communication Services', market: '美股' },
  { symbol: 'SMH', name: '半导体', fullName: 'VanEck Semiconductor ETF', market: '美股' },
  { symbol: 'XBI', name: '生物科技', fullName: 'SPDR S&P Biotech ETF', market: '美股' },
  { symbol: 'KRE', name: '区域银行', fullName: 'SPDR S&P Regional Banking', market: '美股' },
  { symbol: 'GDX', name: '黄金矿业', fullName: 'VanEck Gold Miners ETF', market: '美股' },
  { symbol: 'XOP', name: '油气勘探', fullName: 'SPDR S&P Oil & Gas Exploration', market: '美股' },
  { symbol: 'ITA', name: '航空国防', fullName: 'iShares U.S. Aerospace & Defense', market: '美股' },
  { symbol: 'TAN', name: '太阳能', fullName: 'Invesco Solar ETF', market: '美股' },
  { symbol: 'HACK', name: '网络安全', fullName: 'Amplify Cybersecurity ETF', market: '美股' },
  { symbol: 'ITB', name: '住宅建筑', fullName: 'iShares U.S. Home Construction', market: '美股' },
  { symbol: 'IYT', name: '交通运输', fullName: 'iShares U.S. Transportation ETF', market: '美股' },
  { symbol: 'JETS', name: '航空', fullName: 'U.S. Global Jets ETF', market: '美股' },

  // ─── A股行业 ETF ───
  { symbol: '512000.SS', name: '券商', fullName: '券商ETF', market: 'A股' },
  { symbol: '512800.SS', name: '银行', fullName: '银行ETF', market: 'A股' },
  { symbol: '512010.SS', name: '医药', fullName: '医药ETF', market: 'A股' },
  { symbol: '515030.SS', name: '新能源车', fullName: '新能源车ETF', market: 'A股' },
  { symbol: '515790.SS', name: '光伏', fullName: '光伏ETF', market: 'A股' },
  { symbol: '512660.SS', name: '军工', fullName: '军工ETF', market: 'A股' },
  { symbol: '512690.SS', name: '白酒', fullName: '酒ETF', market: 'A股' },
  { symbol: '512200.SS', name: '地产', fullName: '房地产ETF', market: 'A股' },
  { symbol: '512400.SS', name: '有色', fullName: '有色金属ETF', market: 'A股' },
  { symbol: '512980.SS', name: '传媒', fullName: '传媒ETF', market: 'A股' },
  { symbol: '512070.SS', name: '非银金融', fullName: '非银金融ETF', market: 'A股' },
  { symbol: '512170.SS', name: '医疗', fullName: '医疗ETF', market: 'A股' },
  { symbol: '159869.SZ', name: '游戏', fullName: '游戏ETF', market: 'A股' },
  { symbol: '512580.SS', name: '环保', fullName: '环保ETF', market: 'A股' },
  { symbol: '159995.SZ', name: '芯片', fullName: '国证芯片ETF', market: 'A股' },
  { symbol: '515880.SS', name: '通信', fullName: '通信设备ETF', market: 'A股' },
  { symbol: '516160.SS', name: '新能源', fullName: '新能源ETF', market: 'A股' },
  { symbol: '515230.SS', name: '软件', fullName: 'CSI软件ETF', market: 'A股' },
  { symbol: '159870.SZ', name: '化工', fullName: '细分化工ETF', market: 'A股' },
  { symbol: '515220.SS', name: '煤炭', fullName: '煤炭ETF', market: 'A股' },
  { symbol: '159766.SZ', name: '旅游', fullName: '旅游主题ETF', market: 'A股' },
  { symbol: '512600.SS', name: '消费', fullName: '主要消费ETF', market: 'A股' },
  { symbol: '159825.SZ', name: '农业', fullName: '农业ETF', market: 'A股' },
  { symbol: '512480.SS', name: '半导体', fullName: '半导体50ETF', market: 'A股' },

  // ─── 港股行业 ETF ───
  { symbol: '3033.HK', name: '科技', fullName: 'CSOP恒生科技ETF', market: '港股' },
  { symbol: '3143.HK', name: '银行', fullName: '华夏恒生银行ETF', market: '港股' },
  { symbol: '3174.HK', name: '生物科技', fullName: 'CSOP恒生生物科技ETF', market: '港股' },
  { symbol: '3191.HK', name: '半导体', fullName: 'Global X中国半导体ETF', market: '港股' },
  { symbol: '2845.HK', name: '电动车', fullName: 'Global X中国电动车ETF', market: '港股' },
  { symbol: '2826.HK', name: '云计算', fullName: 'Global X中国云计算ETF', market: '港股' },
  { symbol: '3193.HK', name: '5G通信', fullName: 'CSOP CSI 5G通信ETF', market: '港股' },
  { symbol: '3162.HK', name: '智能驾驶', fullName: 'CSOP智能驾驶ETF', market: '港股' },
  { symbol: '3058.HK', name: '创新科技', fullName: 'Global X中国创新ETF', market: '港股' },
  { symbol: '3173.HK', name: '新经济', fullName: 'Premia中国新经济ETF', market: '港股' },
];

export const INDUSTRY_VIEW_KEY = 'industry-view-mode';

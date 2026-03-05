export interface ScreenerFilter {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: number;
  value2?: number;
}

export interface Strategy {
  id?: number;
  name: string;
  market: string;
  filters: ScreenerFilter[];
  sortField: string;
  sortType: string;
}

export interface IndicatorDef {
  key: string;
  label: string;
  unit: string;
}

export interface CategoryDef {
  key: string;
  label: string;
  indicators: IndicatorDef[];
}

export const INDICATOR_CATEGORIES: CategoryDef[] = [
  {
    key: 'market',
    label: '行情指标',
    indicators: [
      { key: 'price', label: '最新价', unit: '' },
      { key: 'changePercent', label: '涨跌幅', unit: '%' },
      { key: 'amplitude', label: '振幅', unit: '%' },
      { key: 'turnoverRate', label: '换手率', unit: '%' },
      { key: 'volumeRatio', label: '量比', unit: '' },
      { key: 'volume', label: '成交量', unit: '' },
      { key: 'turnover', label: '成交额', unit: '' },
    ],
  },
  {
    key: 'valuation',
    label: '估值指标',
    indicators: [
      { key: 'peTTM', label: '市盈率(TTM)', unit: '倍' },
      { key: 'pbRatio', label: '市净率', unit: '倍' },
      { key: 'psRatio', label: '市销率', unit: '倍' },
      { key: 'marketCap', label: '总市值', unit: '' },
      { key: 'peg', label: 'PEG', unit: '' },
    ],
  },
  {
    key: 'dividend',
    label: '分红指标',
    indicators: [
      { key: 'dividendYield', label: '股息率(TTM)', unit: '%' },
      { key: 'trailingDividendYield', label: '近12月股息率', unit: '%' },
    ],
  },
  {
    key: 'financial',
    label: '财务指标',
    indicators: [
      { key: 'epsTTM', label: '每股收益(TTM)', unit: '' },
      { key: 'revenueTTM', label: '营收(TTM)', unit: '' },
    ],
  },
  {
    key: 'technical',
    label: '技术指标',
    indicators: [
      { key: 'fiftyTwoWeekHighPct', label: '距52周高点', unit: '%' },
      { key: 'fiftyTwoWeekLowPct', label: '距52周低点', unit: '%' },
      { key: 'avgVolume3m', label: '3月日均量', unit: '' },
      { key: 'beta', label: 'Beta', unit: '' },
    ],
  },
  {
    key: 'ta_ma',
    label: 'MA 均线',
    indicators: [
      { key: 'ma5Bias', label: '价格偏离MA5', unit: '%' },
      { key: 'ma10Bias', label: '价格偏离MA10', unit: '%' },
      { key: 'ma20Bias', label: '价格偏离MA20', unit: '%' },
      { key: 'ma60Bias', label: '价格偏离MA60', unit: '%' },
      { key: 'ma120Bias', label: '价格偏离MA120', unit: '%' },
      { key: 'ma250Bias', label: '价格偏离MA250', unit: '%' },
    ],
  },
  {
    key: 'ta_ema',
    label: 'EMA 指数均线',
    indicators: [
      { key: 'ema12Bias', label: '价格偏离EMA12', unit: '%' },
      { key: 'ema26Bias', label: '价格偏离EMA26', unit: '%' },
    ],
  },
  {
    key: 'ta_boll',
    label: 'BOLL 布林带',
    indicators: [
      { key: 'bollPosition', label: '布林位置(0下轨~100上轨)', unit: '%' },
      { key: 'bollWidth', label: '布林带宽', unit: '%' },
    ],
  },
  {
    key: 'ta_sar',
    label: 'SAR 抛物线',
    indicators: [{ key: 'sarBull', label: 'SAR方向(1=多头/0=空头)', unit: '' }],
  },
  {
    key: 'ta_mavol',
    label: 'MAVOL 均量线',
    indicators: [
      { key: 'volMa5Ratio', label: '量比(vs 5日均量)', unit: '倍' },
      { key: 'volMa10Ratio', label: '量比(vs 10日均量)', unit: '倍' },
    ],
  },
  {
    key: 'ta_kdj',
    label: 'KDJ 随机指标',
    indicators: [
      { key: 'kdjK', label: 'K值', unit: '' },
      { key: 'kdjD', label: 'D值', unit: '' },
      { key: 'kdjJ', label: 'J值', unit: '' },
      { key: 'kdjGoldenCross', label: 'KDJ金叉(1=是)', unit: '' },
      { key: 'kdjDeathCross', label: 'KDJ死叉(1=是)', unit: '' },
    ],
  },
  {
    key: 'ta_macd',
    label: 'MACD 指标',
    indicators: [
      { key: 'macdDif', label: 'DIF', unit: '' },
      { key: 'macdDea', label: 'DEA', unit: '' },
      { key: 'macdHist', label: 'MACD柱', unit: '' },
      { key: 'macdGoldenCross', label: 'MACD金叉(1=是)', unit: '' },
      { key: 'macdDeathCross', label: 'MACD死叉(1=是)', unit: '' },
    ],
  },
  {
    key: 'ta_arbr',
    label: 'ARBR 情绪指标',
    indicators: [
      { key: 'ar', label: 'AR值', unit: '' },
      { key: 'br', label: 'BR值', unit: '' },
    ],
  },
  {
    key: 'ta_cr',
    label: 'CR 能量指标',
    indicators: [{ key: 'cr', label: 'CR值', unit: '' }],
  },
];

export const ALL_INDICATORS = INDICATOR_CATEGORIES.flatMap((c) => c.indicators);

export const OPERATORS: { key: ScreenerFilter['operator']; label: string }[] = [
  { key: 'gt', label: '大于' },
  { key: 'gte', label: '≥' },
  { key: 'lt', label: '小于' },
  { key: 'lte', label: '≤' },
  { key: 'between', label: '介于' },
];

export const SCREENER_MARKETS = ['全部', '美股', '港股'];

export const SCREENER_SORT_OPTIONS = [
  { key: 'marketCap', label: '市值' },
  { key: 'changePercent', label: '涨跌幅' },
  { key: 'volume', label: '成交量' },
  { key: 'peTTM', label: '市盈率' },
  { key: 'dividendYield', label: '股息率' },
  { key: 'price', label: '价格' },
  { key: 'pbRatio', label: '市净率' },
  { key: 'ma20Bias', label: 'MA20偏离' },
  { key: 'kdjK', label: 'KDJ-K值' },
  { key: 'macdHist', label: 'MACD柱' },
  { key: 'bollPosition', label: '布林位置' },
  { key: 'ar', label: 'AR值' },
  { key: 'cr', label: 'CR值' },
];

export const PRESET_STRATEGIES: Strategy[] = [
  {
    name: '高股息蓝筹',
    market: '全部',
    filters: [
      { field: 'dividendYield', operator: 'gte', value: 3 },
      { field: 'marketCap', operator: 'gte', value: 10_000_000_000 },
    ],
    sortField: 'dividendYield',
    sortType: 'DESC',
  },
  {
    name: '低估值价值股',
    market: '全部',
    filters: [
      { field: 'peTTM', operator: 'between', value: 0, value2: 15 },
      { field: 'pbRatio', operator: 'lt', value: 2 },
      { field: 'marketCap', operator: 'gte', value: 1_000_000_000 },
    ],
    sortField: 'peTTM',
    sortType: 'ASC',
  },
  {
    name: '强势放量突破',
    market: '全部',
    filters: [
      { field: 'changePercent', operator: 'gte', value: 3 },
      { field: 'volume', operator: 'gte', value: 1_000_000 },
    ],
    sortField: 'changePercent',
    sortType: 'DESC',
  },
  {
    name: '大盘蓝筹股',
    market: '全部',
    filters: [{ field: 'marketCap', operator: 'gte', value: 100_000_000_000 }],
    sortField: 'marketCap',
    sortType: 'DESC',
  },
  {
    name: '超跌反弹机会',
    market: '全部',
    filters: [
      { field: 'fiftyTwoWeekHighPct', operator: 'lte', value: -30 },
      { field: 'changePercent', operator: 'gte', value: 1 },
    ],
    sortField: 'changePercent',
    sortType: 'DESC',
  },
  {
    name: '低PB高股息',
    market: '全部',
    filters: [
      { field: 'pbRatio', operator: 'between', value: 0, value2: 1.5 },
      { field: 'dividendYield', operator: 'gte', value: 2 },
    ],
    sortField: 'dividendYield',
    sortType: 'DESC',
  },
  {
    name: 'MACD金叉放量',
    market: '全部',
    filters: [
      { field: 'macdGoldenCross', operator: 'gte', value: 1 },
      { field: 'volMa5Ratio', operator: 'gte', value: 1.5 },
    ],
    sortField: 'changePercent',
    sortType: 'DESC',
  },
  {
    name: 'KDJ超卖区',
    market: '全部',
    filters: [
      { field: 'kdjJ', operator: 'lte', value: 0 },
      { field: 'kdjK', operator: 'lte', value: 20 },
    ],
    sortField: 'kdjJ',
    sortType: 'ASC',
  },
  {
    name: '布林带下轨反弹',
    market: '全部',
    filters: [
      { field: 'bollPosition', operator: 'lte', value: 10 },
      { field: 'changePercent', operator: 'gte', value: 0 },
    ],
    sortField: 'changePercent',
    sortType: 'DESC',
  },
  {
    name: '均线多头排列',
    market: '全部',
    filters: [
      { field: 'ma5Bias', operator: 'gte', value: 0 },
      { field: 'ma10Bias', operator: 'gte', value: 0 },
      { field: 'ma20Bias', operator: 'gte', value: 0 },
      { field: 'ma60Bias', operator: 'gte', value: 0 },
    ],
    sortField: 'ma5Bias',
    sortType: 'DESC',
  },
];

export const PAGE_SIZE = 50;

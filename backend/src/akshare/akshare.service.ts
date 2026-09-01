import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as iconv from 'iconv-lite';

export interface QuoteResult {
  symbol: string;
  name: string;
  current_price: number;
  prev_close: number;
  open_price: number;
  day_high: number;
  day_low: number;
  volume: number;
  turnover: number;
  turnover_rate?: number;
  volume_ratio?: number;
  market_cap?: number;
  pe_ratio?: number;
  pe_ratio_dynamic?: number;
  pe_ratio_static?: number;
  pb_ratio?: number;
  dividend_yield?: number;
  week_52_high?: number;
  week_52_low?: number;
  sixty_day_avg?: number;
  two_hundred_fifty_day_avg?: number;

  // ===== 财务指标（新浪 CompanyFinanceService，百分比值已 /100）=====
  // 盈利能力
  roe?: number; // 净资产收益率(ROE)
  roe_avg?: number; // ROE_平均
  roe_diluted?: number; // 摊薄ROE
  roe_net?: number; // ROE_扣非
  roa?: number; // 总资产报酬率
  roic?: number; // 投入资本回报率
  gross_margin?: number; // 毛利率
  net_margin?: number; // 销售净利率
  operating_margin?: number; // 营业利润率
  ebit_margin?: number; // 息税前利润率

  // 成长能力
  revenue_growth?: number; // 营业总收入增长率
  earnings_growth?: number; // 归母净利润增长率

  // 财务风险
  current_ratio?: number; // 流动比率
  quick_ratio?: number; // 速动比率
  debt_ratio?: number; // 资产负债率
  equity_multiplier?: number; // 权益乘数
  cash_ratio?: number; // 现金比率

  // 营运能力
  ar_turn?: number; // 应收账款周转率
  ar_days?: number; // 应收账款周转天数
  inv_turn?: number; // 存货周转率
  inv_days?: number; // 存货周转天数
  ta_turn?: number; // 总资产周转率

  // 收益质量
  ocf_to_profit?: number; // 经营现金/净利润
  cost_expense_ratio?: number; // 成本费用率

  // 每股指标
  basic_eps?: number; // 基本每股收益
  diluted_eps?: number; // 稀释每股收益
  bps?: number; // 每股净资产
  ocfps?: number; // 每股经营现金流
  fcps?: number; // 每股自由现金流
  udpps?: number; // 每股未分配利润
  cappps?: number; // 每股资本公积
  surppps?: number; // 每股盈余公积

  // 绝对值（元）
  revenue?: number; // 营业总收入
  cost?: number; // 营业成本
  net_profit?: number; // 净利润
  net_profit_parent?: number; // 归母净利润
  net_profit_deducted?: number; // 扣非净利润
  equity?: number; // 股东权益(净资产)
  total_assets?: number; // 总资产
  total_liabilities?: number; // 总负债
  ocf?: number; // 经营现金流净额
  dividend_rate?: number; // 分红率（小数，0.1848 = 18.48%）

  change: number;
  change_percent: number;
  market: string;
  currency: string;
}

export interface ChartQuote {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number | null; // 成交额（元），仅部分数据源提供（分时）
}

export interface ChartResult {
  symbol: string;
  quotes: ChartQuote[];
}

export interface MoneyflowResult {
  symbol: string;
  date: string;
  net_flow: number;
  large_inflow: number;
  large_outflow: number;
  medium_inflow: number;
  medium_outflow: number;
  small_inflow: number;
  small_outflow: number;
}

export interface MoneyflowTimeline {
  time: string;
  inflow: number;
  outflow: number;
  net_flow: number;
}

export interface MoneyflowTimelineResult {
  symbol: string;
  timeline: MoneyflowTimeline[];
}

export interface SectorResult {
  market: string;
  sectors: {
    name: string;
    change: number;
    volume: number;
    turnover: number;
    leading_stock: string;
  }[];
}

export interface GainersResult {
  market: string;
  gainers: number;
  losers: number;
  indices: { [name: string]: QuoteResult };
}

export interface MarketIndex {
  price: number;
  change: number;
  change_percent: number;
}

export interface MarketOverviewResult {
  [indexName: string]: MarketIndex;
}

export interface FinancialData {
  report_date: string;
  total_revenue: number;
  net_income: number;
  eps: number;
}

export interface FinancialResult {
  symbol: string;
  type: string;
  data: FinancialData[];
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface NormalizedSymbol {
  market: 'a_share' | 'hk' | 'us' | 'futures' | 'forex' | 'index' | 'crypto';
  code: string;
  prefix: string;
}

@Injectable()
export class AkShareService {
  private readonly logger = new Logger(AkShareService.name);
  private readonly CACHE_TTL = 60;
  private readonly MARKET_DATA_TTL = 30;
  private readonly CACHE: Map<string, CacheEntry> = new Map();
  private readonly MARKET_DATA_CACHE: Map<string, CacheEntry> = new Map();

  private safeFloat(val: any, defaultVal = 0.0): number {
    const parsed = parseFloat(val);
    return Number.isFinite(parsed) ? parsed : defaultVal;
  }

  private safeInt(val: any, defaultVal = 0): number {
    const parsed = parseFloat(val);
    return Number.isFinite(parsed) ? Math.round(parsed) : defaultVal;
  }

  private normalizeSymbol(symbol: string): NormalizedSymbol {
    const s = symbol.trim().toUpperCase();
    if (s.startsWith('SH')) {
      return { market: 'a_share', code: s.slice(2), prefix: 'sh' };
    }
    if (s.startsWith('SZ')) {
      return { market: 'a_share', code: s.slice(2), prefix: 'sz' };
    }
    if (s.startsWith('BJ')) {
      return { market: 'a_share', code: s.slice(2), prefix: 'bj' };
    }
    if (s.startsWith('HK')) {
      let code = s.slice(2);
      if (/^\d+$/.test(code) && code.length < 5) {
        code = code.padStart(5, '0');
      }
      return { market: 'hk', code, prefix: 'hk' };
    }
    if (s.startsWith('US')) {
      return { market: 'us', code: s.slice(2), prefix: 'us' };
    }
    if (s.startsWith('HF_')) {
      return { market: 'futures', code: s.slice(3), prefix: 'hf' };
    }
    if (s.startsWith('FX_')) {
      return { market: 'forex', code: s.slice(3), prefix: 'fx' };
    }
    if (s.startsWith('INDEX_')) {
      return { market: 'index', code: s.slice(6), prefix: 'idx' };
    }
    if (s.startsWith('CRYPTO_')) {
      return { market: 'crypto', code: s.slice(8), prefix: 'crypto' };
    }
    if (s.endsWith('.SS')) {
      return { market: 'a_share', code: s.slice(0, -3), prefix: 'sh' };
    }
    if (s.endsWith('.SZ')) {
      return { market: 'a_share', code: s.slice(0, -3), prefix: 'sz' };
    }
    if (s.endsWith('.BJ')) {
      return { market: 'a_share', code: s.slice(0, -3), prefix: 'bj' };
    }
    if (s.endsWith('.HK')) {
      let code = s.slice(0, -3);
      if (/^\d+$/.test(code) && code.length < 5) {
        code = code.padStart(5, '0');
      }
      return { market: 'hk', code, prefix: 'hk' };
    }
    if (/^\d{6}$/.test(s)) {
      const prefix = s.startsWith('6')
        ? 'sh'
        : s.startsWith('4') || s.startsWith('8')
          ? 'bj'
          : 'sz';
      return { market: 'a_share', code: s, prefix };
    }
    if (s.length === 5 && /^\d+$/.test(s)) {
      return { market: 'hk', code: s, prefix: 'hk' };
    }
    if (s.length === 4 && /^\d+$/.test(s)) {
      return { market: 'hk', code: s.padStart(5, '0'), prefix: 'hk' };
    }
    return { market: 'us', code: s, prefix: 'us' };
  }

  private parseGtimgData(
    line: string,
    market: NormalizedSymbol['market'] = 'a_share',
  ): QuoteResult | null {
    if (!line || !line.includes('=')) {
      return null;
    }
    try {
      const parts = line.split('=')[1].trim().replace(/^"|"$/g, '');
      const data = parts.split('~');
      if (data.length < 50) {
        return null;
      }

      // 腾讯接口的 35 是冗余的"价格/成交量/成交额"复合字段；37 才是
      // 标准成交额字段。A 股 field37 单位为万元，需乘 10000；港股/美股 field37
      // 本身已是元（HKD/USD），不再额外换算。
      const rawTurnover = this.safeFloat(data[37]);
      const turnover = market === 'a_share' ? rawTurnover * 10_000 : rawTurnover;

      const result: QuoteResult = {
        symbol: data[2],
        name: data[1],
        current_price: this.safeFloat(data[3]),
        prev_close: this.safeFloat(data[4]),
        open_price: this.safeFloat(data[5]),
        volume: this.safeInt(data[6]),
        day_high: this.safeFloat(data[33]),
        day_low: this.safeFloat(data[34]),
        turnover,
        change: this.safeFloat(data[31]),
        change_percent: this.safeFloat(data[32]),
        market: '',
        currency: '',
      };

      // ════════════════════════════════════════════════════════
      // 字段号因市场而异！A 股和港股 field 映射**完全不同**。
      // 下文注释里标注 [A] = 仅 A 股正确, [HK] = 仅港股正确, [A/HK] = 通用
      // ════════════════════════════════════════════════════════

      if (market === 'hk') {
        // ─── 港股专属字段号 ───
        result.turnover_rate = this.safeFloat(data[38]) || undefined;
        result.pe_ratio = this.safeFloat(data[39]) || undefined;
        result.pe_ratio_dynamic = this.safeFloat(data[52]) || undefined;
        result.pe_ratio_static = this.safeFloat(data[53]) || undefined;
        // field44 市值：港股单位是"亿港元"，乘 1e8 → 元
        const mcap = this.safeFloat(data[44]);
        if (mcap && mcap > 0) result.market_cap = mcap * 100_000_000;
        // field43 PB — 港股值可能不准（东财 MAININDICATOR 会覆盖）
        result.pb_ratio = this.safeFloat(data[43]) || undefined;
        // field47 股息率 % — 港股真实字段！如 1.20 = 1.2%
        const divRate = this.safeFloat(data[47]);
        if (divRate != null && divRate >= 0) {
          result.dividend_yield = divRate / 100;
        }
        // field48 = 52周最高价（真实价格！腾讯 677.7 港元）
        const w52h = this.safeFloat(data[48]);
        if (w52h && w52h > 0 && w52h > result.current_price * 0.8) {
          result.week_52_high = w52h;
        }
        // field49 不是 52 周低，跳过。field67/68 是距高点/低点 % 而非价格，跳过。
        // field51 港股值乱跳（如 47.99，腾讯 450 价位明显错位），跳过。
        // field73 看起来像均价
        const avg = this.safeFloat(data[73]);
        if (avg && avg > 0 && avg > result.current_price * 0.5 && avg < result.current_price * 2) {
          result.two_hundred_fifty_day_avg = avg;
        }
        // 注：总股本由东财 MAININDICATOR 的 HK_COMMON_SHARES 提供，不在此处赋值
      } else {
        // ─── A 股 / 美股通用字段号（沿用历史） ───
        if (data[38]) {
          result.turnover_rate = this.safeFloat(data[38]);
        }
        if (data[39]) {
          result.pe_ratio = this.safeFloat(data[39]);
        }
        if (data[52]) {
          result.pe_ratio_dynamic = this.safeFloat(data[52]);
        }
        if (data[53]) {
          result.pe_ratio_static = this.safeFloat(data[53]);
        }
        if (data[44]) {
          result.market_cap = this.safeFloat(data[44]) * 100_000_000;
        }
        if (data[46]) {
          result.pb_ratio = this.safeFloat(data[46]);
        }
        if (data[49]) {
          result.volume_ratio = this.safeFloat(data[49]);
        }
        if (data[64]) {
          result.dividend_yield = this.safeFloat(data[64]) / 100;
        }
        if (data[67]) {
          result.week_52_high = this.safeFloat(data[67]);
        }
        if (data[68]) {
          result.week_52_low = this.safeFloat(data[68]);
        }
        if (data[51]) {
          result.sixty_day_avg = this.safeFloat(data[51]);
        }
      }

      return result;
    } catch (e: any) {
      this.logger.error(`Parse gtimg data failed: ${e}`);
      return null;
    }
  }

  private async fetchFinancialDataFromSina(symbol: string): Promise<Partial<QuoteResult> | null> {
    try {
      const url = `https://quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022?paperCode=${symbol}&source=gjzb&type=0&page=1&num=10`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          Referer: 'https://finance.sina.com.cn/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const data = response.data;
      if (!data?.result?.data?.report_list) {
        return null;
      }

      const reportList = data.result.data.report_list;
      const latestDate = Object.keys(reportList)[0];
      if (!latestDate) return null;

      const financialItems: any[] = reportList[latestDate]?.data || [];

      // 字段映射表：[新浪标题精确匹配, 目标键, 是否百分比(/100)]
      const PERCENT = true;
      const ABSOLUTE = false;
      const MATCHES: [string, keyof QuoteResult, boolean][] = [
        // --- 盈利能力 ---
        ['净资产收益率(ROE)', 'roe', PERCENT],
        ['净资产收益率_平均', 'roe_avg', PERCENT],
        ['净资产收益率_平均_扣除非经常损益', 'roe_net', PERCENT],
        ['总资产报酬率', 'roa', PERCENT],
        ['投入资本回报率', 'roic', PERCENT],
        ['毛利率', 'gross_margin', PERCENT],
        ['销售净利率', 'net_margin', PERCENT],
        ['营业利润率', 'operating_margin', PERCENT],
        ['息税前利润率', 'ebit_margin', PERCENT],

        // --- 成长能力 ---
        ['营业总收入增长率', 'revenue_growth', PERCENT],
        ['归属母公司净利润增长率', 'earnings_growth', PERCENT],

        // --- 财务风险 ---
        ['流动比率', 'current_ratio', ABSOLUTE],
        ['速动比率', 'quick_ratio', ABSOLUTE],
        ['资产负债率', 'debt_ratio', PERCENT],
        ['权益乘数', 'equity_multiplier', ABSOLUTE],
        ['现金比率', 'cash_ratio', ABSOLUTE],

        // --- 营运能力 ---
        ['应收账款周转率', 'ar_turn', ABSOLUTE],
        ['应收账款周转天数', 'ar_days', ABSOLUTE],
        ['存货周转率', 'inv_turn', ABSOLUTE],
        ['存货周转天数', 'inv_days', ABSOLUTE],
        ['总资产周转率', 'ta_turn', ABSOLUTE],

        // --- 收益质量 ---
        ['经营活动净现金/归属母公司的净利润', 'ocf_to_profit', ABSOLUTE],
        ['成本费用率', 'cost_expense_ratio', PERCENT],

        // --- 每股指标 ---
        ['基本每股收益', 'basic_eps', ABSOLUTE],
        ['稀释每股收益', 'diluted_eps', ABSOLUTE],
        ['每股净资产', 'bps', ABSOLUTE],
        ['每股经营现金流', 'ocfps', ABSOLUTE],
        ['每股企业自由现金流量', 'fcps', ABSOLUTE],
        ['每股未分配利润', 'udpps', ABSOLUTE],
        ['每股资本公积金', 'cappps', ABSOLUTE],
        ['每股盈余公积金', 'surppps', ABSOLUTE],

        // --- 绝对值（元） ---
        ['营业总收入', 'revenue', ABSOLUTE],
        ['营业成本', 'cost', ABSOLUTE],
        ['净利润', 'net_profit', ABSOLUTE],
        ['归母净利润', 'net_profit_parent', ABSOLUTE],
        ['扣非净利润', 'net_profit_deducted', ABSOLUTE],
        ['股东权益合计(净资产)', 'equity', ABSOLUTE],
        ['经营现金流量净额', 'ocf', ABSOLUTE],
      ];

      const result: Partial<QuoteResult> = {};

      for (const item of financialItems) {
        const title = item.item_title;
        const rawVal = item.item_value;
        if (!title || rawVal == null || rawVal === 'None' || rawVal === '') continue;
        const value = parseFloat(rawVal);
        if (isNaN(value)) continue;

        for (const [sinaTitle, targetKey, isPercent] of MATCHES) {
          if (title === sinaTitle) {
            (result as any)[targetKey] = isPercent ? value / 100 : value;
            break;
          }
        }
      }

      return result;
    } catch (e: any) {
      this.logger.debug(`Fetch financial data from Sina failed: ${e.message}`);
      return null;
    }
  }

  /**
   * 通用 helper: fetch datacenter report rows, filter to latest report date,
   * pivot into code->amount map.
   */
  private async fetchEmPivotRows(
    reportName: string,
    code5: string,
    pageSize = 50,
  ): Promise<{
    byCode: Record<string, number>;
    byName: Record<string, number>;
    reportDate: string | null;
  }> {
    const url =
      'https://datacenter.eastmoney.com/securities/api/data/v1/get' +
      `?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=${pageSize}&pageNumber=1` +
      `&reportName=${reportName}&columns=ALL` +
      `&filter=(SECURITY_CODE%3D%22${code5}%22)` +
      '&source=WEB&client=WEB';
    const resp = await axios.get(url, {
      timeout: 10000,
      headers: { ...this.PUSH2_HEADERS, Referer: 'https://hkf10.eastmoney.com/' },
    });
    const rows: any[] = resp.data?.result?.data ?? [];
    if (rows.length === 0) return { byCode: {}, byName: {}, reportDate: null };

    // 取最新的报告期
    const latestDate = rows[0].REPORT_DATE?.slice(0, 10);
    const latestRows = rows.filter((r) => r.REPORT_DATE?.slice(0, 10) === latestDate);

    const byCode: Record<string, number> = {};
    const byName: Record<string, number> = {};
    for (const r of latestRows) {
      const amount = r.AMOUNT;
      if (amount == null || isNaN(Number(amount))) continue;
      const num = Number(amount);
      if (r.STD_ITEM_CODE) byCode[r.STD_ITEM_CODE] = num;
      if (r.STD_ITEM_NAME) byName[r.STD_ITEM_NAME] = num;
    }
    return { byCode, byName, reportDate: latestDate };
  }

  /**
   * 港股 F10 财务数据 — 东方财富 datacenter.
   *
   * 数据来源:
   *   1. RPT_HKF10_FN_MAININDICATOR — 89 字段宽表，覆盖盈利能力/成长/风险/营运/每股
   *   2. RPT_HKF10_FN_BALANCE_PC    — 资产负债表 (long format)
   *      用来计算 quick_ratio, cash_ratio, udpps, cappps, surppps
   *   3. RPT_HKF10_FN_INCOME_PC      — 利润表 (long format)
   *      用来补 net_profit / 验证净利润
   *
   * ⚠️ 百分比陷阱: 东财 MAININDICATOR 百分比是"直接百分数"(9.97=9.97%)，
   *   而新浪 A 股是小数(0.1057=10.57%)。这里全部 ÷100 归一化。
   *   但 BALANCE_PC/INCOME_PC 里的 AMOUNT 是绝对值（原币），直接用。
   */
  private async fetchFinancialDataFromEastMoneyHK(
    code5: string,
  ): Promise<Partial<QuoteResult> | null> {
    const CACHE_KEY = `hk_fin_em:${code5}`;
    const cached = this.CACHE.get(CACHE_KEY);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data as any;
    }

    try {
      // ===== 1. MAININDICATOR 宽表 =====
      const mainUrl =
        'https://datacenter.eastmoney.com/securities/api/data/v1/get' +
        '?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=1&pageNumber=1' +
        '&reportName=RPT_HKF10_FN_MAININDICATOR&columns=ALL' +
        `&filter=(SECURITY_CODE%3D%22${code5}%22)` +
        '&source=WEB&client=WEB';

      const mainResp = await axios.get(mainUrl, {
        timeout: 10000,
        headers: { ...this.PUSH2_HEADERS, Referer: 'https://hkf10.eastmoney.com/' },
      });
      const row = mainResp.data?.result?.data?.[0];
      if (!row) {
        this.logger.debug(`HK finance from EM: no mainindicator for ${code5}`);
        return null;
      }

      const pct = (v: any): number | undefined =>
        v != null && !isNaN(Number(v)) ? Number(v) / 100 : undefined;
      const abs = (v: any): number | undefined =>
        v != null && !isNaN(Number(v)) ? Number(v) : undefined;
      const ratio = (v: any): number | undefined =>
        v != null && !isNaN(Number(v)) ? Number(v) : undefined;

      const result: Partial<QuoteResult> = {};

      // --- 盈利能力 ---
      result.roe = pct(row.ROE_YEARLY);
      result.roe_avg = pct(row.ROE_AVG);
      result.roa = pct(row.ROA);
      result.roic = pct(row.ROIC_YEARLY);
      result.gross_margin = pct(row.GROSS_PROFIT_RATIO);
      result.net_margin = pct(row.NET_PROFIT_RATIO);
      const opIncome = abs(row.OPERATE_INCOME);
      const opProfit = abs(row.OPERATE_PROFIT);
      if (opIncome && opProfit) {
        result.operating_margin = opIncome > 0 ? opProfit / opIncome : undefined;
        result.ebit_margin = result.operating_margin;
      }

      // --- 成长能力 ---
      result.revenue_growth = pct(row.OPERATE_INCOME_YOY);
      result.earnings_growth = pct(row.HOLDER_PROFIT_YOY);

      // --- 财务风险（先填 MAININDICATOR 有的）---
      result.current_ratio = ratio(row.CURRENT_RATIO);
      result.debt_ratio = pct(row.DEBT_ASSET_RATIO);
      result.equity_multiplier = ratio(row.EQUITY_MULTIPLIER);

      // --- 营运能力 ---
      result.ar_days = abs(row.ACCOUNTS_RECE_TDAYS);
      result.inv_days = abs(row.INVENTORY_TDAYS);
      result.ar_turn = result.ar_days && result.ar_days > 0 ? 365 / result.ar_days : undefined;
      result.inv_turn = result.inv_days && result.inv_days > 0 ? 365 / result.inv_days : undefined;

      // --- 每股指标 ---
      result.basic_eps = abs(row.BASIC_EPS);
      result.diluted_eps = abs(row.DILUTED_EPS);
      result.bps = abs(row.BPS);
      result.ocfps = abs(row.PER_NETCASH_OPERATE);

      // --- 绝对值 ---
      result.revenue = abs(row.OPERATE_INCOME);
      result.net_profit_parent = abs(row.HOLDER_PROFIT);
      result.equity = abs(row.TOTAL_PARENT_EQUITY);
      result.total_assets = abs(row.TOTAL_ASSETS);
      result.ocf = abs(row.NETCASH_OPERATE);
      result.total_liabilities = abs(row.TOTAL_LIABILITIES);

      const grossProfit = abs(row.GROSS_PROFIT);
      if (result.revenue && grossProfit) {
        result.cost = result.revenue - grossProfit;
      }

      result.pe_ratio = ratio(row.PE_TTM);
      result.pb_ratio = ratio(row.PB_TTM);
      result.dividend_rate = pct(row.DIVIDEND_RATE);

      // ===== 2. 并行拉 BALANCE + INCOME 三张 long-format 表 =====
      try {
        const [bal, inc] = await Promise.all([
          this.fetchEmPivotRows('RPT_HKF10_FN_BALANCE_PC', code5, 50),
          this.fetchEmPivotRows('RPT_HKF10_FN_INCOME_PC', code5, 30),
        ]);

        // --- 资产负债表科目 (STD_ITEM_CODE) ---
        const currentAssets = bal.byCode['004002999']; // 流动资产合计
        const currentLiab = bal.byCode['004011999']; // 流动负债合计
        const inventory = bal.byCode['004002001']; // 存货
        const cashEquiv = bal.byCode['004002010']; // 现金及等价物
        const parentEquity = bal.byCode['004030999']; // 股东权益
        const retainedEarnings = bal.byCode['004030004']; // 保留溢利(累计亏损)
        const sharePremium = bal.byCode['004030003']; // 股本溢价
        const totalEquity = bal.byCode['004036999']; // 总权益
        const treasuryStock = bal.byCode['004030012']; // 库存股（通常负数）

        // === 速动比率 = (流动资产 - 存货) / 流动负债 ===
        if (
          result.quick_ratio == null &&
          currentAssets != null &&
          currentLiab != null &&
          currentLiab > 0
        ) {
          const quickAssets = currentAssets - (inventory ?? 0);
          result.quick_ratio = quickAssets / currentLiab;
        }

        // === 现金比率 = 现金及等价物 / 流动负债 ===
        if (
          result.cash_ratio == null &&
          cashEquiv != null &&
          currentLiab != null &&
          currentLiab > 0
        ) {
          result.cash_ratio = cashEquiv / currentLiab;
        }

        // === 每股未分配利润 = 保留溢利 / 总股本 ===
        // 但香港公司经常不披露法定每股公积金，udpps/cappps/surppps 依赖总股本
        // 总股本在 MAININDICATOR. COMMON_ACS / HK_COMMON_SHARES
        const totalShares = abs(row.HK_COMMON_SHARES) ?? abs(row.COMMON_ACS);
        if (totalShares && totalShares > 0) {
          // 每股未分配利润 udpps = 保留溢利 / 总股本
          if (retainedEarnings != null) {
            result.udpps = retainedEarnings / totalShares;
          }
          // 每股资本公积金 cappps = 股本溢价 / 总股本
          if (sharePremium != null) {
            result.cappps = sharePremium / totalShares;
          }
          // 每股盈余公积 surppps — 香港公司极少单独披露法定盈余公积，
          // 可近似用 (总权益 - 股本溢价 - 保留溢利 - 库存股 - 股本面值) 估算
          // 但直接留 undefined 让前端显示 "—" 会更诚实
          // 如果有 "其他储备"(004030009)，可近似作为盈余公积
          const otherReserves = bal.byCode['004030009'];
          if (otherReserves != null) {
            result.surppps = otherReserves / totalShares;
          }
        }

        // === 扣非净利润 ≈ 税后净利润 - 少数股东损益 ===
        const afterTaxProfit = inc.byCode['004012999']; // 除税后溢利
        const minority = inc.byCode['004025001']; // 少数股东损益
        if (afterTaxProfit != null) {
          result.net_profit = afterTaxProfit;
          if (minority != null) {
            result.net_profit_deducted = afterTaxProfit - minority;
          }
        }

        // === ocf_to_profit = 经营现金流 / 归母净利润 ===
        if (
          result.ocf != null &&
          result.net_profit_parent != null &&
          result.net_profit_parent !== 0
        ) {
          result.ocf_to_profit = result.ocf / result.net_profit_parent;
        }

        // === 成本费用率 = 营运支出(期间费用) / 营运收入 ===
        // 港股 004005001 "营运支出" 指期间费用（销售+行政+研发），不是 A 股"营业总成本"
        // 所以这里用 期间费用率 = 营运支出 / 营收，与 A 股口径 ((营业总成本-营业成本)/营收) 一致
        const opExpense = inc.byName['营运支出'] ?? inc.byCode['004005001'];
        if (result.revenue != null && opExpense != null && result.revenue > 0) {
          result.cost_expense_ratio = opExpense / result.revenue;
        }

        // === 总资产周转率 = 营收 / 总资产 ===
        if (result.revenue != null && result.total_assets != null && result.total_assets > 0) {
          result.ta_turn = result.revenue / result.total_assets;
        }
      } catch (e2: any) {
        this.logger.debug(`HK balance/income pivot partial failure: ${e2.message}`);
        // MAININDICATOR 数据已经填好，三张表失败不致命
      }

      const cacheEntry = { data: result, timestamp: now };
      this.CACHE.set(CACHE_KEY, cacheEntry);
      return result;
    } catch (e: any) {
      this.logger.debug(`HK finance from EM failed: ${e.message}`);
      return null;
    }
  }

  private async fetchFromGtimg(url: string): Promise<string> {
    const response = await axios.get(url, { timeout: 10000, responseType: 'arraybuffer' });
    return iconv.decode(response.data, 'gbk');
  }

  private async fetchQuoteFromGtimg(symbol: string, prefix: string): Promise<QuoteResult | null> {
    try {
      const url = `http://qt.gtimg.cn/q=${prefix}${symbol}`;
      const text = await this.fetchFromGtimg(url);
      const market = prefix === 'hk' ? 'hk' : prefix === 'us' ? 'us' : 'a_share';
      const data = this.parseGtimgData(text, market);
      return data;
    } catch (e: any) {
      this.logger.error(`Fetch from gtimg failed: ${e}`);
      return null;
    }
  }

  /**
   * 腾讯单股快照不包含量比。A 股量比由东方财富单股快照的 f50 提供；失败时保留
   * undefined，让调用方显示缺省值，绝不以换手率或其它字段代替。
   */
  private async enrichAshareVolumeRatio(
    quote: QuoteResult,
    code: string,
    prefix: string,
  ): Promise<void> {
    try {
      const market = prefix === 'sh' ? 1 : prefix === 'sz' ? 0 : 0;
      const response = await axios.get(
        `https://push2.eastmoney.com/api/qt/stock/get?secid=${market}.${code}&fields=f50`,
        { timeout: 5000 },
      );
      const ratio = this.safeFloat(response.data?.data?.f50, Number.NaN);
      if (Number.isFinite(ratio) && ratio >= 0) {
        quote.volume_ratio = ratio;
      }
    } catch (e: any) {
      this.logger.debug(`Volume ratio unavailable for ${prefix}${code}: ${e.message}`);
    }
  }

  /** 港美股量比使用当前累计成交量与前 5 个完整交易日平均成交量的比值。 */
  private async fetchRecentAverageVolume(
    symbol: string,
    market: 'hk' | 'us',
  ): Promise<number | null> {
    try {
      const endpoint = market === 'hk' ? 'hkfqkline' : 'usfqkline';
      const variable = 'kline_dayqfq';
      const url = `https://web.ifzq.gtimg.cn/appstock/app/${endpoint}/get?_var=${variable}&param=${symbol},day,,,6,qfq`;
      const response = await axios.get(url, { timeout: 5000 });
      const payload =
        typeof response.data === 'string'
          ? JSON.parse(response.data.replace(new RegExp(`^${variable}=`), ''))
          : response.data;
      // 腾讯 qfq K线返回 key 是 qfqday（港/美），非 qfq 时才是 day
      const days: unknown[] = payload?.data?.[symbol]?.qfqday ?? payload?.data?.[symbol]?.day ?? [];
      const historical = days
        .slice(0, -1)
        .map((day: any) => this.safeFloat(day?.[5], Number.NaN))
        .filter((volume: number) => Number.isFinite(volume) && volume > 0)
        .slice(-5);
      if (!historical.length) return null;
      return (
        historical.reduce((sum: number, volume: number) => sum + volume, 0) / historical.length
      );
    } catch (e: any) {
      this.logger.debug(`Historical volume unavailable for ${symbol}: ${e.message}`);
      return null;
    }
  }

  private async enrichOverseasMetrics(
    quote: QuoteResult,
    symbol: string,
    market: 'hk' | 'us',
  ): Promise<void> {
    // 不使用腾讯 A 股字段位置的“换手率”，而是由成交量和总股本计算。
    const estimatedShares =
      quote.market_cap && quote.current_price > 0 ? quote.market_cap / quote.current_price : 0;
    if (estimatedShares > 0 && quote.volume >= 0) {
      quote.turnover_rate = (quote.volume / estimatedShares) * 100;
    }

    if (!quote.turnover && quote.current_price > 0 && quote.volume > 0) {
      quote.turnover = quote.current_price * quote.volume;
    }

    const avgVolume = await this.fetchRecentAverageVolume(symbol, market);
    if (avgVolume && quote.volume >= 0) {
      quote.volume_ratio = quote.volume / avgVolume;
    }
  }

  private async fetchMarketDataFromGtimg(symbols: string[]): Promise<QuoteResult[]> {
    try {
      const url = `http://qt.gtimg.cn/q=${symbols.join(',')}`;
      const text = await this.fetchFromGtimg(url);
      const lines = text.trim().split('\n');
      const results: QuoteResult[] = [];
      for (const line of lines) {
        const match = line.match(/v_(\w+)=/);
        const sourceSymbol = match?.[1] ?? '';
        const market = sourceSymbol.startsWith('hk')
          ? 'hk'
          : sourceSymbol.startsWith('us')
            ? 'us'
            : 'a_share';
        const data = this.parseGtimgData(line, market);
        if (data) {
          if (match) {
            data.symbol = match[1];
          }
          results.push(data);
        }
      }
      return results;
    } catch (e: any) {
      this.logger.error(`Fetch market data from gtimg failed: ${e}`);
      return [];
    }
  }

  private async fetchWithRetry(url: string, maxRetries = 3, timeout = 15000): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await axios.get(url, { timeout });
        if (response.status >= 400) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.data;
      } catch (e: any) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          throw e;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  private async fetchChartFromSina(
    symbol: string,
    prefix: string,
    period: string,
  ): Promise<ChartQuote[] | null> {
    try {
      const sinaSymbol = `${prefix}${symbol}`;
      const scaleMap: Record<string, number> = { daily: 240, weekly: 60, monthly: 120 };
      const scale = scaleMap[period] || 240;

      const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sinaSymbol}&scale=${scale}&ma=no&datalen=300`;
      const data = await axios.get(url, { timeout: 15000 });

      if (Array.isArray(data.data) && data.data.length > 0) {
        const quotes: ChartQuote[] = [];
        for (const item of data.data) {
          quotes.push({
            date: item.day || '',
            open: this.safeFloat(item.open, 0),
            close: this.safeFloat(item.close, 0),
            high: this.safeFloat(item.high, 0),
            low: this.safeFloat(item.low, 0),
            volume: this.safeInt(item.volume, 0),
          });
        }
        return quotes;
      }
    } catch (e: any) {
      this.logger.error(`Sina chart failed: ${e}`);
    }
    return null;
  }

  private async fetchChartFromEastmoney(
    code: string,
    prefix: string,
    period: string,
  ): Promise<ChartQuote[] | null> {
    const klt = period === 'daily' ? 101 : period === 'weekly' ? 102 : 103;
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${prefix}.${code}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1`;

    try {
      const data = await this.fetchWithRetry(url);

      if (data.data && data.data.klines) {
        const quotes: ChartQuote[] = [];
        for (const line of data.data.klines) {
          const parts = line.split(',');
          quotes.push({
            date: parts[0],
            open: parseFloat(parts[1]),
            close: parseFloat(parts[2]),
            high: parseFloat(parts[3]),
            low: parseFloat(parts[4]),
            volume: parseInt(parts[5], 10),
          });
        }
        return quotes;
      }
    } catch (e: any) {
      this.logger.error(`Eastmoney chart failed: ${e}`);
    }
    return null;
  }

  private async fetchChartFromTencent(
    symbol: string,
    market: 'a_share' | 'hk' | 'us',
    period: string,
  ): Promise<ChartQuote[] | null> {
    const endpoint = market === 'hk' ? 'hkfqkline' : market === 'us' ? 'usfqkline' : 'fqkline';
    const klinePeriod = period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'day';

    // 美股需带交易所后缀（NASDAQ=.OQ / NYSE=.N），无后缀时接口只返回占位数据
    const candidates = market === 'us' ? [`${symbol}.OQ`, `${symbol}.N`, symbol] : [symbol];

    for (const candidate of candidates) {
      const variable = `kline_${period}qfq`;
      const url = `https://web.ifzq.gtimg.cn/appstock/app/${endpoint}/get?_var=${variable}&param=${candidate},${klinePeriod},,,320,qfq`;

      try {
        const response = await axios.get(url, { timeout: 15000 });
        const payload =
          typeof response.data === 'string'
            ? JSON.parse(response.data.replace(new RegExp(`^${variable}=`), '').replace(/;$/, ''))
            : response.data;
        const node = payload?.data?.[candidate];
        if (!node || typeof node !== 'object') continue;

        // qfq 响应的键名为 qfqday/qfqweek/qfqmonth，未复权为 day/week/month
        const days: unknown[] = node[`qfq${klinePeriod}`] ?? node[klinePeriod] ?? [];
        if (!Array.isArray(days) || days.length < 2) continue;

        const quotes = days
          .map((day: any) => ({
            date: String(day?.[0] ?? ''),
            open: this.safeFloat(day?.[1], Number.NaN),
            close: this.safeFloat(day?.[2], Number.NaN),
            high: this.safeFloat(day?.[3], Number.NaN),
            low: this.safeFloat(day?.[4], Number.NaN),
            volume: this.safeInt(day?.[5], 0),
          }))
          .filter(
            (day: ChartQuote) =>
              day.date &&
              Number.isFinite(day.open) &&
              Number.isFinite(day.close) &&
              Number.isFinite(day.high) &&
              Number.isFinite(day.low),
          );
        if (quotes.length) return quotes;
      } catch (e: any) {
        this.logger.debug(`Tencent chart failed for ${candidate}: ${e.message}`);
      }
    }
    return null;
  }

  private getCache(key: string): any {
    const entry = this.CACHE.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL * 1000) {
      return entry.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.CACHE.set(key, { data, timestamp: Date.now() });
    if (this.CACHE.size > 1000) {
      let oldestKey = '';
      let oldestTimestamp = Date.now();
      for (const [key, entry] of this.CACHE) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.CACHE.delete(oldestKey);
      }
    }
  }

  private getMarketData(market: string): any {
    const cacheKey = `market_${market}`;
    const entry = this.MARKET_DATA_CACHE.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < this.MARKET_DATA_TTL * 1000) {
      return entry.data;
    }
    return null;
  }

  private setMarketData(market: string, data: any): void {
    const cacheKey = `market_${market}`;
    this.MARKET_DATA_CACHE.set(cacheKey, { data, timestamp: Date.now() });
  }

  async getQuote(symbol: string): Promise<QuoteResult | null> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const normalized = this.normalizeSymbol(symbol);
      let data: QuoteResult | null = null;

      switch (normalized.market) {
        case 'a_share':
        case 'hk':
        case 'us':
          data = await this.fetchQuoteFromGtimg(normalized.code, normalized.prefix);
          if (data && normalized.market === 'a_share') {
            await this.enrichAshareVolumeRatio(data, normalized.code, normalized.prefix);
            const financialData = await this.fetchFinancialDataFromSina(
              `${normalized.prefix}${normalized.code}`.toLowerCase(),
            );
            if (financialData) {
              Object.assign(data, financialData);
              this.logger.debug(
                `Enriched ${symbol} with financial data: ${JSON.stringify(financialData)}`,
              );
            } else {
              this.logger.debug(`No financial data from Sina for ${symbol}`);
            }
          } else if (data && (normalized.market === 'hk' || normalized.market === 'us')) {
            await this.enrichOverseasMetrics(
              data,
              `${normalized.prefix}${normalized.code}`,
              normalized.market,
            );
            // 港股额外拉东财 F10 财务数据
            if (normalized.market === 'hk') {
              const hkFin = await this.fetchFinancialDataFromEastMoneyHK(normalized.code);
              if (hkFin) {
                Object.assign(data, hkFin);
                this.logger.debug(
                  `Enriched HK ${symbol} with EM financial data: ` +
                    `roe=${hkFin.roe}, gross=${hkFin.gross_margin}, net=${hkFin.net_margin}`,
                );
              } else {
                this.logger.debug(`No HK financial data from EM for ${symbol}`);
              }
            }
          }
          break;
        case 'futures':
        case 'forex':
        case 'index':
        case 'crypto':
          data = await this.fetchQuoteFromSina(normalized.code, normalized.prefix);
          if (!data) {
            data = await this.fetchFromAlternativeSource(
              symbol,
              normalized.code,
              normalized.market,
            );
          }
          break;
      }

      if (data) {
        const marketMap: Record<string, string> = {
          a_share: 'A股',
          hk: '港股',
          us: '美股',
          futures: '期货',
          forex: '外汇',
          index: '指数',
          crypto: '加密货币',
        };
        const currencyMap: Record<string, string> = {
          a_share: 'CNY',
          hk: 'HKD',
          us: 'USD',
          futures: 'USD',
          forex: 'USD',
          index: 'USD',
          crypto: 'USD',
        };
        data.market = marketMap[normalized.market] || '其他';
        data.currency = currencyMap[normalized.market] || 'USD';
        data.symbol = symbol;
        this.setCache(cacheKey, data);
        return data;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get quote for ${symbol}:`, error.message);
      return null;
    }
  }

  private async fetchFromAlternativeSource(
    symbol: string,
    code: string,
    market: string,
  ): Promise<QuoteResult | null> {
    try {
      const nameMap: Record<string, string> = {
        USDX: '美元指数',
        BTC: '比特币',
      };

      if (code === 'USDX' && market === 'forex') {
        const url = 'https://www.investing.com/api/financialdata/8835';
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            Referer: 'https://www.investing.com/',
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        const data = response.data;
        if (data && data.last) {
          return {
            symbol,
            name: nameMap[code] || code,
            current_price: this.safeFloat(data.last),
            prev_close: this.safeFloat(data.prevClose),
            open_price: this.safeFloat(data.open),
            day_high: this.safeFloat(data.high),
            day_low: this.safeFloat(data.low),
            volume: 0,
            turnover: 0,
            change: this.safeFloat(data.change),
            change_percent: this.safeFloat(data.changePercent),
            market: '外汇',
            currency: 'USD',
          };
        }
      }

      if (code === 'BTC' && market === 'crypto') {
        const url = 'https://api.coingecko.com/api/v3/coins/bitcoin';
        const response = await axios.get(url, { timeout: 10000 });
        const data = response.data;
        if (data && data.market_data) {
          const currentPrice = data.market_data.current_price.usd;
          const prevClose = data.market_data.previous_close.usd || currentPrice;
          const change = currentPrice - prevClose;
          return {
            symbol,
            name: nameMap[code] || code,
            current_price: this.safeFloat(currentPrice),
            prev_close: this.safeFloat(prevClose),
            open_price: this.safeFloat(data.market_data.current_price.usd),
            day_high: this.safeFloat(data.market_data.high_24h.usd),
            day_low: this.safeFloat(data.market_data.low_24h.usd),
            volume: this.safeFloat(data.market_data.total_volume.usd),
            turnover: 0,
            change: this.safeFloat(change),
            change_percent: prevClose !== 0 ? (change / prevClose) * 100 : 0,
            market: '加密货币',
            currency: 'USD',
          };
        }
      }
    } catch (e: any) {
      this.logger.error(`Alternative source failed for ${symbol}: ${e.message}`);
    }
    return null;
  }

  private async fetchQuoteFromSina(code: string, prefix: string): Promise<QuoteResult | null> {
    try {
      let sinaSymbol = '';
      let url = '';

      let dataType = 'default';

      if (prefix === 'idx') {
        switch (code) {
          case 'VIX':
            sinaSymbol = 'VX';
            url = `https://hq.sinajs.cn/list=hf_${sinaSymbol}`;
            dataType = 'futures';
            break;
          case 'TNX':
            sinaSymbol = 'us10yt';
            url = `https://hq.sinajs.cn/list=globalbd_${sinaSymbol}`;
            dataType = 'bond';
            break;
          case 'TYX':
            sinaSymbol = 'us30yt';
            url = `https://hq.sinajs.cn/list=globalbd_${sinaSymbol}`;
            dataType = 'bond';
            break;
          case 'FVX':
            sinaSymbol = 'us5yt';
            url = `https://hq.sinajs.cn/list=globalbd_${sinaSymbol}`;
            dataType = 'bond';
            break;
          case 'IRX':
            sinaSymbol = 'us3mt';
            url = `https://hq.sinajs.cn/list=globalbd_${sinaSymbol}`;
            dataType = 'bond';
            break;
          case 'SPX':
            sinaSymbol = 'sp500';
            url = `https://hq.sinajs.cn/list=int_${sinaSymbol}`;
            dataType = 'index';
            break;
          case 'DJI':
            sinaSymbol = 'dji';
            url = `https://hq.sinajs.cn/list=int_${sinaSymbol}`;
            dataType = 'index';
            break;
          case 'IXIC':
            sinaSymbol = 'nasdaq';
            url = `https://hq.sinajs.cn/list=int_${sinaSymbol}`;
            dataType = 'index';
            break;
          default:
            sinaSymbol = code.toLowerCase();
            url = `https://hq.sinajs.cn/list=int_${sinaSymbol}`;
            dataType = 'index';
        }
      } else if (prefix === 'hf') {
        if (code === 'SI') {
          sinaSymbol = 'si';
          url = `https://hq.sinajs.cn/list=gb_${sinaSymbol}`;
          dataType = 'futures';
        } else {
          sinaSymbol = code;
          url = `https://hq.sinajs.cn/list=hf_${sinaSymbol}`;
          dataType = 'futures';
        }
      } else if (prefix === 'fx') {
        if (code === 'CNY') {
          sinaSymbol = 'susdcny';
          url = `https://hq.sinajs.cn/list=fx_${sinaSymbol}`;
          dataType = 'forex';
        } else {
          sinaSymbol = 'usdx';
          url = `https://hq.sinajs.cn/list=fx_${sinaSymbol}`;
          dataType = 'forex';
        }
      } else if (prefix === 'crypto') {
        sinaSymbol = 'btcusdt';
        url = `https://hq.sinajs.cn/list=btc_${sinaSymbol}`;
        dataType = 'crypto';
      }

      if (url) {
        const response = await axios.get(url, {
          timeout: 10000,
          responseType: 'arraybuffer',
          headers: {
            Referer: 'https://finance.sina.com.cn/',
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        const text = iconv.decode(response.data, 'gbk');
        return this.parseSinaData(text, code, dataType);
      }
    } catch (e: any) {
      this.logger.error(`Fetch from Sina failed: ${e}`);
    }
    return null;
  }

  private parseSinaData(data: string, code: string, dataType: string): QuoteResult | null {
    try {
      const match = data.match(/="([^"]+)"/);
      if (!match) return null;

      const fields = match[1].split(',');
      if (fields.length < 4) return null;

      const nameMap: Record<string, string> = {
        VIX: 'VIX恐慌指数',
        TNX: '美10年国债',
        TYX: '美30年国债',
        FVX: '美5年国债',
        IRX: '美3月国债',
        GC: '黄金',
        SI: '白银',
        CL: '原油',
        HG: '铜',
        NG: '天然气',
        USDX: '美元指数',
        CNY: '美元/人民币',
        BTC: '比特币',
        SPX: '标普500',
        DJI: '道琼斯',
        IXIC: '纳斯达克',
      };

      let currentPrice = 0;
      let prevClose = 0;
      let change = 0;
      let changePercentVal = 0;
      let openPrice = 0;
      let dayHigh = 0;
      let dayLow = 0;

      switch (dataType) {
        case 'index':
          currentPrice = this.safeFloat(fields[1]);
          change = this.safeFloat(fields[2]);
          changePercentVal = this.safeFloat(fields[3]);
          prevClose = currentPrice - change;
          openPrice = currentPrice;
          dayHigh = currentPrice;
          dayLow = currentPrice;
          break;
        case 'futures':
          if (code === 'SI') {
            currentPrice = this.safeFloat(fields[1]);
            prevClose = this.safeFloat(fields[26]) || currentPrice;
            openPrice = this.safeFloat(fields[5]) || currentPrice;
            dayHigh = this.safeFloat(fields[6]) || currentPrice;
            dayLow = this.safeFloat(fields[7]) || currentPrice;
            change = this.safeFloat(fields[4]);
            changePercentVal = this.safeFloat(fields[2]);
          } else {
            currentPrice = this.safeFloat(fields[0]);
            prevClose = this.safeFloat(fields[2]) || currentPrice;
            openPrice = this.safeFloat(fields[3]) || currentPrice;
            dayHigh = this.safeFloat(fields[4]) || currentPrice;
            dayLow = this.safeFloat(fields[5]) || currentPrice;
            change = currentPrice - prevClose;
            changePercentVal = prevClose !== 0 ? (change / prevClose) * 100 : 0;
            if (code === 'HG') {
              currentPrice = currentPrice / 100;
              prevClose = prevClose / 100;
              openPrice = openPrice / 100;
              dayHigh = dayHigh / 100;
              dayLow = dayLow / 100;
              change = change / 100;
            }
          }
          break;
        case 'bond':
          currentPrice = this.safeFloat(fields[1]);
          prevClose = this.safeFloat(fields[2]) || currentPrice;
          openPrice = this.safeFloat(fields[3]) || currentPrice;
          dayHigh = this.safeFloat(fields[4]) || currentPrice;
          dayLow = this.safeFloat(fields[5]) || currentPrice;
          change = currentPrice - prevClose;
          changePercentVal = prevClose !== 0 ? (change / prevClose) * 100 : 0;
          break;
        case 'forex':
          if (code === 'CNY') {
            currentPrice = this.safeFloat(fields[8]) || this.safeFloat(fields[3]);
            prevClose = this.safeFloat(fields[5]) || currentPrice;
            openPrice = this.safeFloat(fields[5]) || currentPrice;
            dayHigh = this.safeFloat(fields[6]) || currentPrice;
            dayLow = this.safeFloat(fields[7]) || currentPrice;
            change = currentPrice - prevClose;
            changePercentVal = prevClose !== 0 ? (change / prevClose) * 100 : 0;
          } else {
            currentPrice = this.safeFloat(fields[0]);
            prevClose = this.safeFloat(fields[2]) || currentPrice;
            openPrice = this.safeFloat(fields[3]) || currentPrice;
            dayHigh = this.safeFloat(fields[4]) || currentPrice;
            dayLow = this.safeFloat(fields[5]) || currentPrice;
            change = currentPrice - prevClose;
            changePercentVal = prevClose !== 0 ? (change / prevClose) * 100 : 0;
          }
          break;
        case 'crypto':
          currentPrice = this.safeFloat(fields[0]);
          prevClose = this.safeFloat(fields[2]) || currentPrice;
          openPrice = this.safeFloat(fields[3]) || currentPrice;
          dayHigh = this.safeFloat(fields[4]) || currentPrice;
          dayLow = this.safeFloat(fields[5]) || currentPrice;
          change = currentPrice - prevClose;
          changePercentVal = prevClose !== 0 ? (change / prevClose) * 100 : 0;
          break;
        default:
          currentPrice = this.safeFloat(fields[3]);
          prevClose = this.safeFloat(fields[2]) || currentPrice;
          openPrice = this.safeFloat(fields[1]) || currentPrice;
          dayHigh = this.safeFloat(fields[4]) || currentPrice;
          dayLow = this.safeFloat(fields[5]) || currentPrice;
          change = currentPrice - prevClose;
          changePercentVal = prevClose !== 0 ? (change / prevClose) * 100 : 0;
      }

      return {
        symbol: code,
        name: nameMap[code] || code,
        current_price: currentPrice,
        prev_close: prevClose,
        open_price: openPrice,
        day_high: dayHigh,
        day_low: dayLow,
        volume: this.safeInt(fields[8]),
        turnover: this.safeFloat(fields[9]),
        change,
        change_percent: changePercentVal,
        market: '',
        currency: 'USD',
      };
    } catch (e: any) {
      this.logger.error(`Parse Sina data failed: ${e}`);
      return null;
    }
  }

  async getQuotesBatch(
    symbols: string[],
  ): Promise<{ symbol: string; data: QuoteResult | null; error: string | null }[]> {
    const grouped: Record<string, { symbol: string; code: string; prefix: string }[]> = {
      a_share: [],
      hk: [],
      us: [],
      futures: [],
      forex: [],
      index: [],
      crypto: [],
    };

    for (const symbol of symbols) {
      try {
        const normalized = this.normalizeSymbol(symbol);
        if (!grouped[normalized.market]) {
          grouped[normalized.market] = [];
        }
        grouped[normalized.market].push({
          symbol,
          code: normalized.code,
          prefix: normalized.prefix,
        });
      } catch {}
    }

    const results: Record<string, QuoteResult> = {};
    const errors: Record<string, string> = {};

    const marketMap: Record<string, string> = {
      a_share: 'A股',
      hk: '港股',
      us: '美股',
      futures: '期货',
      forex: '外汇',
      index: '指数',
      crypto: '加密货币',
    };

    const currencyMap: Record<string, string> = {
      a_share: 'CNY',
      hk: 'HKD',
      us: 'USD',
      futures: 'USD',
      forex: 'USD',
      index: 'USD',
      crypto: 'USD',
    };

    for (const [market, items] of Object.entries(grouped)) {
      if (!items.length) continue;

      try {
        if (market === 'a_share' || market === 'hk' || market === 'us') {
          let df = this.getMarketData(market);
          if (!df) {
            if (market === 'a_share') {
              df = await this.fetchMarketDataFromGtimg([
                'sh000001',
                'sh000002',
                'sh600000',
                'sh600519',
                'sh601318',
                'sh600036',
                'sh600030',
                'sh601398',
                'sh601988',
                'sh600048',
                'sz000001',
                'sz000002',
                'sz000858',
                'sz002594',
                'sz300750',
                'sz300059',
              ]);
            } else if (market === 'hk') {
              df = await this.fetchMarketDataFromGtimg([
                'hkHSI',
                'hkHSCEI',
                'hkHSCCI',
                'hkHSU',
                'hkHSTECH',
                'hk00001',
                'hk00002',
                'hk00003',
                'hk00005',
                'hk00006',
                'hk00016',
                'hk00017',
                'hk00088',
                'hk00101',
                'hk00175',
                'hk00267',
                'hk00285',
                'hk00669',
                'hk00700',
                'hk00772',
                'hk00857',
                'hk00883',
                'hk00939',
                'hk01066',
                'hk01109',
                'hk01177',
                'hk01211',
                'hk01299',
                'hk01318',
                'hk01398',
                'hk01810',
                'hk01928',
                'hk01997',
                'hk02007',
                'hk02018',
                'hk02282',
                'hk02318',
                'hk02382',
                'hk02628',
                'hk02800',
                'hk02828',
                'hk02888',
                'hk03328',
                'hk03808',
                'hk03888',
                'hk06098',
                'hk06618',
                'hk06881',
                'hk06885',
                'hk09988',
                'hk10246',
                'hk10992',
                'hk12999',
                'hk18100',
                'hk300750',
              ]);
            } else if (market === 'us') {
              df = await this.fetchMarketDataFromGtimg([
                'usSPX',
                'usDJI',
                'usIXIC',
                'usNDX',
                'usAAPL',
                'usMSFT',
                'usGOOGL',
                'usAMZN',
                'usMETA',
                'usNVDA',
                'usTSLA',
                'usBABA',
                'usJD',
                'usPDD',
                'usNIO',
                'usXPEV',
                'usLI',
                'usBYDDY',
                'usNVAX',
                'usBIDU',
                'usNTES',
                'usMCD',
                'usJPM',
                'usV',
                'usMA',
                'usJNJ',
                'usWMT',
                'usKO',
                'usPEP',
                'usDIS',
                'usNKE',
                'usADBE',
                'usCRM',
                'usORCL',
                'usSAP',
                'usCSCO',
                'usINTC',
                'usAMD',
                'usQCOM',
                'usMU',
                'usAVGO',
                'usTXN',
                'usNVST',
                'usLRCX',
              ]);
            }
          }

          if (df && df.length > 0) {
            this.setMarketData(market, df);
            const dfMap = new Map(df.map((d: QuoteResult) => [d.symbol, d]));

            for (const item of items) {
              const fullSymbol = `${item.prefix}${item.code}`;
              const cachedData = dfMap.get(fullSymbol) as QuoteResult;
              if (cachedData) {
                const data: QuoteResult = {
                  ...cachedData,
                  market: marketMap[market],
                  currency: currencyMap[market],
                  symbol: item.symbol,
                };
                this.setCache(`quote_${item.symbol}`, data);
                results[item.symbol] = data;
              } else {
                const singleData = await this.fetchQuoteFromGtimg(item.code, item.prefix);
                if (singleData) {
                  singleData.market = marketMap[market];
                  singleData.currency = currencyMap[market];
                  singleData.symbol = item.symbol;
                  this.setCache(`quote_${item.symbol}`, singleData);
                  results[item.symbol] = singleData;
                } else {
                  errors[item.symbol] = 'Not found';
                }
              }
            }
          } else {
            for (const item of items) {
              const singleData = await this.fetchQuoteFromGtimg(item.code, item.prefix);
              if (singleData) {
                singleData.market = marketMap[market];
                singleData.currency = currencyMap[market];
                singleData.symbol = item.symbol;
                this.setCache(`quote_${item.symbol}`, singleData);
                results[item.symbol] = singleData;
              } else {
                errors[item.symbol] = 'Market data unavailable';
              }
            }
          }
        } else {
          for (const item of items) {
            const singleData = await this.fetchQuoteFromSina(item.code, item.prefix);
            if (singleData) {
              singleData.market = marketMap[market];
              singleData.currency = currencyMap[market];
              singleData.symbol = item.symbol;
              this.setCache(`quote_${item.symbol}`, singleData);
              results[item.symbol] = singleData;
            } else {
              errors[item.symbol] = 'Not found';
            }
          }
        }
      } catch (e: any) {
        for (const item of items) {
          errors[item.symbol] = (e as Error).message;
        }
      }
    }

    await Promise.all(
      symbols.map(async (symbol) => {
        const normalized = this.normalizeSymbol(symbol);
        const quote = results[symbol];
        if (quote && normalized.market === 'a_share') {
          await this.enrichAshareVolumeRatio(quote, normalized.code, normalized.prefix);
          this.logger.debug(`Fetching financial data for ${symbol}`);
          const financialData = await this.fetchFinancialDataFromSina(
            `${normalized.prefix}${normalized.code}`.toLowerCase(),
          );
          if (financialData) {
            Object.assign(quote, financialData);
            this.logger.debug(
              `Enriched ${symbol} with financial data: roe=${financialData.roe}, gross=${financialData.gross_margin}, net=${financialData.net_margin}`,
            );
          } else {
            this.logger.debug(`No financial data for ${symbol}`);
          }
        } else if (quote && (normalized.market === 'hk' || normalized.market === 'us')) {
          await this.enrichOverseasMetrics(
            quote,
            `${normalized.prefix}${normalized.code}`,
            normalized.market,
          );
          // 港股额外拉东财 F10 财务（有 CACHE，不怕并发）
          if (normalized.market === 'hk') {
            const hkFin = await this.fetchFinancialDataFromEastMoneyHK(normalized.code);
            if (hkFin) {
              Object.assign(quote, hkFin);
            }
          }
        }
      }),
    );

    return symbols.map((symbol) => ({
      symbol,
      data: results[symbol] || null,
      error: errors[symbol] || null,
    }));
  }

  /**
   * 批量获取腾讯行情的涨停价（qt.gtimg.cn，GBK 编码）
   * 用于涨停板精确校验：现价 >= 涨停价 才算涨停（名义涨幅容差法在低股价/规则变化时易误判）
   */
  async getTencentLimitPrices(symbols: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!symbols.length) return map;
    const batchSize = 60;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      try {
        const resp = await axios.get(`https://qt.gtimg.cn/q=${batch.join(',')}`, {
          timeout: 10000,
          responseType: 'arraybuffer',
        });
        const text = iconv.decode(Buffer.from(resp.data), 'gbk');
        const re = /v_(\w+)="([^"]*)"/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
          const fields = m[2].split('~');
          const limitUp = this.safeFloat(fields[47], Number.NaN); // 47=涨停价
          if (Number.isFinite(limitUp) && limitUp > 0) {
            map.set(m[1].toUpperCase(), limitUp);
          }
        }
      } catch (e: any) {
        this.logger.debug(`Tencent limit-price batch failed: ${e.message}`);
      }
    }
    return map;
  }

  /**
   * 获取全市场股票列表（含实时行情快照），数据源为东财 clist 接口。
   * push2 不可达时依次回退 push2delay / 82.push2（延迟行情，选股场景可接受）。
   */
  async getMarketStockList(market: 'a_share' | 'hk' | 'us'): Promise<QuoteResult[]> {
    const fsMap: Record<string, string> = {
      a_share: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
      hk: 'm:116',
      us: 'm:105,m:106,m:107',
    };
    const currencyMap: Record<string, string> = { a_share: 'CNY', hk: 'HKD', us: 'USD' };
    const pageSize = 100;
    const fields = 'f12,f13,f14,f2,f3,f5,f6,f8,f9,f15,f16,f17,f18,f20,f23';
    const hosts = [
      'https://push2.eastmoney.com',
      'https://push2delay.eastmoney.com',
      'https://82.push2.eastmoney.com',
    ];
    let preferredHost = hosts[0];

    const fetchPage = async (pn: number): Promise<{ total: number; rows: any[] }> => {
      const orderedHosts = [preferredHost, ...hosts.filter((h) => h !== preferredHost)];
      let lastErr: any;
      for (const host of orderedHosts) {
        const url = `${host}/api/qt/clist/get?pn=${pn}&pz=${pageSize}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f20&fs=${encodeURIComponent(
          fsMap[market],
        )}&fields=${fields}`;
        try {
          const response = await axios.get(url, { timeout: 10000 });
          const data = response.data?.data;
          if (!data) return { total: 0, rows: [] };
          preferredHost = host;
          return {
            total: Number(data.total) || 0,
            rows: Array.isArray(data.diff) ? data.diff : [],
          };
        } catch (e: any) {
          lastErr = e;
        }
      }
      throw lastErr;
    };

    const firstPage = await fetchPage(1);
    const total = firstPage.total;
    const pages = Math.min(Math.ceil(total / pageSize), 220);
    const pageRows: any[][] = new Array(pages);
    pageRows[0] = firstPage.rows;

    const batchSize = 8;
    for (let start = 2; start <= pages; start += batchSize) {
      const pageNumbers: number[] = [];
      for (let pn = start; pn <= Math.min(start + batchSize - 1, pages); pn++) pageNumbers.push(pn);
      const settled = await Promise.allSettled(pageNumbers.map((pn) => fetchPage(pn)));
      settled.forEach((s, idx) => {
        if (s.status === 'fulfilled') pageRows[pageNumbers[idx] - 1] = s.value.rows;
        else
          this.logger.warn(
            `Market stock list [${market}] page ${pageNumbers[idx]} failed: ${s.reason?.message}`,
          );
      });
    }

    const numRows = (v: any): number | null => {
      const n = typeof v === 'number' ? v : parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };

    // 港股列表含大量权证/牛熊证/人民币柜台，通过名称过滤掉
    const isHkDerivative = (name: string) =>
      /[购|沽|牛|熊]/.test(name) || name.endsWith('-R') || name.endsWith('-WS');

    const quotes: QuoteResult[] = [];
    for (const rows of pageRows) {
      if (!rows) continue;
      for (const row of rows) {
        const code = String(row.f12 ?? '').trim();
        const name = String(row.f14 ?? '').trim();
        if (!code || !name) continue;
        if (market === 'hk' && isHkDerivative(name)) continue;

        let symbol = code;
        if (market === 'a_share') {
          symbol = `${row.f13 === 1 ? 'SH' : 'SZ'}${code}`;
        } else if (market === 'hk') {
          symbol = `HK${code.padStart(5, '0')}`;
        }

        const price = numRows(row.f2);
        const prevClose = numRows(row.f18);
        quotes.push({
          symbol,
          name,
          current_price: price ?? 0,
          prev_close: prevClose ?? 0,
          open_price: numRows(row.f17) ?? 0,
          day_high: numRows(row.f15) ?? 0,
          day_low: numRows(row.f16) ?? 0,
          volume: Math.round(numRows(row.f5) ?? 0),
          turnover: numRows(row.f6) ?? 0,
          turnover_rate: numRows(row.f8) ?? undefined,
          pe_ratio: numRows(row.f9) ?? undefined,
          pb_ratio: numRows(row.f23) ?? undefined,
          market_cap: numRows(row.f20) ?? undefined,
          change: price != null && prevClose != null ? +(price - prevClose).toFixed(4) : 0,
          change_percent: numRows(row.f3) ?? 0,
          market,
          currency: currencyMap[market],
        });
      }
    }

    this.logger.log(`Market stock list [${market}]: fetched ${quotes.length}/${total} symbols`);
    return quotes;
  }

  async getChart(
    symbol: string,
    period = 'daily',
    _startDate?: string,
    _endDate?: string,
  ): Promise<ChartResult | null> {
    try {
      const normalized = this.normalizeSymbol(symbol);

      if (normalized.market === 'a_share') {
        // 腾讯优先：周K/月K数据干净且稳定（新浪的 scale=60/120 实为分钟K，不可用于周/月）
        const tencentQuotes = await this.fetchChartFromTencent(
          `${normalized.prefix}${normalized.code}`,
          normalized.market,
          period,
        );
        if (tencentQuotes?.length) {
          return { symbol, quotes: tencentQuotes };
        }

        const quotes = await this.fetchChartFromEastmoney(
          normalized.code,
          normalized.prefix,
          period,
        );
        if (quotes) {
          return { symbol, quotes };
        }

        const sinaQuotes = await this.fetchChartFromSina(
          normalized.code,
          normalized.prefix,
          period,
        );
        if (sinaQuotes) {
          return { symbol, quotes: sinaQuotes };
        }
      }

      if (
        normalized.market === 'a_share' ||
        normalized.market === 'hk' ||
        normalized.market === 'us'
      ) {
        const quotes = await this.fetchChartFromTencent(
          `${normalized.prefix}${normalized.code}`,
          normalized.market,
          period,
        );
        if (quotes?.length) return { symbol, quotes };
      }

      return { symbol, quotes: [] };
    } catch (error) {
      this.logger.error(`Failed to get chart for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * 分钟级行情：1=当日分时（minute/query），5=5分钟K（mkline，约320根≈近7个交易日）
   * 日期格式：'YYYY-MM-DDTHH:mm'（前端按时间戳渲染时分）
   */
  async getIntradayChart(symbol: string, minutes: 1 | 5): Promise<ChartQuote[] | null> {
    try {
      const normalized = this.normalizeSymbol(symbol);
      const code = `${normalized.prefix}${normalized.code}`.toLowerCase();

      if (minutes === 1) {
        const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`;
        const res = await axios.get(url, { timeout: 15000 });
        const node = res.data?.data?.[code];
        const date = String(node?.data?.date ?? node?.date ?? '');
        const rows: string[] = node?.data?.data ?? [];
        if (!/^\d{8}$/.test(date) || !rows.length) return null;

        // parts: [HHmm, 价格, 累计量(手), 累计额(元)] — 差分得每分钟成交额
        let prevAmount = 0;
        const quotes = rows
          .map((row: string) => {
            const parts = row.split(' ');
            const hhmm = parts[0] ?? '';
            const price = this.safeFloat(parts[1], Number.NaN);
            const cumAmount = this.safeFloat(parts[3], 0);
            const amount = Math.max(cumAmount - prevAmount, 0);
            prevAmount = cumAmount;
            return {
              date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`,
              open: price,
              close: price,
              high: price,
              low: price,
              volume: this.safeFloat(parts[2], 0),
              turnover: amount,
            };
          })
          .filter(
            (q) => Number.isFinite(q.close) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(q.date),
          );
        return quotes.length ? quotes : null;
      }

      const url = `https://ifzq.gtimg.cn/appstock/app/kline/mkline?param=${code},m5,,,320`;
      const res = await axios.get(url, { timeout: 15000 });
      const node = res.data?.data?.[code];
      const rows: unknown[] = node?.m5 ?? [];
      const quotes = rows
        .map((row: any) => {
          const t = String(row?.[0] ?? '');
          return {
            date: `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}`,
            open: this.safeFloat(row?.[1], Number.NaN),
            close: this.safeFloat(row?.[2], Number.NaN),
            high: this.safeFloat(row?.[3], Number.NaN),
            low: this.safeFloat(row?.[4], Number.NaN),
            volume: this.safeFloat(row?.[5], 0),
          };
        })
        .filter(
          (q) =>
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(q.date) &&
            Number.isFinite(q.close) &&
            Number.isFinite(q.open) &&
            Number.isFinite(q.high) &&
            Number.isFinite(q.low),
        );
      return quotes.length ? quotes : null;
    } catch (e: any) {
      this.logger.debug(`Intraday chart failed for ${symbol}: ${e.message}`);
      return null;
    }
  }

  /**
   * 东财 push2 单股接口统一入口：push2 不可达时依次回退
   * push2delay / 82.push2（延迟行情，可接受）。
   */
  /** 东财 push2 系列接口（含港股 fflow）必须带 UA/Referer 头才能通过 WAF。 */
  private readonly PUSH2_HEADERS = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: 'https://quote.eastmoney.com/',
    Accept: '*/*',
  };

  private async fetchFromPush2(pathWithQuery: string): Promise<any> {
    // push2delay 最稳（之前实测多次），放第一位避免 push2 频繁 ECONNRESET 卡 15s
    const hosts = [
      'https://push2delay.eastmoney.com',
      'https://push2.eastmoney.com',
      'https://82.push2.eastmoney.com',
    ];
    let lastErr: any;
    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      // 首个 host 给短超时 5s（快速失败），回退用 15s
      const timeout = i === 0 ? 5000 : 15000;
      try {
        const response = await axios.get(`${host}${pathWithQuery}`, {
          timeout,
          headers: this.PUSH2_HEADERS,
        });
        return response.data;
      } catch (e: any) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  async getMoneyflow(symbol: string, _date?: string): Promise<MoneyflowResult | null> {
    try {
      const normalized = this.normalizeSymbol(symbol);
      if (normalized.market === 'a_share') {
        const data = await this.fetchFromPush2(
          `/api/qt/stock/trends2/get?secid=${normalized.prefix}.${normalized.code}&fields=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65`,
        );

        if (data.data && data.data.trends) {
          const latest = data.data.trends[data.data.trends.length - 1];
          const parts = latest.split(',');
          return {
            symbol,
            date: parts[0],
            net_flow: parts.length > 11 ? parseFloat(parts[11]) : 0,
            large_inflow: parts.length > 9 ? parseFloat(parts[9]) : 0,
            large_outflow: parts.length > 10 ? parseFloat(parts[10]) : 0,
            medium_inflow: parts.length > 7 ? parseFloat(parts[7]) : 0,
            medium_outflow: parts.length > 8 ? parseFloat(parts[8]) : 0,
            small_inflow: parts.length > 5 ? parseFloat(parts[5]) : 0,
            small_outflow: parts.length > 6 ? parseFloat(parts[6]) : 0,
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get moneyflow for ${symbol}:`, error.message);
      return null;
    }
  }

  async getMoneyflowTimeline(
    symbol: string,
    _date?: string,
  ): Promise<MoneyflowTimelineResult | null> {
    try {
      const normalized = this.normalizeSymbol(symbol);
      if (normalized.market === 'a_share') {
        const data = await this.fetchFromPush2(
          `/api/qt/stock/trends2/get?secid=${normalized.prefix}.${normalized.code}&fields=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65`,
        );

        if (data.data && data.data.trends) {
          const timeline: MoneyflowTimeline[] = [];
          for (const line of data.data.trends) {
            const parts = line.split(',');
            if (parts.length > 4) {
              timeline.push({
                time: parts[0],
                inflow: parts.length > 3 ? parseFloat(parts[3]) : 0,
                outflow: parts.length > 4 ? parseFloat(parts[4]) : 0,
                net_flow: parts.length > 2 ? parseFloat(parts[2]) : 0,
              });
            }
          }
          return { symbol, timeline };
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get moneyflow timeline for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * 个股资金流 5 档净额（东财 fflow daykline）。
   * 支持 A 股 / 港股，比 trends2 接口更详细（主力/超大/大/中/小 各档）。
   *
   * 返回各档位净流入额（元）：
   *   net_flow   = 主力净流入（超大单+大单，东财 f52）
   *   super_net  = 超大单净流入（f53）
   *   large_net  = 大单净流入（f54）
   *   medium_net = 中单净流入（f55）
   *   small_net  = 小单净流入（f56）
   */
  async getMoneyflowDetail(symbol: string): Promise<{
    date: string;
    net_flow: number;
    super_net: number;
    large_net: number;
    medium_net: number;
    small_net: number;
  } | null> {
    const CACHE_KEY = `mf_detail:${symbol}`;
    const cached = this.CACHE.get(CACHE_KEY);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data as any;
    }

    try {
      const { market, code } = this.normalizeSymbol(symbol);

      let emMarket: string;
      let emCode: string;
      if (market === 'hk') {
        emMarket = '116';
        emCode = code;
      } else if (market === 'a_share') {
        const first = code.charAt(0);
        emMarket = first === '6' || first === '9' ? '1' : '0';
        emCode = code;
      } else {
        return null;
      }

      const data = await this.fetchFromPush2(
        `/api/qt/stock/fflow/daykline/get?lmt=1&klt=101&secid=${emMarket}.${emCode}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56`,
      );

      const klines: string[] = data?.data?.klines ?? [];
      if (klines.length === 0) return null;

      const parts = klines[klines.length - 1].split(',');
      if (parts.length < 6) return null;

      const result = {
        date: parts[0] ?? '',
        net_flow: this.safeFloat(parts[1]),
        super_net: this.safeFloat(parts[2]),
        large_net: this.safeFloat(parts[3]),
        medium_net: this.safeFloat(parts[4]),
        small_net: this.safeFloat(parts[5]),
      };

      this.CACHE.set(CACHE_KEY, { data: result, timestamp: now });
      return result;
    } catch (error) {
      this.logger.debug(`Moneyflow detail unavailable for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * 港股个股资金流（东财 push2 fflow daykline）。
   * secid 港股主板用 116.股票代码（如 116.00700）。
   * 接口只返回各档位「净流入额」，不拆分 inflow/outflow，
   * 所以 MoneyflowResult 里 inflow/outflow 字段填 0。
   *
   * 字段映射：
   *   f52 = 主力净流入 (超大单 + 大单，用户口径的"净流入")
   *   f53 = 超大单净流入
   *   f54 = 大单净流入
   *   f55 = 中单净流入
   *   f56 = 小单净流入
   */
  async getHKMoneyflow(symbol: string): Promise<MoneyflowResult | null> {
    try {
      const normalized = this.normalizeSymbol(symbol);
      if (normalized.market !== 'hk') return null;

      // normalized.code 已带 5 位前导零（如 00700），东财 secid=116.00700 正好匹配
      const code = normalized.code;
      const data = await this.fetchFromPush2(
        `/api/qt/stock/fflow/daykline/get?lmt=1&klt=101&secid=116.${code}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56`,
      );

      const klines: string[] = data?.data?.klines ?? [];
      if (klines.length === 0) return null;

      const parts = klines[klines.length - 1].split(',');
      if (parts.length < 6) return null;

      return {
        symbol,
        date: parts[0] ?? '',
        net_flow: this.safeFloat(parts[1]),
        // 接口只给净额，无 inflow/outflow，填 0
        large_inflow: 0,
        large_outflow: 0,
        medium_inflow: 0,
        medium_outflow: 0,
        small_inflow: 0,
        small_outflow: 0,
      };
    } catch (error) {
      this.logger.debug(`HK moneyflow unavailable for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * 大盘资金流（沪深两市合计，东财 fflow 1分钟累计K线）。
   * 返回当日最新累计值（元）：主力 = 大单 + 超大单。
   */
  async getMarketMoneyFlow(): Promise<{
    time: string;
    mainNetFlow: number;
    smallNetFlow: number;
    mediumNetFlow: number;
    largeNetFlow: number;
    superNetFlow: number;
  } | null> {
    try {
      const data = await this.fetchFromPush2(
        '/api/qt/stock/fflow/kline/get?lmt=0&klt=1&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56&secid=1.000001&secid2=0.399001',
      );
      const klines: string[] = data?.data?.klines ?? [];
      if (klines.length === 0) return null;
      const parts = klines[klines.length - 1].split(',');
      return {
        time: parts[0] ?? '',
        mainNetFlow: parseFloat(parts[1]) || 0,
        smallNetFlow: parseFloat(parts[2]) || 0,
        mediumNetFlow: parseFloat(parts[3]) || 0,
        largeNetFlow: parseFloat(parts[4]) || 0,
        superNetFlow: parseFloat(parts[5]) || 0,
      };
    } catch (e: any) {
      this.logger.error(`Failed to get market money flow: ${e.message}`);
      return null;
    }
  }

  /**
   * 沪深港通资金（东财 datacenter，最近交易日）。
   * 北向(005) 自 2024-08 起净买入停止披露，只有成交额；南向(006) 仍有净买入。
   * 接口金额单位为百万元，统一换算为元。
   */
  async getHsgtFlow(): Promise<{
    north: { dealAmt: number; netDealAmt: number | null; date: string } | null;
    south: { dealAmt: number; netDealAmt: number | null; date: string } | null;
  }> {
    const fetchType = async (type: string) => {
      const resp = await axios.get(
        `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_MUTUAL_DEAL_HISTORY&columns=ALL&filter=(MUTUAL_TYPE%3D%22${type}%22)&sortColumns=TRADE_DATE&sortTypes=-1&pageSize=1`,
        { timeout: 15000 },
      );
      const row = resp.data?.result?.data?.[0];
      if (!row) return null;
      return {
        dealAmt: (row.DEAL_AMT ?? 0) * 1e6,
        netDealAmt: row.NET_DEAL_AMT == null ? null : row.NET_DEAL_AMT * 1e6,
        date: String(row.TRADE_DATE ?? '').slice(0, 10),
      };
    };
    const [north, south] = await Promise.allSettled([fetchType('005'), fetchType('006')]);
    return {
      north: north.status === 'fulfilled' ? north.value : null,
      south: south.status === 'fulfilled' ? south.value : null,
    };
  }

  async getSector(market = 'a_share'): Promise<SectorResult | null> {
    try {
      if (market === 'a_share') {
        const url =
          'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152';
        const response = await axios.get(url, { timeout: 15000 });
        const data = response.data;

        if (data.data && data.data.diff) {
          const sectors = data.data.diff.slice(0, 50).map((item: any) => ({
            name: item.f14 || '',
            change: parseFloat(item.f3) || 0,
            volume: parseInt(item.f5) || 0,
            turnover: parseFloat(item.f6) || 0,
            leading_stock: '',
          }));
          return { market, sectors };
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get sector for ${market}:`, error.message);
      return null;
    }
  }

  async getGainers(market = 'a_share'): Promise<GainersResult | null> {
    try {
      if (market === 'a_share') {
        const indices = await this.fetchMarketDataFromGtimg(['sh000001', 'sz399001', 'sz399006']);

        const result: Record<string, QuoteResult> = {};
        for (const data of indices) {
          if (data.symbol === '000001') {
            result['上证指数'] = data;
          } else if (data.symbol === '399001') {
            result['深证成指'] = data;
          } else if (data.symbol === '399006') {
            result['创业板指'] = data;
          }
        }

        return {
          market,
          gainers: Object.values(result).filter((d) => d.change > 0).length,
          losers: Object.values(result).filter((d) => d.change < 0).length,
          indices: result,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get gainers for ${market}:`, error.message);
      return null;
    }
  }

  async getMarketOverview(): Promise<MarketOverviewResult | null> {
    try {
      const indices = await this.fetchMarketDataFromGtimg([
        'sh000001',
        'sz399001',
        'sz399006',
        'hk00001',
        'us^GSPC',
        'us^IXIC',
        'us^DJI',
      ]);

      const result: MarketOverviewResult = {};
      for (const data of indices) {
        result[data.name] = {
          price: data.current_price,
          change: data.change,
          change_percent: data.change_percent,
        };
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get market overview:`, error.message);
      return null;
    }
  }

  async getFinancial(symbol: string, reportType = 'income'): Promise<FinancialResult | null> {
    try {
      const normalized = this.normalizeSymbol(symbol);
      if (normalized.market === 'a_share') {
        return {
          symbol,
          type: reportType,
          data: [],
        };
      } else {
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to get financial for ${symbol}:`, error.message);
      return null;
    }
  }
}

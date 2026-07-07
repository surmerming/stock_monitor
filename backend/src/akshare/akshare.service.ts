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
  market_cap?: number;
  pe_ratio?: number;
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
  market: 'a_share' | 'hk' | 'us';
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
    try {
      return parseFloat(val);
    } catch {
      return defaultVal;
    }
  }

  private safeInt(val: any, defaultVal = 0): number {
    try {
      return Math.round(parseFloat(val));
    } catch {
      return defaultVal;
    }
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
      if (code.length < 5) {
        code = code.padStart(5, '0');
      }
      return { market: 'hk', code, prefix: 'hk' };
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
      if (code.length < 5) {
        code = code.padStart(5, '0');
      }
      return { market: 'hk', code, prefix: 'hk' };
    }
    if (s.length === 6) {
      return { market: 'a_share', code: s, prefix: 'sh' };
    }
    if (s.length === 5 && /^\d+$/.test(s)) {
      return { market: 'hk', code: s, prefix: 'hk' };
    }
    if (s.length === 4 && /^\d+$/.test(s)) {
      return { market: 'hk', code: s.padStart(5, '0'), prefix: 'hk' };
    }
    return { market: 'us', code: s, prefix: 'us' };
  }

  private parseGtimgData(line: string): QuoteResult | null {
    if (!line || !line.includes('=')) {
      return null;
    }
    try {
      const parts = line.split('=')[1].trim().replace(/^"|"$/g, '');
      const data = parts.split('~');
      if (data.length < 50) {
        return null;
      }

      let turnover = 0.0;
      if (data[35] && data[35].includes('/')) {
        const parts35 = data[35].split('/');
        if (parts35.length >= 3) {
          turnover = this.safeFloat(parts35[2]);
        }
      }

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

      if (data[45]) {
        result.market_cap = this.safeFloat(data[45]) * 100000000;
      }
      if (data[46]) {
        result.pe_ratio = this.safeFloat(data[46]);
      }

      return result;
    } catch (e: any) {
      this.logger.error(`Parse gtimg data failed: ${e}`);
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
      const data = this.parseGtimgData(text);
      return data;
    } catch (e: any) {
      this.logger.error(`Fetch from gtimg failed: ${e}`);
      return null;
    }
  }

  private async fetchMarketDataFromGtimg(symbols: string[]): Promise<QuoteResult[]> {
    try {
      const url = `http://qt.gtimg.cn/q=${symbols.join(',')}`;
      const text = await this.fetchFromGtimg(url);
      const lines = text.trim().split('\n');
      const results: QuoteResult[] = [];
      for (const line of lines) {
        const data = this.parseGtimgData(line);
        if (data) {
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
      const data = await this.fetchQuoteFromGtimg(normalized.code, normalized.prefix);
      if (data) {
        data.market =
          normalized.market === 'a_share' ? 'A股' : normalized.market === 'hk' ? '港股' : '美股';
        data.currency =
          normalized.market === 'a_share' ? 'CNY' : normalized.market === 'hk' ? 'HKD' : 'USD';
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

  async getQuotesBatch(
    symbols: string[],
  ): Promise<{ symbol: string; data: QuoteResult | null; error: string | null }[]> {
    const grouped: {
      a_share: { symbol: string; code: string; prefix: string }[];
      hk: { symbol: string; code: string; prefix: string }[];
      us: { symbol: string; code: string; prefix: string }[];
    } = {
      a_share: [],
      hk: [],
      us: [],
    };

    for (const symbol of symbols) {
      try {
        const normalized = this.normalizeSymbol(symbol);
        grouped[normalized.market].push({
          symbol,
          code: normalized.code,
          prefix: normalized.prefix,
        });
      } catch {}
    }

    const results: Record<string, QuoteResult> = {};
    const errors: Record<string, string> = {};

    for (const [market, items] of Object.entries(grouped)) {
      if (!items.length) continue;

      try {
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
            const cachedData = dfMap.get(item.code) as QuoteResult;
            if (cachedData) {
              const data: QuoteResult = {
                ...cachedData,
                market: market === 'a_share' ? 'A股' : market === 'hk' ? '港股' : '美股',
                currency: market === 'a_share' ? 'CNY' : market === 'hk' ? 'HKD' : 'USD',
                symbol: item.symbol,
              };
              this.setCache(`quote_${item.symbol}`, data);
              results[item.symbol] = data;
            } else {
              const singleData = await this.fetchQuoteFromGtimg(item.code, item.prefix);
              if (singleData) {
                singleData.market =
                  market === 'a_share' ? 'A股' : market === 'hk' ? '港股' : '美股';
                singleData.currency =
                  market === 'a_share' ? 'CNY' : market === 'hk' ? 'HKD' : 'USD';
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
              singleData.market = market === 'a_share' ? 'A股' : market === 'hk' ? '港股' : '美股';
              singleData.currency = market === 'a_share' ? 'CNY' : market === 'hk' ? 'HKD' : 'USD';
              singleData.symbol = item.symbol;
              this.setCache(`quote_${item.symbol}`, singleData);
              results[item.symbol] = singleData;
            } else {
              errors[item.symbol] = 'Market data unavailable';
            }
          }
        }
      } catch (e: any) {
        for (const item of items) {
          errors[item.symbol] = (e as Error).message;
        }
      }
    }

    return symbols.map((symbol) => ({
      symbol,
      data: results[symbol] || null,
      error: errors[symbol] || null,
    }));
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

      return { symbol, quotes: [] };
    } catch (error) {
      this.logger.error(`Failed to get chart for ${symbol}:`, error.message);
      return null;
    }
  }

  async getMoneyflow(symbol: string, _date?: string): Promise<MoneyflowResult | null> {
    try {
      const normalized = this.normalizeSymbol(symbol);
      if (normalized.market === 'a_share') {
        const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${normalized.prefix}.${normalized.code}&fields=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65`;
        const response = await axios.get(url, { timeout: 15000 });
        const data = response.data;

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
        const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${normalized.prefix}.${normalized.code}&fields=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65`;
        const response = await axios.get(url, { timeout: 15000 });
        const data = response.data;

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

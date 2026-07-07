import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

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

@Injectable()
export class AkShareService {
  private readonly logger = new Logger(AkShareService.name);
  private readonly baseUrl = 'http://localhost:5002';

  async getQuote(symbol: string): Promise<QuoteResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: { symbol },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get quote for ${symbol}:`, error.message);
      return null;
    }
  }

  async getQuotesBatch(symbols: string[]): Promise<{ symbol: string; data: QuoteResult | null; error: string | null }[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/quotes`, { symbols }, { timeout: 30000 });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get quotes batch:`, error.message);
      return symbols.map(symbol => ({ symbol, data: null, error: error.message }));
    }
  }

  async getChart(
    symbol: string,
    period: string = 'daily',
    startDate?: string,
    endDate?: string,
  ): Promise<ChartResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/chart`, {
        params: { symbol, period, start_date: startDate, end_date: endDate },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get chart for ${symbol}:`, error.message);
      return null;
    }
  }

  async getMoneyflow(symbol: string, date?: string): Promise<MoneyflowResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/moneyflow`, {
        params: { symbol, date },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get moneyflow for ${symbol}:`, error.message);
      return null;
    }
  }

  async getMoneyflowTimeline(symbol: string, date?: string): Promise<MoneyflowTimelineResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/moneyflow_timeline`, {
        params: { symbol, date },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get moneyflow timeline for ${symbol}:`, error.message);
      return null;
    }
  }

  async getSector(market: string = 'a_share'): Promise<SectorResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/sector`, {
        params: { market },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get sector for ${market}:`, error.message);
      return null;
    }
  }

  async getGainers(market: string = 'a_share'): Promise<GainersResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/gainers`, {
        params: { market },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get gainers for ${market}:`, error.message);
      return null;
    }
  }

  async getMarketOverview(): Promise<MarketOverviewResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/market_overview`, {
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get market overview:`, error.message);
      return null;
    }
  }

  async getFinancial(symbol: string, reportType: string = 'income'): Promise<FinancialResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/financial`, {
        params: { symbol, type: reportType },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get financial for ${symbol}:`, error.message);
      return null;
    }
  }
}
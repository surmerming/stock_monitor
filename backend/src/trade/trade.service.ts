import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from './trade.entity';

export interface HoldingSummary {
  symbol: string;
  stockName: string;
  remainingQuantity: number;
  averageCost: number;
  totalCost: number;
}

export interface BuyLot {
  id: number;
  symbol: string;
  stockName: string;
  price: number;
  quantity: number;
  remaining: number;
  tradeTime: string;
  takeProfit: number | null;
  stopLoss: number | null;
  notes: string;
}

export interface LotBreakdown {
  symbol: string;
  stockName: string;
  lots: BuyLot[];
}

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  avgPnlPercent: number;
  totalPnl: number;
  maxWin: number;
  maxLoss: number;
}

export interface TradeFilter {
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class TradeService {
  constructor(
    @InjectRepository(Trade)
    private readonly repo: Repository<Trade>,
  ) {}

  async findAll(userId: number, filter?: TradeFilter): Promise<Trade[]> {
    let query = this.repo.createQueryBuilder('trade').where('trade.userId = :userId', { userId });

    if (filter?.keyword) {
      const keyword = `%${filter.keyword.toUpperCase()}%`;
      const keywordLower = `%${filter.keyword}%`;
      query = query.andWhere('(trade.symbol LIKE :keyword OR trade.stockName LIKE :keywordLower)', {
        keyword,
        keywordLower,
      });
    }

    if (filter?.startDate && filter?.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.andWhere('trade.tradeTime BETWEEN :startDate AND :endDate', {
        startDate: new Date(filter.startDate),
        endDate,
      });
    } else if (filter?.startDate) {
      query = query.andWhere('trade.tradeTime >= :startDate', {
        startDate: new Date(filter.startDate),
      });
    } else if (filter?.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.andWhere('trade.tradeTime < :endDate', { endDate });
    }

    return query.orderBy('trade.tradeTime', 'DESC').getMany();
  }

  async create(userId: number, data: Partial<Trade>): Promise<Trade> {
    const trade = this.repo.create({
      ...data,
      userId,
    });
    return this.repo.save(trade);
  }

  async update(userId: number, id: number, data: Partial<Trade>): Promise<Trade | null> {
    const trade = await this.repo.findOneBy({ id, userId });
    if (!trade) return null;
    Object.assign(trade, data);
    return this.repo.save(trade);
  }

  async remove(userId: number, id: number): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  async getStats(userId: number, filter?: TradeFilter): Promise<TradeStats> {
    let query = this.repo.createQueryBuilder('trade').where('trade.userId = :userId', { userId });

    if (filter?.keyword) {
      const keyword = `%${filter.keyword.toUpperCase()}%`;
      const keywordLower = `%${filter.keyword}%`;
      query = query.andWhere('(trade.symbol LIKE :keyword OR trade.stockName LIKE :keywordLower)', {
        keyword,
        keywordLower,
      });
    }

    if (filter?.startDate && filter?.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.andWhere('trade.tradeTime BETWEEN :startDate AND :endDate', {
        startDate: new Date(filter.startDate),
        endDate,
      });
    } else if (filter?.startDate) {
      query = query.andWhere('trade.tradeTime >= :startDate', {
        startDate: new Date(filter.startDate),
      });
    } else if (filter?.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.andWhere('trade.tradeTime < :endDate', { endDate });
    }

    const trades = await query.orderBy('trade.tradeTime', 'ASC').getMany();

    if (trades.length === 0) {
      return { totalTrades: 0, winRate: 0, avgPnlPercent: 0, totalPnl: 0, maxWin: 0, maxLoss: 0 };
    }

    const grouped = new Map<string, Trade[]>();
    for (const t of trades) {
      const list = grouped.get(t.symbol) || [];
      list.push(t);
      grouped.set(t.symbol, list);
    }

    let wins = 0;
    let closedTrades = 0;
    let totalPnl = 0;
    let maxWin = 0;
    let maxLoss = 0;
    const pnlPercents: number[] = [];

    for (const [, symbolTrades] of grouped) {
      // 按实际持仓数量做 FIFO 匹配，支持一笔卖出跨多笔买入
      const buys: { price: number; remaining: number }[] = [];
      for (const t of symbolTrades) {
        if (t.direction === 'BUY') {
          buys.push({ price: Number(t.price), remaining: Number(t.quantity) });
        } else if (t.direction === 'SELL') {
          let sellQty = Number(t.quantity);
          const sellPrice = Number(t.price);
          while (sellQty > 0 && buys.length > 0) {
            const buy = buys[0];
            const matched = Math.min(sellQty, buy.remaining);
            const pnl = (sellPrice - buy.price) * matched;
            const pnlPct = buy.price > 0 ? ((sellPrice - buy.price) / buy.price) * 100 : 0;

            totalPnl += pnl;
            pnlPercents.push(pnlPct);
            closedTrades++;

            if (pnl > 0) wins++;
            if (pnl > maxWin) maxWin = pnl;
            if (pnl < maxLoss) maxLoss = pnl;

            sellQty -= matched;
            buy.remaining -= matched;
            if (buy.remaining === 0) {
              buys.shift();
            }
          }
        }
      }
    }

    const winRate = closedTrades > 0 ? wins / closedTrades : 0;
    const avgPnlPercent =
      pnlPercents.length > 0 ? pnlPercents.reduce((s, v) => s + v, 0) / pnlPercents.length : 0;

    return {
      totalTrades: trades.length,
      winRate,
      avgPnlPercent,
      totalPnl,
      maxWin,
      maxLoss,
    };
  }

  async getHoldings(userId: number, keyword?: string): Promise<HoldingSummary[]> {
    let query = this.repo.createQueryBuilder('trade').where('trade.userId = :userId', { userId });

    if (keyword) {
      const kw = `%${keyword.toUpperCase()}%`;
      const kwLower = `%${keyword}%`;
      query = query.andWhere('(trade.symbol LIKE :kw OR trade.stockName LIKE :kwLower)', {
        kw,
        kwLower,
      });
    }

    const trades = await query.orderBy('trade.tradeTime', 'ASC').getMany();

    // 按 symbol 分组 + FIFO 精确计算持仓
    const groupedTrades = new Map<string, { trades: Trade[]; stockName: string }>();
    for (const t of trades) {
      const entry = groupedTrades.get(t.symbol) || { trades: [], stockName: t.stockName || '' };
      entry.trades.push(t);
      if (t.stockName) entry.stockName = t.stockName;
      groupedTrades.set(t.symbol, entry);
    }

    const result: HoldingSummary[] = [];

    for (const [symbol, { trades: symbolTrades, stockName }] of groupedTrades) {
      const buys: { price: number; remaining: number }[] = [];
      let totalRemaining = 0;
      let totalCost = 0;

      for (const t of symbolTrades) {
        const price = Number(t.price);
        const qty = Number(t.quantity);
        if (t.direction === 'BUY') {
          buys.push({ price, remaining: qty });
          totalRemaining += qty;
          totalCost += price * qty;
        } else if (t.direction === 'SELL') {
          let sellQty = qty;
          while (sellQty > 0 && buys.length > 0) {
            const head = buys[0];
            const matched = Math.min(sellQty, head.remaining);
            totalCost -= head.price * matched;
            head.remaining -= matched;
            sellQty -= matched;
            if (head.remaining === 0) buys.shift();
          }
          totalRemaining -= qty;
        }
      }

      if (totalRemaining <= 0) continue;

      const avgCost = totalRemaining > 0 ? totalCost / totalRemaining : 0;
      result.push({
        symbol,
        stockName,
        remainingQuantity: totalRemaining,
        averageCost: avgCost,
        totalCost,
      });
    }

    result.sort((a, b) => b.totalCost - a.totalCost);
    return result;
  }

  async getLots(userId: number, symbol: string): Promise<LotBreakdown> {
    const upperSymbol = symbol.toUpperCase();
    const trades = await this.repo
      .createQueryBuilder('trade')
      .where('trade.userId = :userId AND trade.symbol = :symbol', {
        userId,
        symbol: upperSymbol,
      })
      .orderBy('trade.tradeTime', 'ASC')
      .getMany();

    // FIFO: 用带 id 的买入队列追踪每笔剩余
    interface LotWithId {
      id: number;
      symbol: string;
      stockName: string;
      price: number;
      quantity: number;
      remaining: number;
      tradeTime: string;
      takeProfit: number | null;
      stopLoss: number | null;
      notes: string;
    }

    const buyLots: LotWithId[] = [];
    for (const t of trades) {
      const price = Number(t.price);
      const qty = Number(t.quantity);
      if (t.direction === 'BUY') {
        buyLots.push({
          id: t.id,
          symbol: t.symbol,
          stockName: t.stockName || '',
          price,
          quantity: qty,
          remaining: qty,
          tradeTime: t.tradeTime instanceof Date ? t.tradeTime.toISOString() : String(t.tradeTime),
          takeProfit: t.takeProfit != null ? Number(t.takeProfit) : null,
          stopLoss: t.stopLoss != null ? Number(t.stopLoss) : null,
          notes: t.notes || '',
        });
      } else if (t.direction === 'SELL') {
        let sellQty = qty;
        while (sellQty > 0 && buyLots.length > 0) {
          const head = buyLots[0];
          const matched = Math.min(sellQty, head.remaining);
          head.remaining -= matched;
          sellQty -= matched;
          if (head.remaining === 0) buyLots.shift();
        }
      }
    }

    const lots = buyLots
      .filter((l) => l.remaining > 0)
      .map((l) => ({
        id: l.id,
        symbol: l.symbol,
        stockName: l.stockName,
        price: l.price,
        quantity: l.quantity,
        remaining: l.remaining,
        tradeTime: l.tradeTime,
        takeProfit: l.takeProfit,
        stopLoss: l.stopLoss,
        notes: l.notes,
      }))
      .sort((a, b) => new Date(b.tradeTime).getTime() - new Date(a.tradeTime).getTime());

    return {
      symbol: upperSymbol,
      stockName: trades.find((t) => t.stockName)?.stockName || upperSymbol,
      lots,
    };
  }
}

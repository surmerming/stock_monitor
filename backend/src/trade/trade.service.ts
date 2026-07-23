import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Between, MoreThanOrEqual, LessThan, Repository } from 'typeorm';
import { Trade } from './trade.entity';

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
      query = query.andWhere(
        '(trade.symbol LIKE :keyword OR trade.stockName LIKE :keywordLower)',
        { keyword, keywordLower },
      );
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
      const buys: Trade[] = [];
      for (const t of symbolTrades) {
        if (t.direction === 'BUY') {
          buys.push(t);
        } else if (t.direction === 'SELL' && buys.length > 0) {
          const buy = buys.shift()!;
          const pnl = (Number(t.price) - Number(buy.price)) * Math.min(t.quantity, buy.quantity);
          const pnlPct =
            Number(buy.price) > 0
              ? ((Number(t.price) - Number(buy.price)) / Number(buy.price)) * 100
              : 0;

          totalPnl += pnl;
          pnlPercents.push(pnlPct);
          closedTrades++;

          if (pnl > 0) wins++;
          if (pnl > maxWin) maxWin = pnl;
          if (pnl < maxLoss) maxLoss = pnl;
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
}

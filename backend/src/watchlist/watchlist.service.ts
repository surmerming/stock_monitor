import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchlistItem } from './watchlist.entity';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistItem)
    private readonly repo: Repository<WatchlistItem>,
  ) {}

  findAll(): Promise<WatchlistItem[]> {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  async add(symbol: string, name?: string, market?: string): Promise<WatchlistItem> {
    const upper = symbol.toUpperCase();
    const existing = await this.repo.findOneBy({ symbol: upper });
    if (existing) {
      if (name) existing.name = name;
      if (market) existing.market = market;
      return this.repo.save(existing);
    }
    return this.repo.save(
      this.repo.create({
        symbol: upper,
        name: name || '',
        market: market || '',
      }),
    );
  }

  async addBatch(
    items: { symbol: string; name?: string; market?: string }[],
  ): Promise<WatchlistItem[]> {
    const results: WatchlistItem[] = [];
    for (const item of items) {
      results.push(await this.add(item.symbol, item.name, item.market));
    }
    return results;
  }

  async remove(symbol: string): Promise<boolean> {
    const result = await this.repo.delete({ symbol: symbol.toUpperCase() });
    return result.affected > 0;
  }

  async updateNameAndMarket(symbol: string, name: string, market: string) {
    await this.repo.update({ symbol: symbol.toUpperCase() }, { name, market });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewNote } from './review-note.entity';

@Injectable()
export class ReviewNoteService {
  constructor(
    @InjectRepository(ReviewNote)
    private readonly repo: Repository<ReviewNote>,
  ) {}

  async findAll(userId: number): Promise<ReviewNote[]> {
    return this.repo.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }

  async findByDate(userId: number, date: string): Promise<ReviewNote | null> {
    return this.repo.findOneBy({ userId, date });
  }

  async create(userId: number, data: Partial<ReviewNote>): Promise<ReviewNote> {
    const existing = await this.repo.findOneBy({ userId, date: data.date });
    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }
    const note = this.repo.create({ ...data, userId });
    return this.repo.save(note);
  }

  async update(userId: number, id: number, data: Partial<ReviewNote>): Promise<ReviewNote | null> {
    const note = await this.repo.findOneBy({ id, userId });
    if (!note) return null;
    Object.assign(note, data);
    return this.repo.save(note);
  }

  async remove(userId: number, id: number): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('watchlist')
export class WatchlistItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  symbol: string;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ length: 10, default: '' })
  market: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

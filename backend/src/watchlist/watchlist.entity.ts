import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('watchlist')
@Index('IDX_watchlist_user_symbol', ['userId', 'symbol'], { unique: true })
export class WatchlistItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 20 })
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

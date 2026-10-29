import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('trades')
@Index('IDX_trades_user', ['userId'])
@Index('IDX_trades_user_symbol', ['userId', 'symbol'])
export class Trade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 20 })
  symbol: string;

  @Column({ length: 50, nullable: true })
  stockName: string;

  @Column({ length: 10 })
  direction: string;

  @Column('decimal', { precision: 12, scale: 4 })
  price: number;

  @Column()
  quantity: number;

  @Column({ type: 'datetime' })
  tradeTime: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  takeProfit: number | null;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  stopLoss: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

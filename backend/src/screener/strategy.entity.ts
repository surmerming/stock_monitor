import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('screener_strategies')
export class ScreenerStrategy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, default: '全部' })
  market: string;

  @Column('json')
  filters: any;

  @Column({ length: 50, default: 'marketCap' })
  sortField: string;

  @Column({ length: 10, default: 'DESC' })
  sortType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

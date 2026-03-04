import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('alert_history')
export class AlertHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ruleId: number;

  @Column({ length: 20 })
  symbol: string;

  @Column({ length: 30 })
  type: string;

  @Column({ length: 500 })
  message: string;

  @Column('json', { nullable: true })
  quoteSnapshot: any;

  @CreateDateColumn()
  triggeredAt: Date;

  @Column({ default: false })
  read: boolean;
}

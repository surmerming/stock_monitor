import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  symbol: string;

  @Column({ length: 30 })
  type: string;

  @Column('decimal', { precision: 20, scale: 4 })
  threshold: number;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: false })
  triggered: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastTriggeredAt: Date | null;

  @Column({ default: 30 })
  cooldownMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 每日复盘生成的 HTML 报告。
 * - 一份报告 = 一个 (userId, date) 组合；更新即覆盖。
 * - meta 用于存放生成时间、来源 runner、模型等附加信息。
 */
@Entity('daily_reviews')
@Index('IDX_dr_user', ['userId'])
@Index('IDX_dr_user_date', ['userId', 'date'], { unique: true })
export class DailyReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 10 })
  date: string;

  @Column({ length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'json', nullable: true })
  meta: {
    source?: 'runner' | 'manual' | 'migration';
    runnerCommand?: string;
    generatedAt?: string;
    fileSize?: number;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

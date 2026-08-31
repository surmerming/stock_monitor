import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 每次「运行每日复盘」的执行记录。
 * - status: pending=已触发等待执行；running=runner 脚本已开始；completed=HTML 已写入 daily_reviews；failed=执行出错
 * - dailyReviewId: 成功后回填对应的报告 id
 */
@Entity('daily_review_runs')
@Index('IDX_drr_user', ['userId'])
@Index('IDX_drr_user_date', ['userId', 'date'])
@Index('IDX_drr_status', ['status'])
export class DailyReviewRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 10 })
  date: string;

  @Column({ length: 20, default: 'pending' })
  status: RunStatus;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'int', nullable: true })
  dailyReviewId: number | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

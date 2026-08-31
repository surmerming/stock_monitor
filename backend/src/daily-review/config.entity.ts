import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 每日复盘相关配置（key-value 形式存储两份 markdown 模板）。
 * - key='daily_review_prompt'  -> 每日复盘.md（WorkBuddy 执行的 skill 内容）
 * - key='holdings'             -> 我的持仓.md（持仓清单）
 */
@Entity('daily_review_configs')
@Index('IDX_drc_user', ['userId'])
@Index('IDX_drc_user_key', ['userId', 'key'], { unique: true })
export class DailyReviewConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 64 })
  key: string;

  @Column({ type: 'longtext' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

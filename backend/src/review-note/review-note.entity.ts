import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('review_notes')
@Index('IDX_review_notes_user', ['userId'])
@Index('IDX_review_notes_user_date', ['userId', 'date'], { unique: true })
export class ReviewNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 10 })
  date: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 3 })
  sentimentScore: number;

  @Column({ type: 'text', nullable: true })
  plan: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface CommentAttachment {
  url: string;
  name: string;
  size: number;
  mime: string;
  kind: 'image' | 'markdown' | 'pdf' | 'html' | 'other';
}

/**
 * 个股互动评论。
 * - content 为文字内容（可为空，此时必须有附件）
 * - attachments 为附件列表（图片 / markdown / pdf / html / 其它文件）
 */
@Entity('stock_comments')
@Index('IDX_sc_symbol', ['symbol'])
@Index('IDX_sc_user', ['userId'])
export class StockComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  symbol: string;

  @Column()
  userId: number;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'json', nullable: true })
  attachments: CommentAttachment[] | null;

  @CreateDateColumn()
  createdAt: Date;
}

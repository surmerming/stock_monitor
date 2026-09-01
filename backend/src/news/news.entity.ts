import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('news_articles')
@Index('IDX_news_docid', ['docId'], { unique: true })
@Index('IDX_news_category_publish', ['category', 'publishTime'])
export class NewsArticle {
  @PrimaryGeneratedColumn()
  id: number;

  /** 来源文档 ID（如新浪 docid，用于去重） */
  @Column({ length: 64 })
  docId: string;

  /** 分类：headline=要闻, stock=股票, market=市场, company=公司, world=环球, default=综合 */
  @Column({ length: 32, default: 'default' })
  category: string;

  /** 新闻标题 */
  @Column({ length: 500 })
  title: string;

  /** 原始 PC 端 URL */
  @Column({ length: 1024 })
  url: string;

  /** 移动端 URL */
  @Column({ length: 1024, nullable: true })
  wapUrl: string;

  /** 来源媒体名称 */
  @Column({ length: 128, nullable: true })
  source: string;

  /** 作者 */
  @Column({ length: 128, nullable: true })
  author: string;

  /** 发布时间戳（秒） */
  @Column({ type: 'bigint', default: 0 })
  publishTime: number;

  /** 摘要（列表接口提供的 intro / wapsummary） */
  @Column({ type: 'text', nullable: true })
  summary: string;

  /** 正文内容（按需爬取后存储） */
  @Column({ type: 'mediumtext', nullable: true })
  content: string;

  /** 首图 URL */
  @Column({ length: 1024, nullable: true })
  topImage: string;

  /** 所有配图 JSON */
  @Column({ type: 'json', nullable: true })
  images: string[];

  /** 关键词 JSON */
  @Column({ type: 'json', nullable: true })
  keywords: string[];

  /** 正文最后一次成功爬取时间（毫秒） */
  @Column({ type: 'bigint', default: 0 })
  contentCrawledAt: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

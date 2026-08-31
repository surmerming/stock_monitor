import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, extname, basename } from 'path';
import { randomBytes } from 'crypto';
import { StockComment, CommentAttachment } from './comment.entity';
import { User } from '../auth/user.entity';

const ATTACHMENT_DIR = resolve(process.cwd(), '..', 'comment_attachments');
const ATTACHMENT_PREFIX = '/comment_attachments';

export interface CommentDTO {
  id: number;
  userId: number;
  userName: string;
  content: string | null;
  attachments: CommentAttachment[];
  createdAt: Date;
}

function classify(mime: string, name: string): CommentAttachment['kind'] {
  const ext = extname(name || '').toLowerCase();
  if (mime?.startsWith('image/')) return 'image';
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  if (mime === 'application/pdf' || ext === '.pdf') return 'pdf';
  if (ext === '.html' || ext === '.htm' || mime === 'text/html') return 'html';
  return 'other';
}

/**
 * 修复 multer/busboy 将 UTF-8 文件名按 latin1 解码导致的乱码。
 * 典型特征：中文字符变成 3 个 latin 扩展字符，按 latin1 还原字节后再按 UTF-8 解码即可恢复。
 */
function fixFileName(name: string): string {
  if (!name || /[^\u0000-\u00FF]/.test(name)) return name; // 已正确解码，无需处理
  const bytes = Buffer.from(name, 'latin1');
  const fixed = bytes.toString('utf8');
  if (fixed === name || fixed.includes('\uFFFD') || fixed.length >= name.length) {
    return name;
  }
  return fixed;
}

@Injectable()
export class StockCommentService {
  constructor(
    @InjectRepository(StockComment)
    private readonly repo: Repository<StockComment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private toDTO(row: StockComment, userMap: Map<number, User>): CommentDTO {
    return {
      id: row.id,
      userId: row.userId,
      userName:
        userMap.get(row.userId)?.displayName || userMap.get(row.userId)?.username || '未知用户',
      content: row.content,
      attachments: row.attachments || [],
      createdAt: row.createdAt,
    };
  }

  async list(symbol: string): Promise<CommentDTO[]> {
    const sym = symbol.toUpperCase();
    const rows = await this.repo.find({
      where: { symbol: sym },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 200,
    });
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = userIds.length ? await this.userRepo.find({ where: { id: In(userIds) } }) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => this.toDTO(r, userMap));
  }

  async create(
    userId: number,
    symbol: string,
    content: string | undefined,
    files: Express.Multer.File[],
  ): Promise<CommentDTO> {
    const attachments: CommentAttachment[] = [];

    if (files.length > 0) {
      if (!existsSync(ATTACHMENT_DIR)) {
        mkdirSync(ATTACHMENT_DIR, { recursive: true });
      }
      for (const f of files) {
        const originalName = fixFileName(f.originalname || '');
        const ext = extname(originalName);
        const fname = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;
        writeFileSync(resolve(ATTACHMENT_DIR, fname), f.buffer);
        attachments.push({
          url: `${ATTACHMENT_PREFIX}/${fname}`,
          name: originalName,
          size: f.size,
          mime: f.mimetype || '',
          kind: classify(f.mimetype, originalName),
        });
      }
    }

    const row = await this.repo.save(
      this.repo.create({
        symbol: symbol.toUpperCase(),
        userId,
        content: content?.trim() ? content.trim() : null,
        attachments: attachments.length ? attachments : null,
      }),
    );

    const user = await this.userRepo.findOneBy({ id: userId });
    return this.toDTO(row, new Map(user ? [user].map((u) => [u.id, u]) : []));
  }

  async remove(userId: number, id: number): Promise<boolean> {
    const row = await this.repo.findOneBy({ id });
    if (!row) return false;
    if (row.userId !== userId) {
      throw new ForbiddenException('只能删除自己的评论');
    }
    // 同步清理磁盘上的附件文件
    for (const a of row.attachments || []) {
      const p = resolve(ATTACHMENT_DIR, basename(a.url));
      if (p.startsWith(ATTACHMENT_DIR) && existsSync(p)) {
        unlinkSync(p);
      }
    }
    await this.repo.delete({ id });
    return true;
  }
}

/**
 * 一次性迁移脚本：从 daily_review/ 目录导入历史 HTML 报告和 2 个 .md 配置到 MySQL。
 *
 * 用法：
 *   cd backend && npx ts-node ../scripts/migrate-daily-reviews.ts
 *
 * 默认数据库配置与 backend/src/app.module.ts 保持一致：
 *   host=localhost port=3306 user=root pass=123456 db=stock_monitor
 *
 * 可通过环境变量覆盖：
 *   DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME / ADMIN_USER_ID
 */
import 'reflect-metadata';
import { createConnection, Repository } from 'typeorm';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { DailyReviewConfig } from '../backend/src/daily-review/config.entity';
import { DailyReview } from '../backend/src/daily-review/review.entity';

const PROJECT_ROOT = resolve(__dirname, '..');
const DAILY_REVIEW_DIR = resolve(PROJECT_ROOT, 'daily_review');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '123456';
const DB_NAME = process.env.DB_NAME || 'stock_monitor';
const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '1', 10);

interface ImportResult {
  htmlImported: number;
  htmlSkipped: number;
  configsImported: number;
}

async function main(): Promise<void> {
  if (!existsSync(DAILY_REVIEW_DIR)) {
    console.error(`❌ daily_review/ 目录不存在：${DAILY_REVIEW_DIR}`);
    process.exit(1);
  }

  console.log(`🔌 连接 MySQL ${DB_HOST}:${DB_PORT}/${DB_NAME} ...`);
  const conn = await createConnection({
    type: 'mysql',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [DailyReviewConfig, DailyReview],
    synchronize: false,
    charset: 'utf8mb4',
  });

  const configRepo: Repository<DailyReviewConfig> = conn.getRepository(DailyReviewConfig);
  const reviewRepo: Repository<DailyReview> = conn.getRepository(DailyReview);

  const result: ImportResult = {
    htmlImported: 0,
    htmlSkipped: 0,
    configsImported: 0,
  };

  // ===== 1. 导入每日复盘-YYYYMMDD.html =====
  const files = readdirSync(DAILY_REVIEW_DIR).filter(
    (f) => f.startsWith('每日复盘-') && f.endsWith('.html'),
  );
  console.log(`📁 发现 ${files.length} 份 HTML 报告`);

  for (const f of files) {
    const match = f.match(/每日复盘-(\d{4})(\d{2})(\d{2})\.html$/);
    if (!match) {
      console.warn(`  ⚠️  跳过无法解析日期的文件：${f}`);
      result.htmlSkipped++;
      continue;
    }
    const date = `${match[1]}-${match[2]}-${match[3]}`;
    const content = readFileSync(resolve(DAILY_REVIEW_DIR, f), 'utf8');
    const existing = await reviewRepo.findOne({
      where: { userId: ADMIN_USER_ID, date },
    });
    if (existing) {
      console.log(`  ⏭️  ${date} 已存在（id=${existing.id}），跳过`);
      result.htmlSkipped++;
      continue;
    }
    const row = reviewRepo.create({
      userId: ADMIN_USER_ID,
      date,
      title: `每日复盘-${match[1]}${match[2]}${match[3]}`,
      content,
      meta: {
        source: 'migration',
        generatedAt: new Date().toISOString(),
        fileSize: content.length,
        originalFileName: f,
      },
    });
    await reviewRepo.save(row);
    console.log(`  ✅ ${date} (${(content.length / 1024).toFixed(1)} KB)`);
    result.htmlImported++;
  }

  // ===== 2. 导入每日复盘.md 与 我的持仓.md =====
  const mdTargets: Array<{ key: string; fileName: string }> = [
    { key: 'daily_review_prompt', fileName: '每日复盘.md' },
    { key: 'holdings', fileName: '我的持仓.md' },
  ];

  for (const t of mdTargets) {
    const path = resolve(DAILY_REVIEW_DIR, t.fileName);
    if (!existsSync(path)) {
      console.warn(`  ⚠️  找不到 ${t.fileName}`);
      continue;
    }
    const content = readFileSync(path, 'utf8');
    let row = await configRepo.findOne({
      where: { userId: ADMIN_USER_ID, key: t.key },
    });
    if (row) {
      console.log(`  ⏭️  config ${t.key} 已存在（id=${row.id}），跳过`);
      continue;
    }
    row = configRepo.create({
      userId: ADMIN_USER_ID,
      key: t.key,
      content,
    });
    await configRepo.save(row);
    console.log(`  ✅ config ${t.key} (${(content.length / 1024).toFixed(1)} KB)`);
    result.configsImported++;
  }

  console.log('\n📊 迁移完成：');
  console.log(`  HTML 报告：导入 ${result.htmlImported} 份，跳过 ${result.htmlSkipped} 份`);
  console.log(`  .md 配置：导入 ${result.configsImported} 份`);

  await conn.close();
}

main().catch((err) => {
  console.error('❌ 迁移失败：', err);
  process.exit(1);
});

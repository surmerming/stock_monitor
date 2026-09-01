/**
 * 磁盘 → MySQL 单向同步脚本：把 daily_review/每日复盘-YYYYMMDD.html 的最新内容写回数据库。
 *
 * 为什么需要它：
 *   应用在「复盘日历」里读的是 MySQL（磁盘文件只是 fallback）。如果某份报告在磁盘上被
 *   重新生成/修正过（例如修正指数涨跌方向、补美股收盘价），数据库里仍会是旧版本，
 *   用户点开看到的就是过时甚至方向错误的结论。生成完 HTML 后务必跑一次本脚本。
 *
 * 用法：
 *   pnpm sync:daily-review                # 同步所有日期（默认 dry-run 预览）
 *   pnpm sync:daily-review -- --apply     # 真正写入
 *   pnpm sync:daily-review -- --date 2026-08-31 --apply
 *   pnpm sync:daily-review -- --date 2026-08-28,2026-08-31 --apply
 *
 * 环境变量覆盖：DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME / ADMIN_USER_ID
 */
import 'reflect-metadata';
import { createConnection, Repository } from 'typeorm';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { DailyReview } from '../backend/src/daily-review/review.entity';

const PROJECT_ROOT = resolve(__dirname, '..');
const DAILY_REVIEW_DIR = resolve(PROJECT_ROOT, 'daily_review');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '123456';
const DB_NAME = process.env.DB_NAME || 'stock_monitor';
const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '1', 10);

function parseArgs() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const dateArg = (() => {
    const i = argv.indexOf('--date');
    return i >= 0 ? argv[i + 1] : null;
  })();
  const only: string[] | null = dateArg
    ? dateArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
  return { apply, only };
}

async function main(): Promise<void> {
  const { apply, only } = parseArgs();
  if (!existsSync(DAILY_REVIEW_DIR)) {
    console.error(`❌ daily_review/ 目录不存在：${DAILY_REVIEW_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(DAILY_REVIEW_DIR)
    .filter((f) => f.startsWith('每日复盘-') && f.endsWith('.html'))
    .sort();

  console.log(`📁 磁盘发现 ${files.length} 份 HTML 报告`);
  console.log(`🔧 模式：${apply ? '写入（--apply）' : '预演（dry-run，加 --apply 才真正写入）'}\n`);

  const conn = await createConnection({
    type: 'mysql',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [DailyReview],
    synchronize: false,
    charset: 'utf8mb4',
  });
  const repo: Repository<DailyReview> = conn.getRepository(DailyReview);

  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const f of files) {
    const m = f.match(/每日复盘-(\d{4})(\d{2})(\d{2})\.html$/);
    if (!m) continue;
    const date = `${m[1]}-${m[2]}-${m[3]}`;
    if (only && !only.includes(date)) continue;

    const content = readFileSync(resolve(DAILY_REVIEW_DIR, f), 'utf8');
    const existing = await repo.findOne({ where: { userId: ADMIN_USER_ID, date } });

    if (!existing) {
      console.log(`  ➕ ${date} 数据库中不存在${apply ? '，将新增' : '（预演：将新增）'}`);
      if (apply) {
        await repo.save(
          repo.create({
            userId: ADMIN_USER_ID,
            date,
            title: `每日复盘-${m[1]}${m[2]}${m[3]}`,
            content,
            meta: { source: 'sync', generatedAt: new Date().toISOString(), fileSize: content.length },
          }),
        );
        updated++;
      }
      missing++;
      continue;
    }

    // LENGTH 用字节口径对比，与 readFileSync 字符串长度不同，这里统一用字符数判断
    if (existing.content === content) {
      unchanged++;
      continue;
    }

    const delta = content.length - existing.content.length;
    console.log(
      `  🔄 ${date} 磁盘 ${content.length} vs DB ${existing.content.length} 字符 ` +
        `(${delta > 0 ? '+' : ''}${delta})${apply ? ' → 已更新' : ' → 待更新'}`,
    );
    if (apply) {
      existing.content = content;
      existing.title = `每日复盘-${m[1]}${m[2]}${m[3]}`;
      existing.meta = {
        ...(existing.meta || {}),
        source: 'sync',
        syncedAt: new Date().toISOString(),
        fileSize: content.length,
      };
      await repo.save(existing);
      updated++;
    }
  }

  console.log(`\n📊 同步完成：更新/新增 ${updated} 份，无变化 ${unchanged} 份，库缺失 ${missing} 份`);
  if (!apply) console.log('   （dry-run，未写入。确认无误后加 --apply 重跑）');

  await conn.close();
}

main().catch((e) => {
  console.error('❌ 同步失败：', e);
  process.exit(1);
});

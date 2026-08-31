import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { spawn } from 'child_process';
import { existsSync, mkdtempSync, writeFileSync, openSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { DailyReviewConfig } from './config.entity';
import { DailyReview } from './review.entity';
import { DailyReviewRun, RunStatus } from './run.entity';

export interface DailyReviewConfigDto {
  key: string;
  content: string;
  updatedAt: Date;
}

export interface DailyReviewListItem {
  id: number;
  date: string;
  title: string | null;
  updatedAt: Date;
  source: string | null;
  fileSize: number;
}

export interface RunDetail {
  id: number;
  date: string;
  status: RunStatus;
  message: string | null;
  dailyReviewId: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class DailyReviewService {
  private readonly logger = new Logger(DailyReviewService.name);

  constructor(
    @InjectRepository(DailyReviewConfig)
    private readonly configRepo: Repository<DailyReviewConfig>,
    @InjectRepository(DailyReview)
    private readonly reviewRepo: Repository<DailyReview>,
    @InjectRepository(DailyReviewRun)
    private readonly runRepo: Repository<DailyReviewRun>,
    private readonly jwtService: JwtService,
  ) {}

  // ===================== 配置（每日复盘.md / 我的持仓.md） =====================

  async listConfigs(userId: number): Promise<DailyReviewConfigDto[]> {
    const rows = await this.configRepo.find({
      where: { userId },
      order: { key: 'ASC' },
    });
    return rows.map((r) => ({
      key: r.key,
      content: r.content,
      updatedAt: r.updatedAt,
    }));
  }

  async getConfig(userId: number, key: string): Promise<DailyReviewConfigDto | null> {
    const row = await this.configRepo.findOne({ where: { userId, key } });
    if (!row) return null;
    return { key: row.key, content: row.content, updatedAt: row.updatedAt };
  }

  async upsertConfig(userId: number, key: string, content: string): Promise<DailyReviewConfigDto> {
    let row = await this.configRepo.findOne({ where: { userId, key } });
    if (row) {
      row.content = content;
      row = await this.configRepo.save(row);
    } else {
      row = this.configRepo.create({ userId, key, content });
      row = await this.configRepo.save(row);
    }
    return { key: row.key, content: row.content, updatedAt: row.updatedAt };
  }

  // ===================== HTML 报告 =====================

  async listReviews(userId: number): Promise<DailyReviewListItem[]> {
    const rows = await this.reviewRepo.find({
      where: { userId },
      order: { date: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      updatedAt: r.updatedAt,
      source: r.meta?.source ?? null,
      fileSize: r.content?.length ?? 0,
    }));
  }

  async getReviewByDate(userId: number, date: string): Promise<DailyReview | null> {
    return this.reviewRepo.findOne({ where: { userId, date } });
  }

  /**
   * 上传/覆盖某日的 HTML 报告。
   * - 成功后将 dailyReviewId 回填到传入的 runId（若有）
   * - source 默认 'manual'，runner 流程可显式传 'runner'
   */
  async upsertReview(
    userId: number,
    date: string,
    body: { title?: string; content: string; meta?: any; runId?: number },
  ): Promise<DailyReview> {
    let row = await this.reviewRepo.findOne({ where: { userId, date } });
    const meta = {
      source: body.meta?.source ?? 'manual',
      runnerCommand: body.meta?.runnerCommand,
      generatedAt: body.meta?.generatedAt ?? new Date().toISOString(),
      fileSize: body.content.length,
    };
    if (row) {
      row.content = body.content;
      row.title = body.title ?? row.title;
      row.meta = meta;
      row = await this.reviewRepo.save(row);
    } else {
      row = this.reviewRepo.create({
        userId,
        date,
        title: body.title ?? `每日复盘-${date.replace(/-/g, '')}`,
        content: body.content,
        meta,
      });
      row = await this.reviewRepo.save(row);
    }

    if (body.runId) {
      await this.runRepo.update(
        { id: body.runId, userId },
        {
          status: 'completed',
          finishedAt: new Date(),
          dailyReviewId: row.id,
          message: 'HTML 已写入数据库',
        },
      );
    }
    return row;
  }

  async deleteReview(userId: number, id: number): Promise<boolean> {
    const result = await this.reviewRepo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  // ===================== Run =====================

  async listRuns(userId: number, limit = 20): Promise<RunDetail[]> {
    const rows = await this.runRepo.find({
      where: { userId },
      order: { id: 'DESC' },
      take: limit,
    });
    return rows.map((r) => this.toRunDetail(r));
  }

  async getRun(userId: number, id: number): Promise<RunDetail | null> {
    const row = await this.runRepo.findOne({ where: { id, userId } });
    if (!row) return null;
    return this.toRunDetail(row);
  }

  /**
   * 创建一次运行。
   * - 总是返回 runId。
   * - 默认自动调用仓库内 scripts/run-daily-review.sh（可用环境变量 DAILY_REVIEW_RUNNER 覆盖），
   *   并自动签发 1 小时有效的 runner token（无需用户手动配置任何环境变量）。
   *   runner 接收参数：
   *     --run-id=<id> --date=<date> --user-id=<id>
   *     --base-url=<api> --token=<jwt>
   *     --prompt-file=<tmp> --holdings-file=<tmp>
   *   runner 自行调 PUT /api/daily-review/by-date/<date> 把 HTML 写回，
   *   或 POST /api/daily-review/runs/<id>/{start,fail} 同步状态。
   * - runner 脚本缺失时保持 pending，message 提示原因；用户可手动上传 HTML。
   */
  async triggerRun(userId: number, date: string): Promise<RunDetail> {
    const saved = await this.runRepo.save(
      this.runRepo.create({
        userId,
        date,
        status: 'pending',
        message: '已创建运行任务，等待执行',
      }),
    );

    // runner 脚本：默认仓库内 scripts/run-daily-review.sh，可用环境变量覆盖
    const defaultRunner = resolve(process.cwd(), '..', 'scripts', 'run-daily-review.sh');
    const runnerPath = process.env.DAILY_REVIEW_RUNNER || defaultRunner;
    const baseUrl =
      process.env.DAILY_REVIEW_API_BASE ||
      `http://127.0.0.1:${process.env.PORT || 4444}`;

    if (!existsSync(runnerPath)) {
      saved.message = `runner 脚本不存在: ${runnerPath}，保持 pending；可手动上传 HTML`;
      await this.runRepo.save(saved);
      return this.toRunDetail(saved);
    }

    // 自动签发 runner token（1 小时有效，复用同一 JWT_SECRET）
    const runnerToken = this.jwtService.sign(
      { sub: userId, username: 'daily-review-runner', role: 'admin' },
      { expiresIn: '1h' },
    );

    // 准备 prompt/holdings 临时文件供 runner 读取
    let runDir: string;
    try {
      const prompt = (await this.getConfig(userId, 'daily_review_prompt'))?.content ?? '';
      const holdings = (await this.getConfig(userId, 'holdings'))?.content ?? '';
      runDir = mkdtempSync(join(tmpdir(), 'dr-runner-'));
      const promptFile = join(runDir, 'prompt.md');
      const holdingsFile = join(runDir, 'holdings.md');
      const stderrFile = join(runDir, 'stderr.log');
      writeFileSync(promptFile, prompt, 'utf8');
      writeFileSync(holdingsFile, holdings, 'utf8');

      const args = [
        `--run-id=${saved.id}`,
        `--date=${date}`,
        `--user-id=${userId}`,
        `--base-url=${baseUrl}`,
        `--token=${runnerToken}`,
        `--prompt-file=${promptFile}`,
        `--holdings-file=${holdingsFile}`,
      ];

      const child = spawn(runnerPath, args, {
        detached: true,
        stdio: ['ignore', openSync(stderrFile, 'w'), openSync(stderrFile, 'a')],
      });
      child.unref();

      saved.message = `runner 已启动: ${runnerPath} (pid=${child.pid}, 日志: ${stderrFile})`;
      await this.runRepo.save(saved);

      // runner 进程退出后清理临时目录（5 分钟兜底）
      child.on('exit', () => {
        setTimeout(() => {
          try {
            rmSync(runDir, { recursive: true, force: true });
          } catch {
            /* ignore */
          }
        }, 5 * 60 * 1000);
      });
    } catch (err: any) {
      this.logger.error(`triggerRun spawn failed: ${err.message}`);
      saved.status = 'failed';
      saved.finishedAt = new Date();
      saved.message = `runner spawn 失败: ${err.message}`;
      await this.runRepo.save(saved);
    }

    return this.toRunDetail(saved);
  }

  async markRunRunning(userId: number, runId: number): Promise<void> {
    await this.runRepo.update(
      { id: runId, userId },
      { status: 'running', startedAt: new Date(), message: 'runner 正在执行' },
    );
  }

  async markRunFailed(userId: number, runId: number, message: string): Promise<void> {
    await this.runRepo.update(
      { id: runId, userId },
      { status: 'failed', finishedAt: new Date(), message },
    );
  }

  private toRunDetail(r: DailyReviewRun): RunDetail {
    return {
      id: r.id,
      date: r.date,
      status: r.status,
      message: r.message,
      dailyReviewId: r.dailyReviewId,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      createdAt: r.createdAt,
    };
  }
}

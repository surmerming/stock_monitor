import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as iconv from 'iconv-lite';
import { Repository } from 'typeorm';
import { NewsArticle } from './news.entity';

export interface NewsCategory {
  key: string;
  label: string;
  pageid: number;
  lid: number;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  { key: 'all', label: '全部', pageid: 0, lid: 0 }, // 聚合，不走单独接口
  { key: 'headline', label: '财经要闻', pageid: 153, lid: 2516 },
  { key: 'stock', label: '股票滚动', pageid: 153, lid: 2509 },
  { key: 'market', label: '大盘资讯', pageid: 153, lid: 2516 }, // 备用，与要闻同源
  { key: 'world', label: '环球市场', pageid: 153, lid: 2511 },
];

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

interface SinaListItem {
  docid: string;
  title: string;
  intime?: number | string;
  ctime?: number | string;
  url?: string;
  wapurl?: string;
  media_name?: string;
  author?: string;
  summary?: string;
  intro?: string;
  wapsummary?: string;
  img?: string;
  images?: { url: string }[];
  keywords?: string;
  oid?: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    @InjectRepository(NewsArticle)
    private readonly articleRepo: Repository<NewsArticle>,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /** 格式化新浪接口时间 */
  private toTimestamp(t?: number | string): number {
    if (!t) return Math.floor(Date.now() / 1000);
    if (typeof t === 'number') return t;
    // "YYYY/M/D HH:mm:ss"
    const m = String(t).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (m) {
      return Math.floor(new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() / 1000);
    }
    const d = new Date(t);
    if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
    return Math.floor(Date.now() / 1000);
  }

  /** 从新浪滚动接口抓取列表 */
  async fetchListFromSina(
    category: string,
    page: number,
    pageSize: number,
  ): Promise<NewsArticle[]> {
    const cats = NEWS_CATEGORIES.filter(
      (c) => c.pageid > 0 && (category === 'all' || c.key === category),
    );
    const targets = cats.length ? cats : [NEWS_CATEGORIES[1]]; // 默认要闻

    const allItems: SinaListItem[] = [];
    for (const cat of targets) {
      try {
        const url = `https://feed.mix.sina.com.cn/api/roll/get`;
        const { data } = await axios.get(url, {
          params: {
            pageid: cat.pageid,
            lid: cat.lid,
            num: Math.min(pageSize, 50),
            page: Math.max(1, page),
            r: Math.random(),
          },
          headers: { ...DEFAULT_HEADERS, Referer: 'https://finance.sina.com.cn/' },
          timeout: 10000,
        });
        const list: SinaListItem[] = data?.result?.data ?? [];
        list.forEach((item) => {
          (item as any)._category = cat.key;
          allItems.push(item);
        });
      } catch (e) {
        this.logger.warn(`fetchListFromSina cat=${cat.key} failed: ${(e as Error).message}`);
      }
    }

    // 去重并按发布时间倒序
    const seen = new Set<string>();
    const uniq = allItems.filter((it) => {
      if (!it.docid) return false;
      if (seen.has(it.docid)) return false;
      seen.add(it.docid);
      return true;
    });
    uniq.sort((a, b) => this.toTimestamp(b.intime) - this.toTimestamp(a.intime));

    return uniq.map((it) => this.sinaItemToEntity(it));
  }

  private sinaItemToEntity(item: SinaListItem): NewsArticle {
    const article = new NewsArticle();
    article.docId = item.docid;
    article.category = (item as any)._category || 'default';
    article.title = item.title?.trim() || '';
    article.url = item.url || '';
    article.wapUrl = item.wapurl || null;
    article.source = item.media_name || null;
    article.author = item.author || null;
    article.publishTime = this.toTimestamp(item.intime || item.ctime);
    article.summary = (item.wapsummary || item.intro || item.summary || '').trim() || null;
    article.topImage = item.img || item.images?.[0]?.url || null;
    article.images =
      item.images?.map((img) => img.url).filter(Boolean) || (item.img ? [item.img] : null);
    article.keywords =
      item.keywords
        ?.split(',')
        .map((k) => k.trim())
        .filter(Boolean) || null;
    return article;
  }

  /** 按需爬取新闻详情内容，并写入 DB 缓存 */
  async fetchAndCacheContent(id: number): Promise<{ content: string; title: string }> {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) throw new Error('文章不存在');

    // 已有正文，直接返回
    if (article.content && article.content.length > 100 && article.contentCrawledAt > 0) {
      return { content: article.content, title: article.title };
    }

    const { content } = await this.scrapeArticleDetail(article.url);
    if (content && content.length > 50) {
      article.content = content;
      article.contentCrawledAt = Date.now();
      await this.articleRepo.save(article);
    }

    return { content: article.content || content, title: article.title };
  }

  /** 抓取文章详情页 HTML 并提取正文 */
  async scrapeArticleDetail(url: string): Promise<{ content: string; title: string }> {
    if (!url) return { content: '', title: '' };
    try {
      const resp = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: 15000,
        responseType: 'arraybuffer',
      });
      const buf = Buffer.from(resp.data);
      const asUtf8 = buf.toString('utf-8');
      let charset = 'utf-8';
      const cm = asUtf8.match(/<meta[^>]*charset=["']?([^"'>]+)/i);
      if (cm) charset = cm[1].toLowerCase().trim();
      let html: string;
      try {
        html = iconv.decode(buf, charset);
      } catch {
        html = asUtf8;
      }

      // 标题
      const tm = html.match(
        /<h1[^>]*id="artibodyTitle"[^>]*>([\s\S]*?)<\/h1>|<h1[^>]*>([\s\S]*?)<\/h1>/i,
      );
      const title = tm ? (tm[1] || tm[2] || '').replace(/<[^>]+>/g, '').trim() : '';

      // 正文
      const patterns: RegExp[] = [
        /<div[^>]*id="artibody"[^>]*>([\s\S]*?)<\/div>\s*<!--\s*articleEnd/i,
        /<div[^>]*id="artibody"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="article-editor"/i,
        /<div[^>]*id="artibody"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*id="share"/i,
        /<div[^>]*id="artibody"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="bbott"/i,
        /<div[^>]*id="artibody"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="article[^"]*"[^>]*>([\s\S]*?)<div\s+class="blkContainerSblkNews"/i,
        /<article[^>]*>([\s\S]*?)<\/article>/i,
      ];
      let contentHtml = '';
      for (const p of patterns) {
        const m = html.match(p);
        if (m && m[1].length > 300) {
          contentHtml = m[1];
          break;
        }
      }
      if (!contentHtml) {
        for (const p of patterns) {
          const m = html.match(p);
          if (m && m[1].length > 100) {
            contentHtml = m[1];
            break;
          }
        }
      }

      const content = contentHtml
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(
          /<div[^>]*class="[^"]*img_wrapper[^"]*"[^>]*>[\s\S]*?<img[\s\S]*?src="([^"]+)"[\s\S]*?<\/div>/gi,
          (_m, src) => `\n[图片: ${src}]\n`,
        )
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, inner) => `\n${inner.replace(/<[^>]+>/g, '')}\n`)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(
          /<li[^>]*>([\s\S]*?)<\/li>/gi,
          (_m, inner) => `• ${inner.replace(/<[^>]+>/g, '')}\n`,
        )
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&ldquo;/g, '「')
        .replace(/&rdquo;/g, '」')
        .replace(/&lsquo;/g, '「')
        .replace(/&rsquo;/g, '」')
        .replace(/&middot;/g, '·')
        .replace(/&hellip;/g, '…')
        .replace(/&mdash;/g, '—')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#\d+;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/^[\s\u3000]+|[\s\u3000]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return { content, title };
    } catch (e) {
      this.logger.warn(
        `scrapeArticleDetail failed url=${url.slice(0, 80)}: ${(e as Error).message}`,
      );
      return { content: '', title: '' };
    }
  }

  /**
   * Upsert 一批新闻到 DB（按 docId 去重）。
   * 不覆盖已有正文（避免重复抓取被重置）。
   */
  async saveArticlesIfNotExists(items: NewsArticle[]): Promise<number> {
    let inserted = 0;
    for (const item of items) {
      if (!item.docId || !item.title) continue;
      const exists = await this.articleRepo.findOne({
        where: { docId: item.docId },
        select: { id: true, content: true },
      });
      if (exists) continue;
      try {
        await this.articleRepo.save(item);
        inserted++;
      } catch (e) {
        this.logger.verbose(
          `saveArticlesIfNotExists skip docId=${item.docId}: ${(e as Error).message}`,
        );
      }
    }
    return inserted;
  }

  /** 列表接口：优先 DB（可快速返回），再实时拉取新浪合并结果 */
  async getList(
    category: string,
    page: number,
    pageSize: number,
    live: boolean,
  ): Promise<{
    total: number;
    items: NewsArticle[];
    source: string;
    categories: NewsCategory[];
  }> {
    const where = category && category !== 'all' ? { category } : {};
    const [dbItems, total] = await this.articleRepo.findAndCount({
      where,
      order: { publishTime: 'DESC', id: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    if (live) {
      try {
        const liveItems = await this.fetchListFromSina(category, 1, pageSize);
        // 持久化新文章（后台不阻塞）
        this.saveArticlesIfNotExists(liveItems).catch(() => undefined);
        // 合并：去重 + 实时优先
        const byDocId = new Map<string, NewsArticle>();
        liveItems.forEach((it) => byDocId.set(it.docId, it));
        dbItems.forEach((it) => {
          if (!byDocId.has(it.docId)) byDocId.set(it.docId, it);
        });
        const merged = Array.from(byDocId.values()).sort((a, b) => b.publishTime - a.publishTime);
        return {
          total: Math.max(total, merged.length),
          items: merged.slice(0, pageSize),
          source: 'sina+db',
          categories: NEWS_CATEGORIES,
        };
      } catch (e) {
        this.logger.warn(`getList live fetch failed: ${(e as Error).message}`);
      }
    }

    return {
      total,
      items: dbItems,
      source: 'db',
      categories: NEWS_CATEGORIES,
    };
  }

  async getDetail(id: number): Promise<NewsArticle | null> {
    return this.articleRepo.findOne({ where: { id } });
  }

  /** 手动触发一次性抓取：拉取全部分类的前 N 条并入库 */
  async manualCrawl(pageSize = 30): Promise<{
    inserted: number;
    perCategory: Record<string, number>;
  }> {
    const perCategory: Record<string, number> = {};
    let totalInserted = 0;
    for (const cat of NEWS_CATEGORIES) {
      if (!cat.pageid) continue;
      const list = await this.fetchListFromSina(cat.key, 1, pageSize);
      const n = await this.saveArticlesIfNotExists(list);
      perCategory[cat.key] = n;
      totalInserted += n;
      this.logger.log(`manualCrawl cat=${cat.key} fetched=${list.length} new=${n}`);
    }
    return { inserted: totalInserted, perCategory };
  }

  /**
   * 每日 21:00 自动抓取并入库（财经要闻 + 股票滚动，每类 50 条）。
   * 作为归档与离线保底数据源（新浪接口失效时仍能看历史）。
   */
  @Cron('0 0 21 * * *', { name: 'daily-news-crawl', timeZone: 'Asia/Shanghai' })
  async dailyCrawl() {
    this.logger.log('daily-news-crawl start');
    const t0 = Date.now();
    try {
      const r = await this.manualCrawl(50);
      this.logger.log(
        `daily-news-crawl done inserted=${r.inserted} perCategory=${JSON.stringify(
          r.perCategory,
        )} cost=${Date.now() - t0}ms`,
      );
    } catch (e) {
      this.logger.error(`daily-news-crawl error: ${(e as Error).stack}`);
    }
  }

  listCategories(): NewsCategory[] {
    return NEWS_CATEGORIES;
  }

  getJobStatus() {
    const jobs = this.schedulerRegistry.getCronJobs();
    const result: { name: string; nextDate: string; running: boolean }[] = [];
    jobs.forEach((job, name) => {
      try {
        const next = job.nextDate();
        result.push({
          name,
          nextDate:
            next && typeof (next as any).toISOString === 'function'
              ? (next as any).toISOString()
              : String(next ?? ''),
          running: job.running,
        });
      } catch {
        /* noop */
      }
    });
    return result;
  }
}

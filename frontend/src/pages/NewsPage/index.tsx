import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import type { NewsArticle, NewsCategory, NewsListResult } from '../../types';
import './style.less';

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDay = Math.floor(
    (today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000,
  );
  if (sameDay) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diffDay === 1) return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diffDay < 7) return `${diffDay}天前 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function getCategoryLabel(categories: NewsCategory[], key: string): string {
  const c = categories.find((x) => x.key === key);
  return c ? c.label : key;
}

export default function NewsPage() {
  const [category, setCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NewsListResult | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/news?category=${encodeURIComponent(category)}&page=${page}&pageSize=${pageSize}&live=${live}`;
      const res = await apiFetch(url);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [category, page, pageSize, live]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const categories = data?.categories ?? [];

  const manualCrawl = useCallback(async () => {
    if (!confirm('确认手动触发一次资讯抓取？（从新浪财经接口拉取最新要闻并入库）')) return;
    try {
      const res = await apiFetch('/api/news/crawl', { method: 'POST' });
      if (res.ok) {
        const r = await res.json();
        alert(`抓取完成，新增文章 ${r.inserted} 篇\n按分类：${JSON.stringify(r.perCategory)}`);
        fetchList();
      }
    } catch (e) {
      alert(`抓取失败：${(e as Error).message}`);
    }
  }, [fetchList]);

  const sourceLabel = useMemo(() => {
    if (!data) return '';
    const map: Record<string, string> = { 'sina+db': '实时(新浪)+归档', db: '归档数据' };
    return map[data.source] ?? data.source;
  }, [data]);

  const openOriginal = (item: NewsArticle) => {
    const url = item.url || item.wapUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="news-page">
      <div className="news-page__header">
        <div>
          <div className="news-page__title">财经资讯</div>
          <div className="news-page__subtitle">
            数据源：新浪财经滚动接口 · 每日 21:00 自动归档到本地数据库 · 点击文章直接跳转原文
            {data?.source ? ` · 当前：${sourceLabel}` : ''}
          </div>
        </div>
        <div className="news-page__actions">
          <label className="news-page__toggle">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => {
                setLive(e.target.checked);
                setPage(1);
              }}
            />
            <span>实时刷新</span>
          </label>
          <button
            type="button"
            className="news-page__refresh"
            onClick={() => {
              setPage(1);
              fetchList();
            }}
            disabled={loading}
          >
            🔄 刷新
          </button>
          <button
            type="button"
            className="news-page__refresh news-page__refresh--primary"
            onClick={manualCrawl}
          >
            ⬇️ 抓一批
          </button>
        </div>
      </div>

      <div className="news-page__tabs">
        {categories.length === 0 && (
          <span className="news-page__tab-placeholder">加载分类中...</span>
        )}
        {categories.map((c) => {
          const active = c.key === category;
          return (
            <button
              key={c.key}
              type="button"
              className={`news-page__tab${active ? ' news-page__tab--active' : ''}`}
              onClick={() => {
                setCategory(c.key);
                setPage(1);
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="news-page__loading">
          <div className="news-page__loading-spinner" />
          <span>加载中...</span>
        </div>
      )}

      {!loading && !data?.items?.length && (
        <div className="news-page__empty">暂无资讯，尝试点击右侧「抓一批」或切换分类</div>
      )}

      <ul className="news-page__list">
        {(data?.items ?? []).map((item) => {
          const href = item.url || item.wapUrl;
          return (
            <li key={`${item.docId}-${item.id ?? 0}`} className="news-page__item">
              <a
                className="news-page__item-link"
                href={href || '#'}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => {
                  if (!href) e.preventDefault();
                }}
                title={href ? '点击查看原文' : '暂无原文链接'}
                onAuxClick={(e) => {
                  // 中键: let browser handle default (open href in tab). Fallback to window.open only if no href.
                  if (!href) {
                    e.preventDefault();
                    openOriginal(item);
                  }
                }}
              >
                {item.topImage ? (
                  <div
                    className="news-page__item-img"
                    style={{ backgroundImage: `url(${item.topImage})` }}
                  />
                ) : null}
                <div className="news-page__item-body">
                  <div className="news-page__item-title">{item.title}</div>
                  {item.summary && item.summary.length > 10 ? (
                    <div className="news-page__item-summary">{item.summary}</div>
                  ) : null}
                  <div className="news-page__item-meta">
                    {item.source ? (
                      <span className="news-page__item-source">{item.source}</span>
                    ) : null}
                    {categories.length ? (
                      <span className="news-page__item-cat">
                        {getCategoryLabel(categories, item.category)}
                      </span>
                    ) : null}
                    <span className="news-page__item-time">{formatTime(item.publishTime)}</span>
                    {item.keywords?.length ? (
                      <span className="news-page__item-keywords">
                        {item.keywords.slice(0, 3).map((k, i) => (
                          <span key={i} className="news-page__item-keyword">
                            #{k}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      {(data?.items?.length ?? 0) > 0 ? (
        <div className="news-page__pager">
          <button
            type="button"
            className="news-page__pager-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <span className="news-page__pager-info">
            第 {page} 页 · 共约 {data?.total ?? 0} 条
          </span>
          <button
            type="button"
            className="news-page__pager-btn"
            disabled={loading || (data?.items ?? []).length < pageSize}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../../utils/apiFetch';
import { useAuth } from '../../hooks/useAuth';
import './style.less';

interface CommentAttachment {
  url: string;
  name: string;
  size: number;
  mime: string;
  kind: 'image' | 'markdown' | 'pdf' | 'html' | 'other';
}

interface CommentItem {
  id: number;
  userId: number;
  userName: string;
  content: string | null;
  attachments: CommentAttachment[];
  createdAt: string;
}

type PreviewKind = 'image' | 'markdown' | 'pdf' | 'html';

interface PreviewState {
  kind: PreviewKind;
  url: string;
  name: string;
}

const MAX_FILES = 10;

const AVATAR_COLORS = ['#5b8def', '#e8364e', '#00a86b', '#faad14', '#9254de', '#13c2c2', '#f5816b'];

function fmtSize(size: number): string {
  if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + 'MB';
  if (size >= 1024) return (size / 1024).toFixed(1) + 'KB';
  return size + 'B';
}

function fmtTime(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000 && d.getDate() === now.getDate()) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

function extLabel(name: string, mime: string): string {
  if (mime?.startsWith('image/')) return 'IMG';
  const ext = name.split('.').pop()?.toUpperCase() || '';
  if (ext && ext.length <= 4) return ext;
  return 'FILE';
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const text = (name || '?').trim();
  const ch = text.charAt(0).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <span
      className="si-avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.45 }}
    >
      {ch}
    </span>
  );
}

function FileChip({
  name,
  size,
  mime,
  kind,
  onRemove,
  onClick,
}: {
  name: string;
  size: number;
  mime: string;
  kind: string;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  const clickable = kind !== 'image';
  return (
    <span
      className={`si-file-chip ${onClick ? 'si-file-chip--link' : ''}`}
      onClick={onClick}
      role={clickable && onClick ? 'button' : undefined}
    >
      <span className="si-file-chip__ext">{extLabel(name, mime)}</span>
      <span className="si-file-chip__name" title={name}>
        {name}
      </span>
      <span className="si-file-chip__size">{fmtSize(size)}</span>
      {onRemove && (
        <button
          className="si-file-chip__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

export default function StockInteraction({ symbol }: { symbol: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [mdContent, setMdContent] = useState<string | null>(null);
  const [mdLoading, setMdLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewBodyRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/stock-comment/${encodeURIComponent(symbol)}`);
      const json = await res.json();
      setComments(json.items || []);
    } catch {
      // 保留旧数据
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    setLoading(true);
    fetchComments();
    const timer = setInterval(fetchComments, 20000);
    return () => clearInterval(timer);
  }, [fetchComments]);

  // markdown 预览需要拉取文本内容
  useEffect(() => {
    if (preview?.kind !== 'markdown') return;
    setMdContent(null);
    setMdLoading(true);
    apiFetch(preview.url)
      .then((r) => r.text())
      .then(setMdContent)
      .catch(() => setMdContent('# 加载失败'))
      .finally(() => setMdLoading(false));
  }, [preview]);

  // 跟踪原生全屏状态
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of picked) {
        if (merged.length >= MAX_FILES) break;
        if (!merged.some((x) => x.name === f.name && x.size === f.size)) merged.push(f);
      }
      return merged;
    });
    e.target.value = '';
  };

  // 支持粘贴截图（剪贴板中的图片直接加入附件）
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData.items || [])
      .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (imageFiles.length === 0) return;
    e.preventDefault();
    const stamp = new Date().toLocaleTimeString('zh-CN', { hour12: false }).replace(/:/g, '');
    setFiles((prev) => {
      const merged = [...prev];
      for (let i = 0; i < imageFiles.length; i++) {
        if (merged.length >= MAX_FILES) break;
        const src = imageFiles[i];
        const name = `截图_${stamp}${imageFiles.length > 1 ? `_${i + 1}` : ''}.png`;
        merged.push(new File([src], name, { type: src.type }));
      }
      return merged;
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!content.trim() && files.length === 0) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('symbol', symbol);
      if (content.trim()) fd.append('content', content.trim());
      for (const f of files) fd.append('files', f);
      const res = await apiFetch('/api/stock-comment', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('failed');
      const created: CommentItem = await res.json();
      // 实时展示：新评论插到最上面
      setComments((prev) => [created, ...prev]);
      setContent('');
      setFiles([]);
    } catch {
      alert('发表失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const openAttachment = (a: CommentAttachment) => {
    if (a.kind === 'other') {
      window.open(a.url, '_blank');
      return;
    }
    setPreview({ kind: a.kind, url: a.url, name: a.name });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除这条评论吗？')) return;
    try {
      const res = await apiFetch(`/api/stock-comment/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('删除失败，请重试');
    }
  };

  const closePreview = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setPreview(null);
  };

  const toggleFullscreen = () => {
    const el = previewBodyRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  const myName = user?.displayName || user?.username || '我';

  return (
    <div className="si-panel">
      <h3 className="si-panel__title">互动趋势</h3>

      <div className="si-composer">
        <Avatar name={myName} />
        <div className="si-composer__main">
          <div className="si-composer__name">{myName}</div>
          <textarea
            className="si-composer__input"
            placeholder={`说说你对 ${symbol} 的看法…（可粘贴截图）`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            rows={3}
          />
          {files.length > 0 && (
            <div className="si-composer__files">
              {files.map((f, i) => (
                <FileChip
                  key={`${f.name}-${f.size}`}
                  name={f.name}
                  size={f.size}
                  mime={f.type}
                  kind="other"
                  onRemove={() => removeFile(i)}
                />
              ))}
            </div>
          )}
          <div className="si-composer__toolbar">
            <button className="si-composer__tool" onClick={() => imageInputRef.current?.click()}>
              图片
            </button>
            <button className="si-composer__tool" onClick={() => fileInputRef.current?.click()}>
              附件
            </button>
            <span className="si-composer__hint">
              md / pdf / html 可在线预览，其它类型新开页打开
            </span>
            <button
              className="si-composer__submit"
              disabled={submitting || (!content.trim() && files.length === 0)}
              onClick={handleSubmit}
            >
              {submitting ? '发表中...' : '发表'}
            </button>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={pickFiles}
          />
          <input ref={fileInputRef} type="file" multiple hidden onChange={pickFiles} />
        </div>
      </div>

      <div className="si-feed">
        {loading ? (
          <div className="si-feed__empty">加载中...</div>
        ) : comments.length === 0 ? (
          <div className="si-feed__empty">暂无互动，来发表第一条评论吧</div>
        ) : (
          comments.map((c) => {
            const images = (c.attachments || []).filter((a) => a.kind === 'image');
            const docs = (c.attachments || []).filter((a) => a.kind !== 'image');
            return (
              <div key={c.id} className="si-comment">
                <Avatar name={c.userName} />
                <div className="si-comment__main">
                  <div className="si-comment__meta">
                    <span className="si-comment__name">{c.userName}</span>
                    <span className="si-comment__time">{fmtTime(c.createdAt)}</span>
                    {user && c.userId === user.id && (
                      <button className="si-comment__delete" onClick={() => handleDelete(c.id)}>
                        删除
                      </button>
                    )}
                  </div>
                  {c.content && <div className="si-comment__text">{c.content}</div>}
                  {images.length > 0 && (
                    <div className="si-comment__images">
                      {images.map((a) => (
                        <img
                          key={a.url}
                          className="si-comment__image"
                          src={a.url}
                          alt={a.name}
                          onClick={() => openAttachment(a)}
                        />
                      ))}
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div className="si-comment__files">
                      {docs.map((a) => (
                        <FileChip
                          key={a.url}
                          name={a.name}
                          size={a.size}
                          mime={a.mime}
                          kind={a.kind}
                          onClick={() => openAttachment(a)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {preview && (
        <div className="si-preview" onClick={closePreview}>
          <div
            ref={previewBodyRef}
            className={`si-preview__body ${isFullscreen ? 'si-preview__body--fs' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="si-preview__header">
              <span className="si-preview__title">{preview.name}</span>
              <div className="si-preview__actions">
                <button className="si-preview__fs" onClick={toggleFullscreen}>
                  {isFullscreen ? '退出全屏' : '全屏'}
                </button>
                <button className="si-preview__close" onClick={closePreview}>
                  ✕
                </button>
              </div>
            </div>
            <div className="si-preview__content">
              {preview.kind === 'image' && (
                <img className="si-preview__img" src={preview.url} alt={preview.name} />
              )}
              {preview.kind === 'pdf' && (
                <iframe className="si-preview__frame" src={preview.url} title={preview.name} />
              )}
              {preview.kind === 'html' && (
                <iframe
                  className="si-preview__frame"
                  src={preview.url}
                  title={preview.name}
                  sandbox="allow-same-origin allow-scripts allow-popups"
                />
              )}
              {preview.kind === 'markdown' &&
                (mdLoading ? (
                  <div className="si-preview__loading">加载中...</div>
                ) : (
                  <div className="si-preview__markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{mdContent ?? ''}</ReactMarkdown>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

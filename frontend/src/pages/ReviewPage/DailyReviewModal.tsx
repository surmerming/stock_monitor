import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../../utils/apiFetch';

interface ConfigDto {
  key: string;
  content: string;
  updatedAt: string;
}

interface ReviewListItem {
  id: number;
  date: string;
  title: string | null;
  updatedAt: string;
  source: string | null;
  fileSize: number;
}

interface RunDto {
  id: number;
  date: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string | null;
  dailyReviewId: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

const CONFIG_META: Record<string, { label: string; description: string; placeholder: string }> = {
  daily_review_prompt: {
    label: '每日复盘.md',
    description: 'WorkBuddy 每次执行复盘时加载的 skill 模板。',
    placeholder: '请输入或粘贴 skill 模板内容...',
  },
  holdings: {
    label: '我的持仓.md',
    description: '持仓清单（A 股 / 港股 / 美股分组的 markdown）。',
    placeholder: '请输入或粘贴持仓清单...',
  },
};

const STATUS_LABEL: Record<RunDto['status'], { text: string; color: string }> = {
  pending: { text: '⏳ 待执行', color: '#f5a623' },
  running: { text: '⚙️ 执行中', color: '#3498db' },
  completed: { text: '✅ 已完成', color: '#27ae60' },
  failed: { text: '❌ 失败', color: '#e74c3c' },
};

type ModalMode = 'settings' | 'run';

interface Props {
  mode: ModalMode;
  onClose: () => void;
}

export default function DailyReviewModal({ mode, onClose }: Props) {
  const [configs, setConfigs] = useState<Record<string, ConfigDto>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMode, setEditMode] = useState<'edit' | 'preview'>('edit');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [runDate, setRunDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [runs, setRuns] = useState<RunDto[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [latestReport, setLatestReport] = useState<ReviewListItem | null>(null);
  const [uploadRunId, setUploadRunId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<{ bytes: number; head: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const fetchConfigs = useCallback(async () => {
    const res = await apiFetch('/api/daily-review/configs');
    if (res.ok) {
      const data = await res.json();
      const map: Record<string, ConfigDto> = {};
      for (const c of data.items || []) map[c.key] = c;
      setConfigs(map);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    const res = await apiFetch('/api/daily-review/runs?limit=10');
    if (res.ok) {
      const data = await res.json();
      setRuns(data.items || []);
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    const res = await apiFetch('/api/daily-review/list');
    if (res.ok) {
      const data = await res.json();
      const items: ReviewListItem[] = data.items || [];
      if (items.length > 0) {
        const maxDate = items.reduce((acc, cur) => (cur.date > acc.date ? cur : acc), items[0]);
        setLatestReport(maxDate);
      } else {
        setLatestReport(null);
      }
    }
  }, []);

  // 挂载时按 mode 加载所需数据
  useEffect(() => {
    if (mode === 'settings') {
      fetchConfigs();
    } else {
      fetchRuns();
      fetchLatest();
    }
  }, [mode, fetchConfigs, fetchRuns, fetchLatest]);

  // 自动轮询运行状态
  useEffect(() => {
    const hasActive = runs.some((r) => r.status === 'pending' || r.status === 'running');
    if (hasActive && pollRef.current === null) {
      pollRef.current = window.setInterval(() => {
        fetchRuns();
        fetchLatest();
      }, 2000);
    } else if (!hasActive && pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [runs, fetchRuns, fetchLatest]);

  // ESC 关闭
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingKey) setEditingKey(null);
        else if (uploadRunId !== null) setUploadRunId(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, editingKey, uploadRunId]);

  const openEditor = (key: string) => {
    setEditingKey(key);
    setEditContent(configs[key]?.content ?? '');
    setEditMode('edit');
    setEditError('');
  };

  const closeEditor = () => {
    setEditingKey(null);
    setEditContent('');
    setEditMode('edit');
    setEditError('');
  };

  const saveEditor = async () => {
    if (!editingKey) return;
    setEditSaving(true);
    setEditError('');
    try {
      const res = await apiFetch(`/api/daily-review/config/${encodeURIComponent(editingKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        await fetchConfigs();
        closeEditor();
      } else {
        const err = await res.json().catch(() => ({}));
        setEditError(err.message || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const triggerRun = async () => {
    if (!runDate) return;
    setTriggering(true);
    try {
      const res = await apiFetch('/api/daily-review/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: runDate }),
      });
      if (res.ok) {
        await fetchRuns();
      }
    } finally {
      setTriggering(false);
    }
  };

  const openUpload = (runId: number) => {
    setUploadRunId(runId);
    setUploadFile(null);
    setUploadPreview(null);
  };

  const closeUpload = () => {
    setUploadRunId(null);
    setUploadFile(null);
    setUploadPreview(null);
  };

  const handleUploadFile = (file: File | null) => {
    setUploadFile(file);
    if (!file) {
      setUploadPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setUploadPreview({
        bytes: file.size,
        head: text.slice(0, 120).replace(/\s+/g, ' '),
      });
    };
    reader.readAsText(file, 'utf-8');
  };

  const submitUpload = async () => {
    if (!uploadRunId || !uploadFile) return;
    setUploading(true);
    try {
      const run = runs.find((r) => r.id === uploadRunId);
      if (!run) return;
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('runId', String(uploadRunId));
      form.append('source', 'manual');
      const res = await apiFetch(
        `/api/daily-review/by-date/${encodeURIComponent(run.date)}/upload`,
        { method: 'POST', body: form },
      );
      if (res.ok) {
        await fetchRuns();
        await fetchLatest();
        closeUpload();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`上传失败: ${err.message || res.status}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const downloadReport = async (id: number) => {
    const item = await apiFetch(`/api/daily-review/list`).then((r) => (r.ok ? r.json() : null));
    const target = item?.items?.find((i: ReviewListItem) => i.id === id);
    if (!target) return;
    const res = await apiFetch(`/api/daily-review/by-date/${encodeURIComponent(target.date)}`);
    if (!res.ok) return;
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const fmtBytes = (n: number) => {
    if (n < 1024) return `${n} B`;
    return `${(n / 1024).toFixed(1)} KB`;
  };

  const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString('zh-CN') : '—');

  const isSettings = mode === 'settings';
  const title = isSettings ? '每日复盘设置' : '运行每日复盘';
  const configKeys = Object.keys(CONFIG_META);

  return (
    <div className="rv-modal" onClick={onClose}>
      <div
        className={`rv-modal__content ${editingKey ? 'rv-modal__content--wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rv-modal__header">
          <h4 className="rv-modal__title">{title}</h4>
          <button className="rv-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* ====== 设置模式 ====== */}
        {isSettings && !editingKey && (
          <div className="dr-config">
            <div className="dr-config__list">
              {configKeys.map((key) => {
                const meta = CONFIG_META[key];
                const cfg = configs[key];
                return (
                  <div key={key} className="dr-config__row">
                    <div className="dr-config__row-info">
                      <span className="dr-config__row-label">{meta.label}</span>
                      <span className="dr-config__row-meta">
                        {cfg
                          ? `${fmtBytes(cfg.content.length)} · 更新于 ${fmtDate(cfg.updatedAt)}`
                          : '尚未配置'}
                      </span>
                      <span className="dr-config__row-desc">{meta.description}</span>
                    </div>
                    <div className="dr-config__row-actions">
                      <button className="rv-btn rv-btn--primary" onClick={() => openEditor(key)}>
                        {cfg ? '编辑' : '新增'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====== 编辑器子弹窗 ====== */}
        {editingKey && (
          <>
            <div className="dr-config__tabs">
              <button
                className={`dr-config__tab ${editMode === 'edit' ? 'dr-config__tab--active' : ''}`}
                onClick={() => setEditMode('edit')}
              >
                ✏️ 编辑
              </button>
              <button
                className={`dr-config__tab ${editMode === 'preview' ? 'dr-config__tab--active' : ''}`}
                onClick={() => setEditMode('preview')}
              >
                👁 预览
              </button>
              <span className="dr-config__tab-hint">
                {editMode === 'edit' ? '支持 markdown 语法（GFM）' : '查看渲染效果，所见即所得'}
              </span>
            </div>
            {editMode === 'edit' ? (
              <textarea
                className="dr-config__textarea"
                placeholder={CONFIG_META[editingKey]?.placeholder}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                spellCheck={false}
              />
            ) : (
              <div className="dr-config__preview rv-markdown">
                {editContent.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
                ) : (
                  <div className="dr-config__preview-empty">暂无内容可预览</div>
                )}
              </div>
            )}
            {editError && <div className="dr-config__error">保存失败：{editError}</div>}
            <div className="dr-config__editor-actions">
              <span className="dr-config__size">
                {fmtBytes(editContent.length)} · {editContent.split('\n').length} 行
              </span>
              <div className="dr-config__editor-buttons">
                <button className="rv-btn" onClick={closeEditor} disabled={editSaving}>
                  取消
                </button>
                <button
                  className="rv-btn rv-btn--primary"
                  onClick={saveEditor}
                  disabled={editSaving}
                >
                  {editSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ====== 运行模式 ====== */}
        {!isSettings && uploadRunId === null && (
          <div className="dr-run">
            <div className="dr-run__row">
              <label className="dr-run__label">
                日期：
                <input
                  type="date"
                  className="rv-input"
                  value={runDate}
                  onChange={(e) => setRunDate(e.target.value)}
                />
              </label>
              <button
                className="rv-btn rv-btn--primary"
                onClick={triggerRun}
                disabled={triggering || !runDate}
              >
                {triggering ? '触发中...' : '▶ 触发运行'}
              </button>
              {latestReport && (
                <span className="dr-run__latest">
                  最新：{latestReport.date}（{fmtBytes(latestReport.fileSize)}）
                </span>
              )}
            </div>

            <h5 className="dr-run__subtitle">最近运行记录</h5>
            {runs.length === 0 ? (
              <div className="rv-empty">暂无运行记录</div>
            ) : (
              <table className="dr-run__table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>日期</th>
                    <th>状态</th>
                    <th>消息</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.date}</td>
                      <td>
                        <span style={{ color: STATUS_LABEL[r.status].color, fontWeight: 600 }}>
                          {STATUS_LABEL[r.status].text}
                        </span>
                      </td>
                      <td className="dr-run__msg">{r.message || '—'}</td>
                      <td className="dr-run__time">
                        创建 {fmtDate(r.createdAt)}
                        {r.finishedAt && <div>完成 {fmtDate(r.finishedAt)}</div>}
                      </td>
                      <td>
                        {r.dailyReviewId && (
                          <button
                            className="rv-btn rv-btn--sm"
                            onClick={() => downloadReport(r.dailyReviewId!)}
                          >
                            查看 HTML
                          </button>
                        )}
                        {(r.status === 'pending' || r.status === 'failed') && (
                          <button
                            className="rv-btn rv-btn--sm"
                            onClick={() => openUpload(r.id)}
                            style={{ marginLeft: 4 }}
                          >
                            上传 HTML
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ====== 上传 HTML 子弹窗 ====== */}
        {uploadRunId !== null && (
          <>
            <div className="rv-modal__sub-header">
              <h5 className="rv-modal__sub-title">上传 HTML 到 #{uploadRunId}</h5>
              <button className="rv-modal__close" onClick={closeUpload}>
                ×
              </button>
            </div>
            <label className="dr-upload__drop">
              <input
                type="file"
                accept=".html,.htm,text/html"
                style={{ display: 'none' }}
                onChange={(e) => handleUploadFile(e.target.files?.[0] ?? null)}
              />
              {uploadFile ? (
                <div className="dr-upload__file-info">
                  <div className="dr-upload__file-icon">📄</div>
                  <div className="dr-upload__file-meta">
                    <div className="dr-upload__file-name">{uploadFile.name}</div>
                    <div className="dr-upload__file-sub">
                      {fmtBytes(uploadFile.size)} · {uploadFile.type || 'text/html'}
                    </div>
                    {uploadPreview && (
                      <div className="dr-upload__file-preview">{uploadPreview.head}…</div>
                    )}
                  </div>
                  <button
                    className="rv-btn rv-btn--sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUploadFile(null);
                    }}
                  >
                    重选
                  </button>
                </div>
              ) : (
                <div className="dr-upload__drop-empty">
                  <div className="dr-upload__drop-icon">📁</div>
                  <div className="dr-upload__drop-title">点击选择 HTML 文件</div>
                  <div className="dr-upload__drop-sub">
                    支持 <code>.html</code> / <code>.htm</code>，最大 10MB
                  </div>
                </div>
              )}
            </label>
            <div className="dr-config__editor-actions">
              <span className="dr-config__size">
                {uploadFile ? fmtBytes(uploadFile.size) : '未选择文件'}
              </span>
              <div className="dr-config__editor-buttons">
                <button className="rv-btn" onClick={closeUpload} disabled={uploading}>
                  取消
                </button>
                <button
                  className="rv-btn rv-btn--primary"
                  onClick={submitUpload}
                  disabled={uploading || !uploadFile}
                >
                  {uploading ? '上传中...' : '上传并完成'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/apiFetch';

interface ReviewNote {
  id: number;
  date: string;
  content: string;
  sentimentScore: number;
  plan: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const SENTIMENT_LABELS = ['', '极度恐惧', '恐惧', '中性', '贪婪', '极度贪婪'];

export default function ReviewNotes() {
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    content: '',
    sentimentScore: 3,
    plan: '',
    tags: '',
  });
  const [editId, setEditId] = useState<number | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/review/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.items || []);
      }
    } catch {
      // API may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSave = async () => {
    if (!form.content.trim()) return;
    try {
      const body = {
        date: form.date,
        content: form.content,
        sentimentScore: form.sentimentScore,
        plan: form.plan,
        tags: form.tags.split(/[,，\s]+/).filter(Boolean),
      };

      const url = editId ? `/api/review/notes/${editId}` : '/api/review/notes';
      const method = editId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setEditing(false);
        setEditId(null);
        setForm({ date: new Date().toISOString().slice(0, 10), content: '', sentimentScore: 3, plan: '', tags: '' });
        fetchNotes();
      }
    } catch {
      // handle error
    }
  };

  const handleEdit = (note: ReviewNote) => {
    setEditId(note.id);
    setForm({
      date: note.date,
      content: note.content,
      sentimentScore: note.sentimentScore,
      plan: note.plan,
      tags: note.tags.join(', '),
    });
    setEditing(true);
  };

  const handleNew = () => {
    setEditId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      content: '',
      sentimentScore: 3,
      plan: '',
      tags: '',
    });
    setEditing(true);
  };

  return (
    <div className="rv-notes">
      <div className="rv-notes__header">
        <h3 className="rv-section-title">复盘笔记</h3>
        <button className="rv-btn rv-btn--primary" onClick={handleNew}>
          + 新建笔记
        </button>
      </div>

      {/* Editor */}
      {editing && (
        <div className="rv-notes__editor">
          <div className="rv-notes__editor-row">
            <input
              className="rv-input"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <div className="rv-notes__sentiment">
              <span className="rv-notes__sentiment-label">市场情绪:</span>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  className={`rv-notes__sentiment-btn ${form.sentimentScore === v ? 'rv-notes__sentiment-btn--active' : ''}`}
                  onClick={() => setForm({ ...form, sentimentScore: v })}
                  title={SENTIMENT_LABELS[v]}
                >
                  {v}
                </button>
              ))}
              <span className="rv-notes__sentiment-text">{SENTIMENT_LABELS[form.sentimentScore]}</span>
            </div>
          </div>
          <textarea
            className="rv-textarea"
            placeholder="今日复盘总结..."
            rows={6}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <textarea
            className="rv-textarea"
            placeholder="明日计划：关注股票、目标价位、操作策略..."
            rows={3}
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
          />
          <div className="rv-notes__editor-row">
            <input
              className="rv-input rv-input--wide"
              placeholder="标签 (用逗号分隔，如: AAPL, 突破, 金叉)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <button className="rv-btn rv-btn--primary" onClick={handleSave}>
              {editId ? '更新' : '保存'}
            </button>
            <button className="rv-btn" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="rv-skeleton">加载笔记中...</div>
      ) : notes.length === 0 && !editing ? (
        <div className="rv-empty">暂无复盘笔记，点击上方按钮开始记录</div>
      ) : (
        <div className="rv-notes__list">
          {notes.map((note) => (
            <div key={note.id} className="rv-notes__item" onClick={() => handleEdit(note)}>
              <div className="rv-notes__item-header">
                <span className="rv-notes__item-date">{note.date}</span>
                <span className="rv-notes__item-sentiment">
                  情绪: {SENTIMENT_LABELS[note.sentimentScore] || '中性'}
                </span>
              </div>
              <div className="rv-notes__item-content">{note.content}</div>
              {note.plan && (
                <div className="rv-notes__item-plan">
                  <strong>明日计划:</strong> {note.plan}
                </div>
              )}
              {note.tags.length > 0 && (
                <div className="rv-notes__item-tags">
                  {note.tags.map((tag, i) => (
                    <span key={i} className="rv-tag rv-tag--neutral">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

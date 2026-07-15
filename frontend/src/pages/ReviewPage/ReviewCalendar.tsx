import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../../utils/apiFetch';

interface DayRecord {
  date: string;
  sentimentScore: number;
  hasNote: boolean;
  tradeCount: number;
  content?: string;
  plan?: string;
}

interface DailyFile {
  fileName: string;
  date: string;
}

export default function ReviewCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noteDetail, setNoteDetail] = useState<any>(null);
  const [dailyFileDates, setDailyFileDates] = useState<Set<string>>(new Set());
  const [dailyFileMap, setDailyFileMap] = useState<Map<string, string>>(new Map());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoveredNote, setHoveredNote] = useState<any>(null);

  const fetchMonthData = useCallback(async () => {
    setLoading(true);
    try {
      const [notesRes, tradesRes, dailyFilesRes] = await Promise.all([
        apiFetch('/api/review/notes'),
        apiFetch('/api/trades'),
        apiFetch('/api/review/daily-files'),
      ]);

      const records: DayRecord[] = [];
      const noteData = notesRes.ok ? (await notesRes.json()).items || [] : [];
      const tradeData = tradesRes.ok ? (await tradesRes.json()).items || [] : [];

      const tradeByDate = new Map<string, number>();
      for (const t of tradeData) {
        const date = new Date(t.tradeTime).toISOString().slice(0, 10);
        tradeByDate.set(date, (tradeByDate.get(date) || 0) + 1);
      }

      for (const note of noteData) {
        records.push({
          date: note.date,
          sentimentScore: note.sentimentScore,
          hasNote: true,
          tradeCount: tradeByDate.get(note.date) || 0,
          content: note.content,
          plan: note.plan,
        });
      }

      for (const [date, count] of tradeByDate) {
        if (!records.find((r) => r.date === date)) {
          records.push({
            date,
            sentimentScore: 0,
            hasNote: false,
            tradeCount: count,
          });
        }
      }

      setNotes(records);

      // 解析每日复盘文件
      if (dailyFilesRes.ok) {
        const { files } = (await dailyFilesRes.json()) as { files: DailyFile[] };
        const dateSet = new Set<string>();
        const fileMap = new Map<string, string>();
        for (const f of files) {
          if (f.date) {
            dateSet.add(f.date);
            fileMap.set(f.date, f.fileName);
          }
        }
        setDailyFileDates(dateSet);
        setDailyFileMap(fileMap);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  const handleSelectDate = async (date: string) => {
    // 如果有每日复盘 HTML 文件，用新窗口打开
    if (dailyFileDates.has(date)) {
      const fileName = dailyFileMap.get(date);
      if (fileName) {
        window.open(`/daily_review/${encodeURIComponent(fileName)}`, '_blank');
        return;
      }
    }

    setSelectedDate(date);
    try {
      const res = await apiFetch('/api/review/notes');
      if (res.ok) {
        const data = await res.json();
        const note = (data.items || []).find((n: any) => n.date === date);
        setNoteDetail(note || null);
      }
    } catch {
      setNoteDetail(null);
    }
  };

  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [daysInMonth, firstDayOfWeek]);

  const noteMap = useMemo(() => {
    const map = new Map<string, DayRecord>();
    for (const n of notes) map.set(n.date, n);
    return map;
  }, [notes]);

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const SENTIMENT_COLORS = ['', '#e74c3c', '#e67e22', '#f5a623', '#2ecc71', '#27ae60'];
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="rv-calendar">
      <h3 className="rv-section-title">复盘日历</h3>

      <div className="rv-calendar__nav">
        <button className="rv-btn rv-btn--sm" onClick={prevMonth}>
          ←
        </button>
        <span className="rv-calendar__month">
          {year}年{month}月
        </span>
        <button className="rv-btn rv-btn--sm" onClick={nextMonth}>
          →
        </button>
      </div>

      {loading ? (
        <div className="rv-skeleton">加载日历数据...</div>
      ) : (
        <div className="rv-calendar__grid">
          {WEEKDAYS.map((d) => (
            <div key={d} className="rv-calendar__weekday">
              {d}
            </div>
          ))}
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="rv-calendar__empty" />;

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = noteMap.get(dateStr);
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            const isSelected = dateStr === selectedDate;
            const hasDailyReview = dailyFileDates.has(dateStr);

            const classNames = [
              'rv-calendar__day',
              isToday && 'rv-calendar__day--today',
              isSelected && 'rv-calendar__day--selected',
              record && 'rv-calendar__day--has-data',
              hasDailyReview && 'rv-calendar__day--has-review',
            ]
              .filter(Boolean)
              .join(' ');

            const handleMouseEnter = () => {
              if (record?.hasNote && record.content) {
                setHoveredDate(dateStr);
                setHoveredNote(record);
              }
            };

            const handleMouseLeave = () => {
              setHoveredDate(null);
              setHoveredNote(null);
            };

            return (
              <div
                key={dateStr}
                className={classNames}
                onClick={() => handleSelectDate(dateStr)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <span className="rv-calendar__day-num">{day}</span>
                {hasDailyReview && (
                  <span className="rv-calendar__day-review-badge" title="有每日复盘文件">
                    📄
                  </span>
                )}
                {record && (
                  <div className="rv-calendar__day-indicators">
                    {record.hasNote && (
                      <span
                        className="rv-calendar__day-dot"
                        style={{ background: SENTIMENT_COLORS[record.sentimentScore] || '#8892a4' }}
                        title={`情绪: ${record.sentimentScore}`}
                      />
                    )}
                    {record.tradeCount > 0 && (
                      <span
                        className="rv-calendar__day-trades"
                        title={`${record.tradeCount}笔交易`}
                      >
                        {record.tradeCount}
                      </span>
                    )}
                  </div>
                )}
                {hoveredDate === dateStr && hoveredNote && (
                  <div className="rv-calendar__tooltip">
                    <div className="rv-calendar__tooltip-header">
                      <span className="rv-calendar__tooltip-date">{dateStr}</span>
                      <span
                        className="rv-calendar__tooltip-sentiment"
                        style={{
                          background: SENTIMENT_COLORS[hoveredNote.sentimentScore] || '#8892a4',
                        }}
                      >
                        {hoveredNote.sentimentScore}/5
                      </span>
                    </div>
                    <div className="rv-calendar__tooltip-content rv-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {hoveredNote.content}
                      </ReactMarkdown>
                    </div>
                    {hoveredNote.plan && (
                      <div className="rv-calendar__tooltip-plan">
                        <strong>计划:</strong> {hoveredNote.plan}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Date Detail */}
      {selectedDate && (
        <div className="rv-calendar__detail">
          <h4 className="rv-detail__sub-title">{selectedDate} 复盘记录</h4>
          {noteDetail ? (
            <div className="rv-calendar__note">
              <div className="rv-calendar__note-meta">情绪评分: {noteDetail.sentimentScore}/5</div>
              <div className="rv-calendar__note-content">{noteDetail.content}</div>
              {noteDetail.plan && (
                <div className="rv-calendar__note-plan">
                  <strong>计划:</strong> {noteDetail.plan}
                </div>
              )}
              {noteDetail.tags?.length > 0 && (
                <div className="rv-calendar__note-tags">
                  {noteDetail.tags.map((tag: string, i: number) => (
                    <span key={i} className="rv-tag rv-tag--neutral">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rv-empty" style={{ padding: 16 }}>
              该日暂无复盘记录
            </div>
          )}
        </div>
      )}
    </div>
  );
}

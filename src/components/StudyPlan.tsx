import { useEffect, useState } from 'react'
import { ArrowRight, Bookmark, BookOpen, Check, Download, RotateCcw, Target } from 'lucide-react'
import { dayKey, type useLearningJournal } from '../hooks/useLearningJournal'
import type { HistoryLesson } from '../lib/historyApi'

export type LessonCollection = 'saved' | 'review' | 'notes'
interface Props {
  learning: ReturnType<typeof useLearningJournal>
  grade: number
  nextLesson?: HistoryLesson
  onOpenLesson: (id: string) => void
  onCollection: (filter: LessonCollection) => void
}
export function StudyPlan({ learning, grade, nextLesson, onOpenLesson, onCollection }: Props) {
  const [today, setToday] = useState(dayKey)
  useEffect(() => { const timer = window.setInterval(() => setToday(dayKey()), 30000); return () => window.clearInterval(timer) }, [])
  const { journal } = learning
  const count = journal.events.filter(event => event.day === today).length
  const last = Object.entries(journal.reading).filter(([id, item]) => item.grade === grade && !journal.read.includes(id)).sort((a, b) => b[1].openedAt.localeCompare(a[1].openedAt))[0]
  const review = Object.keys(journal.review).filter(id => id.startsWith('LS' + grade + '_B') && journal.review[id] === 'again')
  const saved = journal.bookmarks.filter(id => /^LS\d{1,2}_B\d{2}$/.test(id))
  function exportNotes() {
    const notes = Object.entries(journal.notes).filter(([, text]) => text.trim())
    const text = 'SỔ TAY XUYÊN SỬ KÝ · ' + today + '\n\n' + notes.map(([id, note]) => (journal.reading[id]?.title || id) + ' (' + id + ')\n' + note).join('\n\n────────────\n\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'so-tay-xuyen-su-ky-' + today + '.txt'; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="study-plan" aria-labelledby="study-plan-title">
    <div className="study-plan-heading"><div><span className="section-kicker">TỪNG BƯỚC NHỎ, NHỚ LÂU HƠN</span><h2 id="study-plan-title">Kế hoạch học hôm nay</h2></div><label><Target size={16} /><select aria-label="Mục tiêu trên trang chủ" value={journal.goal} onChange={event => learning.setGoal(Number(event.target.value))}>{[1, 3, 5].map(value => <option value={value} key={value}>{value} hoạt động / ngày</option>)}</select></label></div>
    <div className="study-plan-progress"><span>{count >= journal.goal ? <><Check size={15} /> Đã đạt mục tiêu hôm nay</> : count + '/' + journal.goal + ' hoạt động hôm nay'}</span><div role="progressbar" aria-label="Mục tiêu học trên trang chủ" aria-valuemin={0} aria-valuemax={journal.goal} aria-valuenow={Math.min(count, journal.goal)}><i style={{ width: Math.min(100, count / journal.goal * 100) + '%' }} /></div></div>
    <div className="study-plan-grid">
      <button className="study-action study-action-read" onClick={() => last ? onOpenLesson(last[0]) : nextLesson ? onOpenLesson(nextLesson.id) : document.getElementById('library')?.scrollIntoView()}><BookOpen size={22} /><strong>{last ? 'Đọc tiếp bài dang dở' : 'Khám phá bài tiếp theo'}</strong><p>{last ? last[1].title : nextLesson?.title || 'Mở thư viện lớp ' + grade}</p><small>{last ? 'Tiếp tục từ mục ' + (last[1].section + 1) : 'Theo lộ trình lớp ' + grade}</small><ArrowRight size={17} /></button>
      <button className="study-action study-action-review" onClick={() => onCollection('review')}><RotateCcw size={22} /><strong>Ôn lại để nhớ lâu</strong><p>{review.length ? review.length + ' bài lớp ' + grade + ' cần đọc lại' : 'Chưa có bài cần ôn. Đánh dấu khi bạn muốn đọc lại.'}</p><small>Ôn tập theo đánh giá của bạn</small><ArrowRight size={17} /></button>
      <button className="study-action study-action-saved" onClick={() => onCollection('saved')}><Bookmark size={22} /><strong>Tủ sách của bạn</strong><p>{saved.length ? saved.length + ' bài đã lưu, sẵn sàng khám phá' : 'Lưu những bài bạn thích để mở nhanh từ đây.'}</p><small>Bài đã lưu ở mọi lớp</small><ArrowRight size={17} /></button>
    </div>
    <div className="study-plan-footer"><button onClick={() => onCollection('notes')}>Mở bài có ghi chú <ArrowRight size={14} /></button><button disabled={!Object.values(journal.notes).some(note => note.trim())} onClick={exportNotes}><Download size={15} /> Tải sổ tay</button></div>
    {learning.storageError && <p role="status" className="study-storage-warning">Chưa lưu được tiến độ trên trình duyệt. Bạn có thể tải sổ tay để giữ ghi chú.</p>}
  </section>
}

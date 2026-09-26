import { ArrowRight, BookOpenText, CircleCheck, Flag } from 'lucide-react'
import { classes } from '../data/classes'
import { lessons } from '../data/demo'

interface Props { grade: number; completed: boolean; onContinue: () => void }

export function ContinueJourney({ grade, completed, onContinue }: Props) {
  const lesson = lessons[grade]
  const classProgress = classes.find(item => item.grade === grade)?.progress ?? 0
  const progress = completed ? Math.min(100, classProgress + 20) : grade === 7 ? 65 : classProgress
  return <section id="journey" className="section-space bg-cream" aria-labelledby="journey-title"><div className="page-shell">
    <div className="journey-card">
      <div className="journey-pattern" aria-hidden="true"><span>✳</span><span>✳</span><span>✳</span></div>
      <div className="relative z-10 max-w-[620px]"><span className="journey-kicker"><Flag size={15} /> HÀNH TRÌNH CỦA BẠN</span><h2 id="journey-title">Tiếp tục hành trình của bạn</h2><p>Trở lại nơi bạn đã dừng chân và viết tiếp câu chuyện khám phá lịch sử Việt Nam.</p>
        <div className="journey-lesson"><span className="lesson-icon"><BookOpenText size={25} /></span><div><span className="lesson-grade">LỚP {grade} · {lesson.chapter.toLocaleUpperCase('vi-VN')}</span><strong>{lesson.title}</strong></div></div>
        <div className="journey-progress"><div><span>Đã hoàn thành</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
        <button type="button" className="button-light" onClick={onContinue}>{completed ? 'Ôn tập bài học' : 'Tiếp tục học'} <ArrowRight size={18} /></button>
      </div>
      <div className="journey-emblem" aria-hidden="true"><div className="emblem-ring"><CircleCheck size={90} strokeWidth={1.1} /><span>{String(grade).padStart(2, '0')}</span></div><span className="emblem-caption">CHẶNG ĐƯỜNG LỊCH SỬ</span></div>
    </div>
  </div></section>
}

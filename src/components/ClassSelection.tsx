import { ArrowUpRight, BookOpen, Crown, Landmark, ScrollText } from 'lucide-react'
import { classes } from '../data/classes'

const icons = [ScrollText, Landmark, BookOpen, Crown]
interface Props { selectedGrade: number; completedActivities: string[]; onSelect: (grade: number) => void }

export function ClassSelection({ selectedGrade, completedActivities, onSelect }: Props) {
  return (
    <section id="classes" className="section-space bg-paper" aria-labelledby="classes-title">
      <div className="page-shell">
        <div className="section-heading"><div><span className="section-kicker">BẮT ĐẦU TỪ ĐÂY</span><h2 id="classes-title">Bạn đang học lớp mấy?</h2><p>Mỗi lớp học là một chặng đường khám phá lịch sử thật khác biệt.</p></div><span className="heading-decoration">01 / 04</span></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {classes.map((item, index) => {
            const Icon = icons[index]
            const progress = Math.min(100, item.progress + (completedActivities.includes(`lesson-${item.grade}`) ? 20 : 0))
            return <article key={item.grade} className={`class-card class-${item.theme} ${selectedGrade === item.grade ? 'is-selected' : ''}`}>
              <div className="flex items-start justify-between"><span className="class-icon"><Icon size={23} strokeWidth={1.8} /></span>{item.recommended && <span className="recommended-badge">✦ Đề xuất</span>}</div>
              <div className="mt-7"><span className="class-number">KHỐI {String(item.grade).padStart(2, '0')}</span><h3>Lớp {item.grade}</h3><p className="class-subtitle">{item.subtitle}</p></div>
              <div className="class-topics">{item.topics.map(topic => <span key={topic}>{topic}</span>)}</div>
              <div className="mt-auto pt-6"><div className="mb-2 flex justify-between text-xs font-semibold"><span>Tiến độ học tập</span><span>{progress}%</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><button type="button" className="class-action" onClick={() => onSelect(item.grade)}>{selectedGrade === item.grade ? 'Đang khám phá' : 'Khám phá'} <ArrowUpRight size={17} /></button></div>
            </article>
          })}
        </div>
      </div>
    </section>
  )
}

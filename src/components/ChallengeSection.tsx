import { ArrowUpRight, Clock3, Lightbulb, ListChecks } from 'lucide-react'
import { challenges } from '../data/challenges'

const icons = { timeline: Clock3, identity: Lightbulb, quiz: ListChecks }
interface Props { completedActivities: string[]; onTry: (id: string) => void }

export function ChallengeSection({ completedActivities, onTry }: Props) {
  return <section id="challenges" className="section-space bg-paper" aria-labelledby="challenges-title"><div className="page-shell"><div className="section-heading"><div><span className="section-kicker">HỌC MÀ CHƠI</span><h2 id="challenges-title">Thử thách kiến thức</h2><p>Biến kiến thức thành những chiến thắng nhỏ mỗi ngày.</p></div><span className="heading-decoration">+ XP SAU MỖI THỬ THÁCH</span></div><div className="grid gap-4 lg:grid-cols-3">{challenges.map((challenge, index) => { const Icon = icons[challenge.type]; const completed = completedActivities.includes(`challenge-${challenge.id}`); return <article key={challenge.id} className={`challenge-card challenge-${challenge.color}`}><div className="challenge-top"><span className="challenge-index">{completed ? '✓ ĐÃ HOÀN THÀNH' : `0${index + 1} / 03`}</span><Icon size={28} strokeWidth={1.6} /></div><div className="challenge-art" aria-hidden="true"><span>{challenge.type === 'timeline' ? '938 → 1288 → 1945' : challenge.type === 'identity' ? '?  ✦  ?' : 'A · B · C · D'}</span></div><h3>{challenge.title}</h3><p>{challenge.description}</p><button type="button" onClick={() => onTry(challenge.id)}>{completed ? 'Chơi lại' : challenge.action} <ArrowUpRight size={17} /></button></article> })}</div></div></section>
}

import { BookOpen, CircleHelp, FlagTriangleRight, Users } from 'lucide-react'

const stats = [
  { value: '12', label: 'Thời kỳ lịch sử', Icon: FlagTriangleRight },
  { value: '68', label: 'Nhân vật', Icon: Users },
  { value: '124', label: 'Sự kiện', Icon: BookOpen },
  { value: '350+', label: 'Câu hỏi', Icon: CircleHelp },
]

export function StatsSection() {
  return <section className="stats-section" aria-labelledby="stats-title"><div className="page-shell"><div className="stats-heading"><span className="section-kicker">CẢ MỘT THẾ GIỚI ĐỂ KHÁM PHÁ</span><h2 id="stats-title">Xuyên Sử Ký hôm nay</h2></div><div className="stats-grid">{stats.map(({ value, label, Icon }) => <div key={label} className="stat"><Icon size={25} strokeWidth={1.5} /><strong>{value}</strong><span>{label}</span></div>)}</div></div></section>
}

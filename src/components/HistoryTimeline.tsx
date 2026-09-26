import { ArrowRight, CalendarDays } from 'lucide-react'
import { timeline } from '../data/timeline'

export function HistoryTimeline() {
  return <section id="timeline" className="section-space bg-paper" aria-labelledby="timeline-title"><div className="page-shell">
    <div className="section-heading"><div><span className="section-kicker">DẤU MỐC VIỆT NAM</span><h2 id="timeline-title">Khám phá dòng thời gian</h2><p>Tám dấu mốc, hàng nghìn câu chuyện đang chờ được mở ra.</p></div><span className="timeline-hint">Kéo để xem thêm <ArrowRight size={16} /></span></div>
    <div className="timeline-scroll" tabIndex={0} aria-label="Dòng thời gian lịch sử, kéo ngang để xem thêm"><div className="timeline-track">
      {timeline.map((event, index) => <article className="timeline-item" key={event.year}><div className={`timeline-dot ${index === 4 ? 'is-featured' : ''}`}><CalendarDays size={17} /></div><span className="timeline-year">{event.year}</span><div className="timeline-event"><span>{event.category}</span><h3>{event.title}</h3></div></article>)}
    </div></div>
  </div></section>
}

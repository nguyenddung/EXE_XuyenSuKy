import { ArrowRight, BookOpen, Compass, Trophy } from 'lucide-react'
import type { DemoSession } from '../hooks/useDemoSession'

export function HomeWelcome({ session }: { session: DemoSession }) {
  return <section className="home-welcome page-shell" aria-labelledby="welcome-title">
    <div className="welcome-heading"><div><span className="section-kicker">GÓC KHÁM PHÁ CỦA BẠN</span><h1 id="welcome-title">{session.loggedIn ? 'Chào Minh, cùng viết tiếp' : 'Sẵn sàng cho'}<br /><em>hành trình lịch sử?</em></h1><p>Một câu chuyện mới, một góc nhìn mới. Bắt đầu từ điều bạn tò mò hôm nay.</p></div><a className="button-outline" href="#classes">Đổi lớp học <ArrowRight size={16} /></a></div>
    <div className="welcome-grid"><a className="welcome-stat" href="#journey"><BookOpen /><div><span>ĐANG KHÁM PHÁ</span><strong>Lịch sử lớp {session.grade}</strong></div><ArrowRight size={18} /></a><a className="welcome-stat" href="#progress"><Trophy /><div><span>THÀNH QUẢ HÀNH TRÌNH</span><strong>{session.completedActivities.length} hoạt động hoàn thành</strong></div><ArrowRight size={18} /></a><a className="welcome-stat" href="#characters"><Compass /><div><span>GẶP GỠ LỊCH SỬ</span><strong>4 nhân vật đang chờ bạn</strong></div><ArrowRight size={18} /></a></div>
  </section>
}

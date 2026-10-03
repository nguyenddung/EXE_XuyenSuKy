import { ArrowRight, ArrowUpRight, BookOpen, Check, MessageCircle, Search, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { eras } from '../data/eras'

// Library features live inside the learning app (/home); the rest can be tried right here on the landing page.
const features = [
  { title: 'Học theo lớp 6–12', text: 'Chọn khối lớp, đọc bài SGK', to: '/home', icon: BookOpen, tone: 'mission-blue' },
  { title: 'Tra cứu có nguồn', text: 'Mỗi đoạn trích ghi rõ trang sách', to: '/home', icon: Search, tone: 'mission-orange' },
  { title: 'Trò chuyện nhân vật AI', text: 'Thử ngay trên trang này', to: '#characters', icon: MessageCircle, tone: 'mission-purple' },
  { title: 'Chinh phục thử thách', text: '4 minigame, chơi không cần tài khoản', to: '#challenges', icon: Trophy, tone: 'mission-teal' },
] as const

export function Hero({ authenticated }: { authenticated: boolean }) {
  return <section className="landing-hero" aria-labelledby="hero-title">
    <div className="page-shell">
      <div className="landing-hero-grid">
        <div className="landing-banner">
          <div className="landing-banner-copy">
            <span>LỊCH SỬ VIỆT NAM · MỘT CÁCH KHÁM PHÁ MỚI</span>
            <h1 id="hero-title">Chạm vào quá khứ.<br />Viết tiếp niềm tự hào.</h1>
            <p>Đằng sau mỗi dấu mốc là một câu chuyện. Gặp gỡ những con người làm nên lịch sử và bắt đầu hành trình khám phá của riêng bạn.</p>
            <div className="landing-banner-actions"><Link className="landing-gold-button" to={authenticated ? '/home' : '/dang-nhap'}>{authenticated ? 'Vào trang học' : 'Bắt đầu khám phá'} <ArrowRight size={18} /></Link><a className="landing-glass-button" href="#characters">Gặp gỡ nhân vật <ArrowUpRight size={17} /></a></div>
          </div>
          <div className="landing-banner-quote">“Lịch sử không chỉ để nhớ,<br />mà để sống cùng.”</div>
        </div>

        <aside className="landing-hero-rail" aria-label="Điểm nổi bật">
          <article className="landing-panel landing-featured">
            <div className="landing-panel-heading"><h2>Nhân vật AI nổi bật</h2><a href="#characters">Xem tất cả <ArrowRight size={14} /></a></div>
            <div className="landing-featured-body"><img src="/images/characters/tran-hung-dao.webp" alt="Minh họa Trần Hưng Đạo" fetchPriority="high" /><div><strong>Trần Hưng Đạo</strong><small>(1228 – 1300)</small><p>“Cùng tìm hiểu hào khí Đông A và những trang sử thời Trần.”</p></div></div>
            <a className="landing-gold-button landing-featured-action" href="#characters"><MessageCircle size={17} /> Trò chuyện ngay <ArrowRight size={17} /></a>
          </article>
          <article className="landing-panel landing-promises">
            <h2>Học sử theo cách mới</h2>
            <ul>{['Bám sát SGK lớp 6–12', 'Câu trả lời có trích nguồn', 'Chơi ngay, không cần đăng nhập'].map((item) => <li key={item}><span><Check size={14} /></span>{item}</li>)}</ul>
          </article>
        </aside>
      </div>

      <div className="landing-block" aria-labelledby="landing-era-title">
        <div className="landing-block-heading"><h2 id="landing-era-title">Chọn giai đoạn lịch sử</h2><a href="#timeline">Xem dòng thời gian <ArrowRight size={15} /></a></div>
        <div className="dashboard-era-grid">{eras.map((era) => <Link className="dashboard-era" key={era.title} to="/home" state={{ lessonId: era.lessonId, grade: era.grade }}><img src={`/images/dashboard/${era.image}.webp`} alt="" loading="lazy" /><strong>{era.title}</strong></Link>)}</div>
      </div>

      <div className="landing-block" id="features" aria-labelledby="landing-feature-title">
        <div className="landing-block-heading"><h2 id="landing-feature-title">Bạn có thể làm gì ở Xuyên Sử Ký?</h2></div>
        <div className="dashboard-mission-grid">{features.map(({ title, text, to, icon: Icon, tone }) => {
          const content = <><span><Icon size={26} /></span><strong>{title}</strong><small>{text}</small><ArrowRight size={17} /></>
          return to.startsWith('#') ? <a className={`dashboard-mission ${tone}`} key={title} href={to}>{content}</a> : <Link className={`dashboard-mission ${tone}`} key={title} to={to}>{content}</Link>
        })}</div>
      </div>
    </div>
  </section>
}

export function LandingCta({ authenticated, onTryGuest }: { authenticated: boolean; onTryGuest: () => void }) {
  return <section className="landing-cta" aria-labelledby="landing-cta-title"><div className="page-shell"><div className="landing-cta-card">
    <div><span>SẴN SÀNG BẮT ĐẦU?</span><h2 id="landing-cta-title">{authenticated ? 'Tiếp tục hành trình học sử của bạn' : 'Mở trang học của riêng bạn'}</h2><p>{authenticated ? 'Bài học, tiến độ và nhân vật đang chờ bạn ở trang học.' : 'Đăng nhập để lưu tiến độ, XP và ghi chú, hoặc học thử ngay không cần tài khoản.'}</p></div>
    <div className="landing-cta-actions">{authenticated
      ? <Link className="landing-gold-button" to="/home">Vào trang học <ArrowRight size={18} /></Link>
      : <><Link className="landing-gold-button" to="/dang-nhap">Đăng nhập <ArrowRight size={18} /></Link><button type="button" className="landing-glass-button" onClick={onTryGuest}>Học thử không cần tài khoản</button></>}</div>
  </div></div></section>
}

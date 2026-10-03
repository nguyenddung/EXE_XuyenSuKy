import { ArrowRight, ArrowUpRight, BookOpen, Landmark, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Hero() {
  return <>
    <section className="heritage-hero" aria-labelledby="hero-title">
      <div className="page-shell heritage-grid">
        <div className="heritage-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> LỊCH SỬ VIỆT NAM · MỘT CÁCH KHÁM PHÁ MỚI</div>
          <h1 id="hero-title">Chạm vào quá khứ.<br /><em>Viết tiếp</em><br />niềm tự hào.</h1>
          <p>Đằng sau mỗi dấu mốc là một câu chuyện. Gặp gỡ những con người làm nên lịch sử và bắt đầu hành trình khám phá của riêng bạn.</p>
          <div className="hero-actions"><Link className="button-primary" to="/home">Bắt đầu khám phá <ArrowRight size={18} /></Link><a className="hero-secondary" href="#characters">Gặp gỡ nhân vật <ArrowUpRight size={18} /></a></div>
          <div className="hero-footnote"><BookOpen size={17} /><span>Học theo lớp 6–12</span><i /><span>Khám phá qua câu chuyện</span></div>
        </div>
        <div className="heritage-gallery">
          <div className="gallery-outline" aria-hidden="true" />
          <figure className="hero-photo hero-photo-main"><img src="/images/characters/tran-hung-dao.webp" alt="Minh họa hoạt hình Trần Hưng Đạo" fetchPriority="high" /><figcaption><span>HÀO KHÍ ĐÔNG A</span><strong>Trần Hưng Đạo</strong><small>Minh họa nhân vật · Nhà Trần</small></figcaption></figure>
          <figure className="hero-photo hero-photo-small"><img src="/images/characters/quang-trung.webp" alt="Minh họa hoạt hình vua Quang Trung" /><figcaption><span>TÂY SƠN</span><strong>Quang Trung</strong></figcaption></figure>
          <div className="gallery-stamp"><Landmark size={24} /><span>DẤU ẤN<br /><b>VIỆT NAM</b></span></div>
          <a href="#image-credits" className="hero-image-note">Minh họa lịch sử · Về bộ ảnh <ArrowUpRight size={12} /></a>
        </div>
      </div>
    </section>
    <div className="heritage-ribbon"><div className="page-shell"><span><Sparkles size={17} /> Lịch sử không chỉ là những con số</span><span>Hiểu câu chuyện</span><i>✦</i><span>Gặp nhân vật</span><i>✦</i><span>Chinh phục thử thách</span></div></div>
  </>
}

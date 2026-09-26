import { ArrowRight, Compass, Sparkles } from 'lucide-react'

function HeroArtwork() {
  return (
    <div className="hero-art" aria-label="Minh họa hành trình qua các thời kỳ lịch sử Việt Nam" role="img">
      <div className="hero-art-glow" />
      <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
      <div className="art-label art-label-top"><span className="tiny-sun">✦</span> HÀNH TRÌNH KHÁM PHÁ</div>
      <svg viewBox="0 0 590 480" className="hero-illustration" aria-hidden="true">
        <defs>
          <linearGradient id="hill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#75a6a2" /><stop offset="1" stopColor="#357b7c" /></linearGradient>
          <linearGradient id="river" x1="0" x2="1"><stop stopColor="#dcf0e6" /><stop offset="1" stopColor="#b4d6cc" /></linearGradient>
          <linearGradient id="sun" x1="0" x2="1"><stop stopColor="#f5d399" /><stop offset="1" stopColor="#eeb969" /></linearGradient>
        </defs>
        <circle cx="295" cy="220" r="177" fill="#e5eee4" />
        <circle cx="296" cy="176" r="110" fill="url(#sun)" />
        <path d="M118 283c50-68 83-59 133-4 41-90 99-108 156-33 23-39 46-41 77-5v117H118Z" fill="#a5c5b7" />
        <path d="M107 327c71-107 128-91 170-32 53-83 99-66 135-16 36-40 80-46 116 18v76H107Z" fill="url(#hill)" />
        <path d="M99 350c88-22 135-10 180 15 83 47 170 24 239-20v81H99Z" fill="url(#river)" />
        <path d="M84 391c93-27 168-15 211 2 89 33 157 26 232-9" fill="none" stroke="#f7f6e9" strokeWidth="9" strokeLinecap="round" opacity=".8" />
        <path d="M210 295h161l-13-22H223Z" fill="#153b40" />
        <path d="M238 274h107v-76H238Z" fill="#fff6dc" />
        <path d="M231 202h121l-19-15h-84Z" fill="#c8644e" />
        <path d="M218 184h146l-20-15H238Z" fill="#193e43" />
        <path d="M228 169h126l-25-13h-76Z" fill="#d17252" />
        <path d="M259 155h61l-8-22h-45Z" fill="#193e43" />
        <path d="M238 228h107M244 251h95" stroke="#d4c09a" strokeWidth="4" />
        <path d="M257 274v-57m28 57v-57m28 57v-57m28 57v-57" stroke="#a16e51" strokeWidth="7" />
        <path d="M285 272v-35a16 16 0 0 1 32 0v35" fill="#244b4b" />
        <path d="M158 327c-9-42-5-73 6-97m0 60c-17-18-24-42-26-59m27 36c16-16 24-39 27-59" stroke="#244d4b" strokeWidth="6" strokeLinecap="round" />
        <path d="M142 228c-20-13-24-31-7-46 11-11 29-8 31 8 11-20 35-17 39 3 2 18-16 27-39 38" fill="#4c8980" />
        <path d="M443 329c-4-28-2-50 5-69m0 42c-15-11-22-28-24-42m24 26c15-14 18-30 22-43" stroke="#2d6663" strokeWidth="5" strokeLinecap="round" />
        <path d="M414 248c-4-23 15-39 33-25 12-22 43-15 42 12 0 17-15 26-43 30" fill="#5b9788" />
        <path d="M130 371c46-8 86-4 122 5" stroke="#7aa99d" strokeWidth="3" strokeLinecap="round" opacity=".6" />
        <path d="M359 384c34 4 75 1 112-11" stroke="#7aa99d" strokeWidth="3" strokeLinecap="round" opacity=".6" />
        <path d="M113 108l7 17 17 7-17 7-7 17-7-17-17-7 17-7Z" fill="#e9b76b" />
        <path d="M474 108l5 12 12 5-12 5-5 12-5-12-12-5 12-5Z" fill="#e9b76b" />
      </svg>
      <div className="art-year year-one"><span>938</span><small>Khởi đầu</small></div>
      <div className="art-year year-two"><span>1288</span><small>Hào khí Đông A</small></div>
      <div className="art-year year-three"><span>1945</span><small>Độc lập</small></div>
      <div className="art-compass"><Compass size={23} strokeWidth={1.8} /></div>
      <div className="art-caption">Mỗi trang sử là một cuộc phiêu lưu <span>✦</span></div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="hero-section overflow-hidden" aria-labelledby="hero-title">
      <div className="page-shell grid min-h-[630px] items-center gap-10 py-14 lg:grid-cols-[.95fr_1.05fr] lg:gap-6 lg:py-16">
        <div className="hero-copy relative z-10">
          <div className="eyebrow"><Sparkles size={15} /> HỌC LỊCH SỬ THEO CÁCH CỦA BẠN</div>
          <h1 id="hero-title" className="hero-title">Du hành xuyên <span>lịch sử</span> Việt Nam</h1>
          <p className="hero-description">Khám phá lịch sử, gặp gỡ nhân vật và chinh phục thử thách qua từng thời đại.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="button-primary" href="#classes">Bắt đầu hành trình <ArrowRight size={18} /></a>
            <a className="button-outline" href="#timeline">Khám phá lịch sử</a>
          </div>
          <div className="hero-proof"><span className="proof-icons"><i>M</i><i>A</i><i>L</i></span><span>Một hành trình dành riêng cho bạn <strong>✦</strong></span></div>
        </div>
        <HeroArtwork />
      </div>
    </section>
  )
}

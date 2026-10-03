import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Bell, BookOpen, Check, ChevronDown, Compass, Flame, Home, Menu, MessageCircle, Search, ShieldCheck, Sparkles, Trophy, UserRound, X } from 'lucide-react'
import { challengeActivities, demoAccount } from '../data/demo'
import { rankingsFor } from '../data/leaderboard'
import type { DemoActivity } from '../data/demo'
import type { GameId } from '../data/minigames'
import type { DemoSession } from '../hooks/useDemoSession'
import type { Character } from '../types'
import { historyApi, type HistoryChunk, type HistoryLesson, type PageResult } from '../lib/historyApi'
import { eras } from '../data/eras'

const featuredLessons = [
  { id: 'LS6_B18', image: 'bach-dang-938', eyebrow: 'Bước ngoặt độc lập', fallback: 'Bước ngoặt lịch sử đầu thế kỉ X' },
  { id: 'LS7_B15', image: 'ly', eyebrow: 'Đại Việt thời Lý', fallback: 'Công cuộc xây dựng và bảo vệ đất nước thời Lý' },
  { id: 'LS8_B08', image: 'tay-son', eyebrow: 'Phong trào Tây Sơn', fallback: 'Phong trào Tây Sơn' },
] as const

const navigation = [
  { label: 'Trang chủ', href: '#dashboard', icon: Home },
  { label: 'Học tập', href: '#library', icon: BookOpen },
  { label: 'Khám phá', href: '#timeline', icon: Compass },
  { label: 'Nhân vật AI', href: '#characters', icon: UserRound },
  { label: 'Thử thách', href: '#challenges', icon: Trophy },
  { label: 'Bảng xếp hạng', href: '#progress', icon: ShieldCheck },
] as const

interface Props {
  children: ReactNode
  session: DemoSession
  readCount: number
  gradeCount: number
  recommendedLessonId?: string
  learningStreak: number
  onLogin: () => void
  onLogout: () => void
  onOpenLesson: (id: string) => void
  onSelectGrade: (grade: number) => void
  onQuiz: (activity: DemoActivity) => void
  onGame: (game: GameId) => void
  onChat: (character: Character) => void
}

export function Dashboard({ children, session, readCount, gradeCount, recommendedLessonId, learningStreak, onLogin, onLogout, onOpenLesson, onSelectGrade, onQuiz, onGame, onChat }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeHref, setActiveHref] = useState('#dashboard')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchResults, setSearchResults] = useState<HistoryChunk[]>([])
  const [featured, setFeatured] = useState<Character | null>(null)
  const [lessons, setLessons] = useState<Record<string, HistoryLesson>>({})
  const percent = gradeCount ? Math.min(100, Math.round(readCount / gradeCount * 100)) : 0
  const gameCount = session.completedActivities.filter((id) => id.startsWith('minigame-')).length
  const ranks = rankingsFor(session)

  useEffect(() => {
    const controller = new AbortController()
    historyApi<{ items: Character[] }>('characters', controller.signal).then((data) => setFeatured(data.items.find((item) => item.id === 'tran-hung-dao') || data.items[0] || null)).catch(() => {})
    historyApi<PageResult<HistoryLesson>>(`lessons?ids=${featuredLessons.map((item) => item.id).join(',')}`, controller.signal).then((data) => setLessons(Object.fromEntries(data.items.map((lesson) => [lesson.id, lesson])))).catch(() => {})
    return () => controller.abort()
  }, [])

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (query.trim().length < 2) { setSearchError('Nhập ít nhất 2 ký tự để tìm kiếm.'); setSearchOpen(true); return }
    setSearchBusy(true); setSearchOpen(true); setSearchError(''); setSearchResults([])
    try {
      const data = await historyApi<PageResult<HistoryChunk>>(`search?q=${encodeURIComponent(query.trim())}&limit=5`)
      setSearchResults(data.items)
    } catch (error) { setSearchError((error as Error).message) }
    finally { setSearchBusy(false) }
  }

  function openLesson(id: string) {
    setSearchOpen(false)
    onOpenLesson(id)
    window.setTimeout(() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  function openEra(grade: number, lessonId: string) {
    onSelectGrade(grade)
    openLesson(lessonId)
  }

  return <div className="dashboard-app" id="top">
    {menuOpen && <button className="dashboard-scrim" type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
    <aside className={`dashboard-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Điều hướng học tập">
      <a href="#dashboard" className="dashboard-brand" onClick={() => setMenuOpen(false)}><span className="dashboard-brand-mark">史</span><strong>Xuyên Sử Ký</strong></a>
      <nav className="dashboard-nav" aria-label="Các khu vực"><span className="dashboard-nav-caption">KHÁM PHÁ</span>{navigation.map(({ label, href, icon: Icon }) => <a key={href} href={href} className={activeHref === href ? 'is-active' : ''} aria-current={activeHref === href ? 'page' : undefined} onClick={() => { setActiveHref(href); setMenuOpen(false) }}><Icon size={20} strokeWidth={2} /><span>{label}</span></a>)}</nav>
      <div className="dashboard-sidebar-promo"><div className="dashboard-sidebar-art" /><div className="dashboard-sidebar-promo-copy"><span>HÀNH TRÌNH CỦA BẠN</span><strong>Mỗi ngày một trang sử mới</strong><p>Học · Khám phá · Trải nghiệm cùng các nhân vật lịch sử</p><a href="#library" onClick={() => setMenuOpen(false)}>Bắt đầu học <ArrowRight size={17} /></a></div></div>
    </aside>

    <div className="dashboard-main">
      <header className="dashboard-topbar">
        <button className="dashboard-menu-button" type="button" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
        <form className="dashboard-search" role="search" onSubmit={submitSearch}><Search size={19} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => { if (searchResults.length || searchError) setSearchOpen(true) }} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false) }} aria-label="Tìm sự kiện, nhân vật, thời kỳ" placeholder="Tìm kiếm sự kiện, nhân vật, thời kỳ..." /><button type="submit">Tìm</button></form>
        <div className="dashboard-top-actions"><a className="dashboard-notification" href="#daily-missions" aria-label="Xem nhiệm vụ hôm nay"><Bell size={21} /><i /></a><div className="dashboard-account"><button type="button" className="dashboard-account-button" aria-expanded={profileOpen} aria-label="Tài khoản" onClick={() => setProfileOpen(!profileOpen)}><span className={`dashboard-account-avatar ${session.loggedIn ? '' : 'is-guest'}`}>{session.loggedIn ? demoAccount.avatar : 'K'}</span><span><strong>{session.loggedIn ? demoAccount.name : 'Khách'}</strong><small>{session.loggedIn ? `Học sinh lớp ${session.grade}` : `Học thử · Lớp ${session.grade}`}</small></span><ChevronDown size={16} /></button>{profileOpen && <div className="dashboard-account-menu"><a href="#progress" onClick={() => setProfileOpen(false)}>Xem tiến độ</a>{!session.loggedIn && <button onClick={() => { onLogin(); setProfileOpen(false) }}>Đăng nhập để lưu tiến độ</button>}<a href="/" onClick={(event) => { event.preventDefault(); setProfileOpen(false); onLogout() }}>{session.loggedIn ? 'Đăng xuất' : 'Thoát chế độ học thử'}</a></div>}</div></div>
        {searchOpen && <div className="dashboard-search-results" role="region" aria-label="Kết quả tìm kiếm"><div className="dashboard-search-results-head"><strong>Kết quả trong sách giáo khoa</strong><button type="button" aria-label="Đóng kết quả tìm kiếm" onClick={() => setSearchOpen(false)}><X size={17} /></button></div>{searchBusy ? <p>Đang tìm tư liệu…</p> : searchError ? <p role="alert">{searchError}</p> : searchResults.length ? searchResults.map((result) => <button type="button" key={result.id} onClick={() => openLesson(result.lessonId)}><BookOpen size={16} /><span><strong>{result.lessonTitle}</strong><small>Lớp {result.grade} · {result.sectionTitle}</small></span><ArrowRight size={15} /></button>) : <p>Chưa tìm thấy tư liệu. Thử từ khóa khác nhé.</p>}</div>}
      </header>

      <main className="dashboard-overview" id="dashboard">
        {!session.loggedIn && <div className="dashboard-guest-banner" role="status"><span><Sparkles size={16} /></span><p><strong>Bạn đang học thử.</strong> Tiến độ chỉ lưu trên trình duyệt này; quiz và hồ sơ cần tài khoản.</p><button type="button" onClick={onLogin}>Đăng nhập</button></div>}
        <div className="dashboard-overview-grid">
          <div className="dashboard-primary">
            <section className="dashboard-hero" aria-labelledby="dashboard-title"><div className="dashboard-hero-copy"><span>CHÀO MỪNG ĐẾN VỚI XUYÊN SỬ KÝ</span><h1 id="dashboard-title">Hành trình khám phá<br />Lịch sử Việt Nam</h1><p>Khám phá quá khứ để hiểu hiện tại,<br />kiến tạo tương lai.</p><button type="button" onClick={() => openLesson(recommendedLessonId || `LS${session.grade}_B01`)}>Tiếp tục học <ArrowRight size={18} /></button></div><div className="dashboard-hero-quote">“Lịch sử không chỉ để nhớ,<br />mà để sống cùng.”</div></section>

            <section className="dashboard-section" aria-labelledby="era-title"><div className="dashboard-section-heading"><h2 id="era-title">Chọn giai đoạn lịch sử</h2><a href="#timeline">Xem tất cả <ArrowRight size={15} /></a></div><div className="dashboard-era-grid">{eras.map((era) => <button type="button" className="dashboard-era" key={era.title} onClick={() => openEra(era.grade, era.lessonId)}><img src={`/images/dashboard/${era.image}.webp`} alt="" loading="lazy" /><strong>{era.title}</strong></button>)}</div></section>

            <section className="dashboard-section" id="daily-missions" aria-labelledby="missions-title"><div className="dashboard-section-heading"><h2 id="missions-title">Nhiệm vụ hôm nay</h2></div><div className="dashboard-mission-grid"><button className="dashboard-mission mission-blue" onClick={() => openLesson(`LS${session.grade}_B01`)}><span><BookOpen size={27} /></span><strong>Hoàn thành<br />bài học</strong><small>Mở bài lớp {session.grade}</small><ArrowRight size={17} /></button><button className="dashboard-mission mission-orange" onClick={() => onQuiz(challengeActivities.quiz)}><span><Check size={26} /></span><strong>Làm câu quiz</strong><small>Ôn tập kiến thức</small><ArrowRight size={17} /></button><button className="dashboard-mission mission-purple" onClick={() => featured ? onChat(featured) : document.getElementById('characters')?.scrollIntoView({ behavior: 'smooth' })}><span><MessageCircle size={27} /></span><strong>Trò chuyện với<br />nhân vật AI</strong><small>Đặt một câu hỏi</small><ArrowRight size={17} /></button><button className="dashboard-mission mission-teal" onClick={() => onGame('timeline')}><span><Trophy size={27} /></span><strong>Tham gia thử thách</strong><small>Thử thách tuần</small><ArrowRight size={17} /></button></div></section>

            <section className="dashboard-section" aria-labelledby="lessons-title"><div className="dashboard-section-heading"><h2 id="lessons-title">Bài học đề xuất</h2><a href="#library">Xem tất cả <ArrowRight size={15} /></a></div><div className="dashboard-lesson-grid">{featuredLessons.map((item) => <button type="button" className="dashboard-lesson" key={item.id} onClick={() => openLesson(item.id)}><div className="dashboard-lesson-image"><img src={`/images/dashboard/${item.image}.webp`} alt="" loading="lazy" /><span>{item.eyebrow}</span></div><div className="dashboard-lesson-copy"><strong>{lessons[item.id]?.title || item.fallback}</strong><small>SGK lớp {lessons[item.id]?.grade || Number(item.id.slice(2, 3))} · Đọc bài và lưu ghi chú</small><span><ArrowRight size={18} /></span></div></button>)}</div></section>
          </div>

          <div className="dashboard-rail">
            <section className="dashboard-panel dashboard-progress" aria-labelledby="dash-progress-title"><div className="dashboard-panel-heading"><h2 id="dash-progress-title">Tiến độ học tập</h2><a href="#progress">Xem chi tiết <ArrowRight size={14} /></a></div><div className="dashboard-progress-body"><div className="dashboard-progress-ring" style={{ '--progress': `${percent}%` } as CSSProperties} role="progressbar" aria-label="Tỉ lệ bài đã đọc của lớp hiện tại" aria-valuenow={readCount} aria-valuemin={0} aria-valuemax={gradeCount || 1}><strong>{gradeCount ? `${percent}%` : '…'}</strong><small>Hoàn thành<br />bài lớp {session.grade}</small></div><div className="dashboard-progress-stats"><div><span className="stat-icon stat-amber"><BookOpen size={15} /></span><span>Bài học đã đọc</span><strong>{readCount}/{gradeCount || '…'}</strong></div><div><span className="stat-icon stat-green"><ShieldCheck size={15} /></span><span>Hoạt động</span><strong>{session.completedActivities.length}</strong></div><div><span className="stat-icon stat-blue"><Trophy size={15} /></span><span>XP đã nhận</span><strong>{session.earnedXp}</strong></div><div><span className="stat-icon stat-red"><Flame size={15} /></span><span>Chuỗi học tập</span><strong>{learningStreak} ngày</strong></div></div></div></section>

            <section className="dashboard-panel dashboard-featured" aria-labelledby="dash-featured-title"><div className="dashboard-panel-heading"><h2 id="dash-featured-title">Nhân vật AI nổi bật</h2><a href="#characters">Xem tất cả <ArrowRight size={14} /></a></div><div className="dashboard-featured-body"><img src="/images/characters/tran-hung-dao.webp" alt="Minh họa Trần Hưng Đạo" /><div><strong>Trần Hưng Đạo</strong><small>(1228 – 1300)</small><p>“Cùng tìm hiểu hào khí Đông A và những trang sử thời Trần.”</p></div></div><button type="button" className="dashboard-yellow-button" onClick={() => featured ? onChat(featured) : document.getElementById('characters')?.scrollIntoView({ behavior: 'smooth' })}><MessageCircle size={17} /> Trò chuyện ngay <ArrowRight size={17} /></button></section>

            <section className="dashboard-panel dashboard-ranking" aria-labelledby="dash-ranking-title"><div className="dashboard-panel-heading"><h2 id="dash-ranking-title">Bảng xếp hạng</h2><a href="#progress">Xem tất cả <ArrowRight size={14} /></a></div>{ranks.map((entry, index) => <div className={`dashboard-rank ${entry.isMe ? 'is-me' : ''}`} key={entry.name}><span className="dashboard-rank-number">{index + 1}</span><span className="dashboard-rank-avatar">{entry.avatar}</span><strong>{entry.name}</strong><span>{entry.xp.toLocaleString('vi-VN')}</span></div>)}</section>
          </div>
        </div>
        <section className="dashboard-weekly"><span className="dashboard-weekly-icon"><Trophy size={25} /></span><div><small>THỬ THÁCH ĐẶC BIỆT</small><strong>Khám phá các dấu mốc lịch sử Việt Nam</strong><p>Hoàn thành minigame để nhận XP và khám phá điều mới.</p></div><div className="dashboard-weekly-progress"><div><span style={{ width: `${gameCount / 4 * 100}%` }} /></div><small>{gameCount}/4</small></div><div className="dashboard-weekly-badges" aria-label={`${gameCount} trong 4 thử thách đã hoàn thành`}>{Array.from({ length: 4 }, (_, index) => <span className={index < gameCount ? 'earned' : ''} key={index}>{index < gameCount ? <Check size={16} /> : <Sparkles size={16} />}</span>)}</div><button type="button" className="dashboard-yellow-button" onClick={() => onGame('timeline')}>Tham gia ngay <ArrowRight size={17} /></button></section>
      </main>
      <div className="dashboard-deeper">{children}</div>
    </div>
  </div>
}

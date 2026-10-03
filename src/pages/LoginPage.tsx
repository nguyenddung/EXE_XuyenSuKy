import { ArrowLeft, ArrowRight, BookOpen, MessageCircle, Trophy } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate, type Location } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'
import { hasAppAccess, useDemoSession } from '../hooks/useDemoSession'

const perks = [
  { icon: BookOpen, text: 'Bài học SGK lớp 6–12 có trích nguồn' },
  { icon: MessageCircle, text: 'Trò chuyện với nhân vật lịch sử' },
  { icon: Trophy, text: 'Minigame, XP và bảng xếp hạng' },
]

export function LoginPage() {
  const { session, login, startGuest } = useDemoSession()
  const navigate = useNavigate()
  const location = useLocation()
  // A protected page that sent the visitor here; sign-in returns there with its state (e.g. a lesson to open).
  const from = (location.state as { from?: Location } | null)?.from
  const destination = from ? `${from.pathname}${from.hash}` : '/home'
  const enter = () => navigate(destination, { replace: true, state: from?.state })

  if (hasAppAccess(session)) return <Navigate to={destination} replace state={from?.state} />

  return <div className="auth-page">
    <aside className="auth-art" aria-hidden="true">
      <div className="auth-art-copy">
        <span className="auth-brand"><span className="brand-mark">史</span><strong>Xuyên Sử Ký</strong></span>
        <h2>Mỗi ngày một trang sử mới</h2>
        <ul>{perks.map(({ icon: Icon, text }) => <li key={text}><span><Icon size={17} /></span>{text}</li>)}</ul>
        <p>“Lịch sử không chỉ để nhớ, mà để sống cùng.”</p>
      </div>
    </aside>
    <main className="auth-main">
      <Link to="/" className="auth-back"><ArrowLeft size={16} /> Về trang giới thiệu</Link>
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="section-kicker">TÀI KHOẢN HỌC SINH</span>
        <h1 id="auth-title">Đăng nhập Xuyên Sử Ký</h1>
        <p>Tiếp tục hành trình học sử, giữ tiến độ, XP và ghi chú của bạn.</p>
        <LoginForm onLogin={(email, password) => { if (!login(email, password)) return false; enter(); return true }} />
        <div className="auth-divider"><span>hoặc</span></div>
        <button type="button" className="button-outline auth-guest" onClick={() => { startGuest(); enter() }}>Học thử không cần tài khoản <ArrowRight size={17} /></button>
        <small>Chế độ học thử lưu tiến độ trên trình duyệt này. Quiz và hồ sơ cần đăng nhập. Đây là bản demo, không dùng xác thực thật.</small>
      </section>
    </main>
  </div>
}

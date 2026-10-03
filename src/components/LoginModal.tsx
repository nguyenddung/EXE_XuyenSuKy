import { useEffect } from 'react'
import { LockKeyhole, X } from 'lucide-react'
import { LoginForm } from './LoginForm'

interface Props { onClose: () => void; onLogin: (email: string, password: string) => boolean }

// In-app sign-in for guests who reach an activity that needs an account (quiz, saved profile).
export function LoginModal({ onClose, onLogin }: Props) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = oldOverflow }
  }, [onClose])

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="login-title" className="login-modal">
    <button type="button" className="modal-close" aria-label="Đóng đăng nhập" onClick={onClose}><X size={21} /></button>
    <span className="login-symbol"><LockKeyhole size={25} /></span><span className="section-kicker">CẦN TÀI KHOẢN</span><h2 id="login-title">Đăng nhập để tiếp tục</h2><p>Hoạt động này cần tài khoản để ghi nhận XP và lưu hồ sơ học tập của bạn.</p>
    <LoginForm onLogin={onLogin} />
    <small>Chỉ là luồng demo phía trình duyệt, không dùng xác thực thật.</small>
  </section></div>
}

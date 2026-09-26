import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LockKeyhole, X } from 'lucide-react'
import { demoAccount } from '../data/demo'

interface Props { onClose: () => void; onLogin: (email: string, password: string) => boolean }

export function LoginModal({ onClose, onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = oldOverflow }
  }, [onClose])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!onLogin(email, password)) setError('Thông tin chưa đúng. Hãy dùng tài khoản mẫu bên dưới.')
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="login-title" className="login-modal">
    <button type="button" className="modal-close" aria-label="Đóng đăng nhập" onClick={onClose}><X size={21} /></button>
    <span className="login-symbol"><LockKeyhole size={25} /></span><span className="section-kicker">TÀI KHOẢN DEMO</span><h2 id="login-title">Chào mừng trở lại!</h2><p>Đăng nhập để mở bài học, nhận XP và tiếp tục hành trình của Minh.</p>
    <form onSubmit={submit} className="login-form"><label htmlFor="demo-email">Email</label><input ref={emailRef} id="demo-email" type="email" autoComplete="username" value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="minh@xuyensuki.vn" required /><label htmlFor="demo-password">Mật khẩu</label><input id="demo-password" type="password" autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setError('') }} placeholder="Nhập mật khẩu demo" required />{error && <div className="form-error" role="alert">{error}</div>}<button type="submit" className="button-primary">Đăng nhập <ArrowRight size={17} /></button></form>
    <div className="demo-credentials"><span>THỬ NHANH VỚI TÀI KHOẢN MẪU</span><strong>{demoAccount.email}</strong><code>{demoAccount.password}</code><button type="button" onClick={() => { setEmail(demoAccount.email); setPassword(demoAccount.password); setError('') }}>Điền tài khoản mẫu</button></div><small>Chỉ là luồng demo phía trình duyệt, không dùng xác thực thật.</small>
  </section></div>
}

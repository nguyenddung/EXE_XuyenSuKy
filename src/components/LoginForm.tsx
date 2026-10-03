import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { demoAccount } from '../data/demo'

interface Props { onLogin: (email: string, password: string) => boolean; autoFocus?: boolean }

export function LoginForm({ onLogin, autoFocus = true }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (autoFocus) emailRef.current?.focus() }, [autoFocus])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!onLogin(email, password)) setError('Thông tin chưa đúng. Hãy dùng tài khoản mẫu bên dưới.')
  }

  return <>
    <form onSubmit={submit} className="login-form"><label htmlFor="demo-email">Email</label><input ref={emailRef} id="demo-email" type="email" autoComplete="username" value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="minh@xuyensuki.vn" required /><label htmlFor="demo-password">Mật khẩu</label><input id="demo-password" type="password" autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setError('') }} placeholder="Nhập mật khẩu demo" required />{error && <div className="form-error" role="alert">{error}</div>}<button type="submit" className="button-primary">Đăng nhập <ArrowRight size={17} /></button></form>
    <div className="demo-credentials"><span>THỬ NHANH VỚI TÀI KHOẢN MẪU</span><strong>{demoAccount.email}</strong><code>{demoAccount.password}</code><button type="button" onClick={() => { setEmail(demoAccount.email); setPassword(demoAccount.password); setError('') }}>Điền tài khoản mẫu</button></div>
  </>
}

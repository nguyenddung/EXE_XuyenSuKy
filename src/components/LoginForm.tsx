import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { registerLocal } from '../lib/localAccount'
import { demoAccount } from '../data/demo'

interface Props { onLogin: (email: string, password: string) => Promise<boolean>; autoFocus?: boolean }

export function LoginForm({ onLogin, autoFocus = true }: Props) {
  const [registering, setRegistering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (autoFocus) emailRef.current?.focus() }, [autoFocus])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      if (registering) {
        if (password !== confirmation) throw new Error('Mật khẩu xác nhận chưa khớp.')
        await registerLocal(email, password)
      }
      if (!await onLogin(email, password)) setError('Email hoặc mật khẩu chưa đúng.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được tài khoản. Hãy kiểm tra lưu trữ trình duyệt.') }
    finally { setBusy(false) }
  }

  return <>
    <div className="auth-tabs" role="tablist" aria-label="Account"><button type="button" role="tab" disabled={busy} aria-selected={!registering} onClick={() => { setRegistering(false); setError('') }}>Đăng nhập</button><button type="button" role="tab" disabled={busy} aria-selected={registering} onClick={() => { setRegistering(true); setError('') }}>Đăng ký</button></div>
    <form onSubmit={submit} className="login-form"><label htmlFor="demo-email">Email</label><input ref={emailRef} id="demo-email" type="email" autoComplete="username" value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="minh@xuyensuki.vn" required /><label htmlFor="demo-password">Mật khẩu</label><input id="demo-password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 8 : undefined} value={password} onChange={event => { setPassword(event.target.value); setError('') }} placeholder="Nhập mật khẩu demo" required />{registering && <><label htmlFor="confirm-password">Xác nhận mật khẩu</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /><small>Tài khoản demo chỉ dùng trên trình duyệt này. Không dùng mật khẩu cá nhân.</small></>}{error && <div className="form-error" role="alert">{error}</div>}<button type="submit" disabled={busy} className="button-primary">{busy ? 'Đang xử lý…' : registering ? 'Tạo tài khoản' : 'Đăng nhập'} <ArrowRight size={17} /></button></form>
    {!registering && <div className="demo-credentials"><span>THỬ NHANH VỚI TÀI KHOẢN MẪU</span><strong>{demoAccount.email}</strong><code>{demoAccount.password}</code><button type="button" onClick={() => { setEmail(demoAccount.email); setPassword(demoAccount.password); setError('') }}>Điền tài khoản mẫu</button></div>}
  </>
}

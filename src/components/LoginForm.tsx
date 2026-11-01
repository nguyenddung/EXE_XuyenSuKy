import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { registerLocal } from '../lib/localAccount'
import { demoAccount } from '../data/demo'
import { demoStaff, findUserByEmail, readSchool, requestTeacher, writeSchool } from '../lib/school'
import { rememberDays } from '../hooks/useDemoSession'

interface Props {
  /** Resolves to true when signed in, otherwise to the message to show. */
  onLogin: (email: string, password: string, remember: boolean) => Promise<true | string>
  /** Receives the grade chosen while registering, once the new account is signed in. */
  onRegistered: (grade: number) => void
  autoFocus?: boolean
}
const grades = [6, 7, 8, 9, 10, 11, 12]

export function LoginForm({ onLogin, onRegistered, autoFocus = true }: Props) {
  const [registering, setRegistering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)
  const [grade, setGrade] = useState<number | null>(null)
  const [asTeacher, setAsTeacher] = useState(false)
  const [fullName, setFullName] = useState('')
  const [school, setSchool] = useState('')
  const [info, setInfo] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (autoFocus) emailRef.current?.focus() }, [autoFocus])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setInfo('')
    try {
      if (registering) {
        if (password !== confirmation) throw new Error('Mật khẩu xác nhận chưa khớp.')
        // Directory e-mails (sample students, teachers, admin) cannot be claimed by a new local account.
        if (findUserByEmail(readSchool(), email)) throw new Error('Email này đã có trong hệ thống. Hãy đăng nhập.')
        if (asTeacher && !fullName.trim()) throw new Error('Hãy nhập họ tên giáo viên.')
        await registerLocal(email, password)
        if (asTeacher) {
          writeSchool(requestTeacher(readSchool(), email, fullName, school))
          setRegistering(false); setPassword(''); setConfirmation('')
          setInfo('Đã gửi yêu cầu tài khoản giáo viên. Bạn đăng nhập được sau khi quản trị viên duyệt.')
          return
        }
      }
      const result = await onLogin(email, password, remember)
      if (result !== true) setError(result)
      else if (registering && grade) onRegistered(grade)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được tài khoản. Hãy kiểm tra lưu trữ trình duyệt.') }
    finally { setBusy(false) }
  }

  return <>
    <div className="auth-tabs" role="tablist" aria-label="Account"><button type="button" role="tab" disabled={busy} aria-selected={!registering} onClick={() => { setRegistering(false); setError('') }}>Đăng nhập</button><button type="button" role="tab" disabled={busy} aria-selected={registering} onClick={() => { setRegistering(true); setError('') }}>Đăng ký</button></div>
    <form onSubmit={submit} className="login-form"><label htmlFor="demo-email">Email</label><input ref={emailRef} id="demo-email" type="email" autoComplete="username" value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="minh@xuyensuki.vn" required /><label htmlFor="demo-password">Mật khẩu</label><input id="demo-password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 8 : undefined} value={password} onChange={event => { setPassword(event.target.value); setError('') }} placeholder="Nhập mật khẩu demo" required />{registering && <><label htmlFor="confirm-password">Xác nhận mật khẩu</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /><small>Tài khoản demo chỉ dùng trên trình duyệt này. Không dùng mật khẩu cá nhân.</small></>}{registering && <fieldset className="login-role"><legend>Bạn là</legend><label><input type="radio" name="register-role" checked={!asTeacher} onChange={() => setAsTeacher(false)} /><span>Học sinh</span></label><label><input type="radio" name="register-role" checked={asTeacher} onChange={() => setAsTeacher(true)} /><span>Giáo viên</span></label></fieldset>}{registering && asTeacher && <><label htmlFor="teacher-name">Họ và tên</label><input id="teacher-name" autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} maxLength={60} required /><label htmlFor="teacher-school">Trường</label><input id="teacher-school" value={school} onChange={event => setSchool(event.target.value)} maxLength={80} placeholder="THCS …" /><small>Tài khoản giáo viên cần quản trị viên duyệt trước khi dùng.</small></>}{registering && !asTeacher && <fieldset className="login-grade"><legend>Bạn đang học lớp mấy?</legend><div className="login-grade-options">{grades.map((value) => <label key={value}><input type="radio" name="register-grade" value={value} checked={grade === value} onChange={() => { setGrade(value); setError('') }} required /><span>Lớp {value}</span></label>)}</div><small>Bài học SGK sẽ theo lớp này. Có thể đổi lớp trong thư viện bất cứ lúc nào.</small></fieldset>}<label className="login-remember"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Ghi nhớ đăng nhập trong {rememberDays} ngày</label>{error && <div className="form-error" role="alert">{error}</div>}{info && <div className="form-info" role="status">{info}</div>}<button type="submit" disabled={busy} className="button-primary">{busy ? 'Đang xử lý…' : registering ? 'Tạo tài khoản' : 'Đăng nhập'} <ArrowRight size={17} /></button></form>
    {!registering && <div className="demo-credentials"><span>THỬ NHANH VỚI TÀI KHOẢN MẪU</span><strong>{demoAccount.email}</strong><code>{demoAccount.password}</code><button type="button" onClick={() => { setEmail(demoAccount.email); setPassword(demoAccount.password); setError('') }}>Điền tài khoản mẫu</button><div className="demo-staff" role="group" aria-label="Tài khoản mẫu theo vai trò"><span>Vai trò khác:</span>{demoStaff.map((account) => <button key={account.role} type="button" aria-label={`Điền tài khoản ${account.label.toLowerCase()}`} onClick={() => { setEmail(account.email); setPassword(account.password); setError('') }}>{account.label}</button>)}</div></div>}
  </>
}

import { useEffect, useRef } from 'react'
import { LockKeyhole, X } from 'lucide-react'
import { LoginForm } from './LoginForm'

interface Props { onClose: () => void; onLogin: (email: string, password: string, remember: boolean) => Promise<boolean>; /** Why this action needs an account; defaults to the XP and profile explanation. */ reason?: string }

// In-app sign-in for guests who reach an activity that needs an account (quiz, saved profile, AI character conversations).
export function LoginModal({ onClose, onLogin, reason }: Props) {
  // A modal <dialog> sits in the top layer, so it also covers other open dialogs such as a journey mission that asks to interview a character.
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = oldOverflow }
  }, [])

  return <dialog ref={dialog} className="login-dialog" aria-labelledby="login-title" onCancel={event => { event.preventDefault(); onClose() }}><div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="login-modal">
    <button type="button" className="modal-close" aria-label="Đóng đăng nhập" onClick={onClose}><X size={21} /></button>
    <span className="login-symbol"><LockKeyhole size={25} /></span><span className="section-kicker">CẦN TÀI KHOẢN</span><h2 id="login-title">Đăng nhập để tiếp tục</h2><p>{reason || 'Hoạt động này cần tài khoản để ghi nhận XP và lưu hồ sơ học tập của bạn.'}</p>
    <LoginForm onLogin={onLogin} />
    <small>Chỉ là luồng demo phía trình duyệt, không dùng xác thực thật.</small>
  </section></div></dialog>
}

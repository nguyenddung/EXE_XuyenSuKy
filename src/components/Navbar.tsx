import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DemoSession } from '../hooks/useDemoSession'

// Landing-page sections only; the learning app is reached through the account actions on the right.
const links = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Dòng thời gian', href: '#timeline' },
  { label: 'Nhân vật', href: '#characters' },
  { label: 'Thử thách', href: '#challenges' },
]

interface Props { session: DemoSession; onLogout: () => void }

export function Navbar({ session, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const authenticated = session.loggedIn || session.guest
  const accountName = session.loggedIn ? session.name || 'Học sinh' : 'Khách'
  const accountRole = session.loggedIn ? 'Tài khoản học sinh' : 'Đang học thử'
  const avatar = session.loggedIn ? accountName.slice(0, 1).toUpperCase() : 'K'
  const signOutLabel = session.loggedIn ? 'Đăng xuất' : 'Thoát học thử'
  const close = () => setOpen(false)

  useEffect(() => {
    if (!accountOpen) return
    const closeOutside = (event: MouseEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setAccountOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [accountOpen])

  return (
    <header className="site-header sticky top-0 z-40 border-b backdrop-blur-md">
      <nav className="page-shell flex h-[70px] items-center justify-between gap-4" aria-label="Điều hướng chính">
        <a href="#top" className="brand flex shrink-0 items-center gap-2.5" onClick={() => { close(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="Xuyên Sử Ký, về đầu trang">
          <span className="brand-mark" aria-hidden="true">史</span>
          <span className="brand-text">Xuyên Sử Ký</span>
        </a>
        <div className="hidden items-center gap-7 lg:flex">
          {links.map((link) => <a key={link.href} className="nav-link" href={link.href}>{link.label}</a>)}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          {authenticated
            ? <><div className="nav-account" ref={accountRef}>
                <button type="button" className="nav-account-button" aria-haspopup="menu" aria-expanded={accountOpen} aria-label={`Tài khoản: ${accountName}`} onClick={() => setAccountOpen(!accountOpen)}>
                  <span className={`nav-account-avatar ${session.loggedIn ? '' : 'is-guest'}`} aria-hidden="true">{avatar}</span>{accountName}<ChevronDown size={15} aria-hidden="true" />
                </button>
                {accountOpen && <div className="nav-account-menu" role="menu">
                  <div className="nav-account-head"><strong>{accountName}</strong><small>{accountRole}</small></div>
                  <Link role="menuitem" to="/home"><LayoutDashboard size={16} /> Trang học của tôi</Link>
                  <button type="button" role="menuitem" onClick={() => { setAccountOpen(false); onLogout() }}><LogOut size={16} /> {signOutLabel}</button>
                </div>}
              </div><Link to="/home" className="login-button">Vào trang học <ArrowRight size={16} strokeWidth={2.2} /></Link></>
            : <><Link to="/dang-nhap" className="nav-link nav-signin">Đăng nhập</Link><Link to="/dang-nhap" className="login-button">Bắt đầu học <ArrowRight size={16} strokeWidth={2.2} /></Link></>}
        </div>
        <button type="button" className="mobile-menu-button lg:hidden" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </nav>
      {open && <div className="mobile-menu page-shell border-t py-4 lg:hidden">
        {links.map((link) => <a key={link.href} href={link.href} onClick={close}>{link.label}</a>)}
        {authenticated
          ? <><span className="mobile-account"><span className={`nav-account-avatar ${session.loggedIn ? '' : 'is-guest'}`} aria-hidden="true">{avatar}</span><span><strong>{accountName}</strong><small>{accountRole}</small></span></span><Link to="/home" onClick={close}>Vào trang học <ArrowRight size={16} /></Link><button type="button" onClick={() => { close(); onLogout() }}>{signOutLabel}</button></>
          : <><Link to="/dang-nhap" onClick={close}>Đăng nhập</Link><Link to="/dang-nhap" onClick={close}>Bắt đầu học <ArrowRight size={16} /></Link></>}
      </div>}
    </header>
  )
}

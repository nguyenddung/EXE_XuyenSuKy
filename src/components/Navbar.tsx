import { useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'

const links = [
  { label: 'Trang chủ', href: '/home' },
  { label: 'Thư viện', href: '#library' },
  { label: 'Dòng thời gian', href: '#timeline' },
  { label: 'Nhân vật', href: '#characters' },
  { label: 'Thử thách', href: '#challenges' },
]

interface Props { loggedIn: boolean; onLogin: () => void; onLogout: () => void }

export function Navbar({ loggedIn, onLogin, onLogout }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header sticky top-0 z-40 border-b backdrop-blur-md">
      <nav className="page-shell flex h-[70px] items-center justify-between gap-4" aria-label="Điều hướng chính">
        <a href="/" className="brand flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)} aria-label="Xuyên Sử Ký, về đầu trang">
          <span className="brand-mark" aria-hidden="true">史</span>
          <span className="brand-text">Xuyên Sử Ký</span>
        </a>
        <div className="hidden items-center gap-7 lg:flex">
          {links.map((link) => <a key={link.href} className="nav-link" href={link.href}>{link.label}</a>)}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          {loggedIn ? <><a href="/home#progress" className="account-link"><span>M</span> Minh · Hồ sơ</a><button type="button" className="logout-button" onClick={onLogout}>Đăng xuất</button></> : <button type="button" onClick={onLogin} className="login-button">Đăng nhập <ArrowUpRight size={16} strokeWidth={2.2} /></button>}
        </div>
        <button type="button" className="mobile-menu-button lg:hidden" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </nav>
      {open && <div className="mobile-menu page-shell border-t py-4 lg:hidden">
        {links.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}
        {loggedIn ? <><a href="/home#progress" onClick={() => setOpen(false)}>Minh · Hồ sơ</a><button type="button" onClick={() => { setOpen(false); onLogout() }}>Đăng xuất</button></> : <button type="button" onClick={() => { setOpen(false); onLogin() }}>Đăng nhập <ArrowUpRight size={16} /></button>}
      </div>}
    </header>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Menu, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'

export interface StaffNavItem { id: string; label: string; icon: LucideIcon }

interface Props {
  area: string
  title: string
  subtitle: string
  name: string
  roleLabel: string
  nav: StaffNavItem[]
  /** Links to the other areas this account may open (learning app, teacher area, admin). */
  areas: { to: string; label: string }[]
  onLogout: () => void
  children: ReactNode
}

// Shared frame of the teacher and admin areas, built on the learning dashboard's sidebar and top bar.
export function StaffLayout({ area, title, subtitle, name, roleLabel, nav, areas, onLogout, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); setProfileOpen(false) } }
    const outside = (event: MouseEvent) => { if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false) }
    document.addEventListener('keydown', keyboard)
    document.addEventListener('mousedown', outside)
    return () => { document.removeEventListener('keydown', keyboard); document.removeEventListener('mousedown', outside) }
  }, [])

  return <div className="dashboard-app staff-app">
    <a className="skip-learning-link" href="#staff-main">Đi đến nội dung</a>
    {menuOpen && <button className="dashboard-scrim" type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
    <aside className={`dashboard-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label={`Điều hướng ${area.toLowerCase()}`}>
      <Link to="/" className="dashboard-brand"><BrandLogo /></Link>
      <nav className="dashboard-nav" aria-label="Các mục">
        <span className="dashboard-nav-caption">{area.toUpperCase()}</span>
        {nav.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}><Icon size={20} strokeWidth={2} /><span>{label}</span></a>)}
        {areas.length > 0 && <span className="dashboard-nav-caption staff-nav-caption">KHU VỰC KHÁC</span>}
        {areas.map((item) => <Link key={item.to} to={item.to} className="staff-area-link">{item.label}</Link>)}
      </nav>
      <p className="staff-sidebar-note">Bản demo: dữ liệu lớp học và tài khoản lưu trên trình duyệt này. Bản chính thức kiểm tra quyền trên máy chủ.</p>
    </aside>
    <div className="dashboard-main">
      <header className="dashboard-topbar staff-topbar">
        <button className="dashboard-menu-button" type="button" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
        <div className="staff-topbar-title"><strong>{area}</strong></div>
        <div className="dashboard-top-actions"><div className="dashboard-account" ref={profileRef}>
          <button type="button" className="dashboard-account-button" aria-expanded={profileOpen} aria-label={`Tài khoản: ${name}`} onClick={() => setProfileOpen(!profileOpen)}>
            <span className="dashboard-account-avatar staff-avatar">{name.replace(/^(Cô|Thầy)\s+/, '').slice(0, 1).toUpperCase()}</span>
            <span><strong>{name}</strong><small>{roleLabel}</small></span><ChevronDown size={16} />
          </button>
          {profileOpen && <div className="dashboard-account-menu">
            {areas.map((item) => <Link key={item.to} to={item.to} onClick={() => setProfileOpen(false)}>{item.label}</Link>)}
            <button type="button" onClick={() => { setProfileOpen(false); onLogout() }}>Đăng xuất</button>
          </div>}
        </div></div>
      </header>
      <main className="staff-main" id="staff-main" tabIndex={-1}>
        <div className="staff-heading"><h1>{title}</h1><p>{subtitle}</p></div>
        {children}
      </main>
    </div>
  </div>
}

export function StaffStat({ label, value, tone = 'blue', icon: Icon }: { label: string; value: string | number; tone?: 'blue' | 'green' | 'amber' | 'red' | 'violet'; icon: LucideIcon }) {
  return <div className={`staff-stat tone-${tone}`}><span><Icon size={19} /></span><div><strong>{value}</strong><small>{label}</small></div></div>
}

export function StaffNotice({ message, tone = 'ok', onDone }: { message: string; tone?: 'ok' | 'error'; onDone: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onDone, 4500); return () => window.clearTimeout(timer) }, [message])
  return <div className={`staff-notice ${tone === 'error' ? 'is-error' : ''}`} role={tone === 'error' ? 'alert' : 'status'}>{message}</div>
}

export const formatDate = (value: string) => value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—'
export const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bell, X } from 'lucide-react'

export interface Notice { id: string; icon: ReactNode; title: string; detail: string; urgent?: boolean; onOpen: () => void }

const seenKey = 'xuyen-su-ky-notices-seen'
function readSeen(): string[] {
  try { const value = JSON.parse(localStorage.getItem(seenKey) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}
function writeSeen(ids: string[]) {
  try { localStorage.setItem(seenKey, JSON.stringify(ids.slice(-60))) } catch { /* storage unavailable: the dot just stays */ }
}

/** Bell in the dashboard top bar: opens a panel of what needs attention now. The red dot marks notices not opened yet. */
export function NotificationMenu({ notices }: { notices: Notice[] }) {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(readSeen)
  const root = useRef<HTMLDivElement>(null)
  const unseen = notices.filter(notice => !seen.includes(notice.id)).length

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])

  function toggle() {
    if (!open && unseen) { const next = [...new Set([...seen, ...notices.map(notice => notice.id)])]; setSeen(next); writeSeen(next) }
    setOpen(!open)
  }

  return <div className="dashboard-notifications" ref={root}>
    <button type="button" className="dashboard-notification" aria-expanded={open} aria-haspopup="true" aria-label={unseen ? `Thông báo, ${unseen} mới` : 'Thông báo'} onClick={toggle}><Bell size={21} />{unseen > 0 && <i />}</button>
    {open && <div className="dashboard-notification-panel" role="region" aria-label="Thông báo">
      <div className="dashboard-notification-head"><strong>Thông báo</strong><button type="button" aria-label="Đóng thông báo" onClick={() => setOpen(false)}><X size={17} /></button></div>
      {notices.length ? <ul>{notices.map(notice => <li key={notice.id}><button type="button" className={notice.urgent ? 'is-urgent' : ''} onClick={() => { setOpen(false); notice.onOpen() }}>
        <span className="dashboard-notification-icon">{notice.icon}</span>
        <span><strong>{notice.title}</strong><small>{notice.detail}</small></span>
      </button></li>)}</ul> : <p className="dashboard-notification-empty">Chưa có thông báo mới.</p>}
    </div>}
  </div>
}

import { useEffect, useMemo, useState } from 'react'
import { Activity, BookOpen, Check, ClipboardList, Database, History, Lock, LockOpen, RotateCcw, School, ShieldCheck, UserCheck, UsersRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StaffLayout, StaffNotice, StaffStat, formatDate, formatDateTime } from '../components/StaffLayout'
import { useDemoSession } from '../hooks/useDemoSession'
import { useSchool } from '../hooks/useSchool'
import { historyApi } from '../lib/historyApi'
import { findUserByEmail, reviewTeacher, roleLabels, setRole, setStatus, statusLabels, systemStats, userById, type Role } from '../lib/school'

const nav = [
  { id: 'overview', label: 'Tổng quan', icon: Activity },
  { id: 'requests', label: 'Duyệt giáo viên', icon: UserCheck },
  { id: 'users', label: 'Người dùng', icon: UsersRound },
  { id: 'classes', label: 'Lớp học', icon: School },
  { id: 'system', label: 'Hệ thống', icon: Database },
  { id: 'audit', label: 'Nhật ký', icon: History },
]
interface Health { datasetVersion: string; totals: { lessons: number; chunks: number; sections: number; books: number } }

export function AdminPage() {
  const navigate = useNavigate()
  const { session, logout } = useDemoSession()
  const { store, apply, reset } = useSchool()
  const actor = session.userId ? findUserByEmail(store, session.userId) : undefined
  const [notice, setNotice] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [health, setHealth] = useState<Health | null>(null)
  const [events, setEvents] = useState<number | null>(null)
  const [systemError, setSystemError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([historyApi<Health>('health', controller.signal), historyApi<{ total: number }>('events', controller.signal).catch(() => null)])
      .then(([data, list]) => { if (!controller.signal.aborted) { setHealth(data); setEvents(list?.total ?? null) } })
      .catch((error: Error) => { if (!controller.signal.aborted) setSystemError(error.message) })
    return () => controller.abort()
  }, [])

  const stats = systemStats(store)
  const pending = store.users.filter((user) => user.status === 'pending')
  const users = useMemo(() => {
    const terms = query.trim().toLowerCase()
    return store.users.filter((user) => user.status !== 'pending' && (roleFilter === 'all' || user.role === roleFilter) && (!terms || `${user.name} ${user.email}`.toLowerCase().includes(terms)))
      .sort((a, b) => ['admin', 'teacher', 'student'].indexOf(a.role) - ['admin', 'teacher', 'student'].indexOf(b.role) || a.name.localeCompare(b.name, 'vi'))
  }, [store.users, query, roleFilter])

  if (!actor) return null
  const run = (change: Parameters<typeof apply>[0], success: string) => {
    const error = apply(change)
    setNotice(error ? { message: error, tone: 'error' } : { message: success, tone: 'ok' })
  }

  return <StaffLayout area="Quản trị" title="Quản trị hệ thống" subtitle="Quản lý tài khoản, duyệt giáo viên và theo dõi dữ liệu của Xuyên Sử Ký." name={actor.name} roleLabel={roleLabels.admin} nav={nav} areas={[{ to: '/giao-vien', label: 'Khu giáo viên' }, { to: '/home', label: 'Trang học sinh' }]} onLogout={() => { logout(); navigate('/', { replace: true }) }}>
    {notice && <StaffNotice message={notice.message} tone={notice.tone} onDone={() => setNotice(null)} />}
    <div className="staff-stats" id="overview">
      <StaffStat icon={UsersRound} label="Học sinh" value={stats.students} />
      <StaffStat icon={ShieldCheck} label="Giáo viên" value={stats.teachers} tone="green" />
      <StaffStat icon={UserCheck} label="Chờ duyệt" value={stats.pending} tone="amber" />
      <StaffStat icon={School} label="Lớp đang hoạt động" value={stats.classes} tone="violet" />
      <StaffStat icon={Lock} label="Tài khoản bị khoá" value={stats.locked} tone="red" />
    </div>

    <section className="staff-card" id="requests" aria-labelledby="requests-title">
      <div className="staff-card-heading"><h2 id="requests-title">Yêu cầu tài khoản giáo viên</h2><span>{pending.length} chờ duyệt</span></div>
      {pending.length === 0 ? <p className="staff-empty">Không có yêu cầu nào đang chờ.</p> : <ul className="staff-requests">{pending.map((user) => <li key={user.id}>
        <span className="staff-person"><span className="staff-person-avatar">{user.name.replace(/^(Cô|Thầy)\s+/, '').slice(0, 1)}</span><span><strong>{user.name}</strong><small>{user.email}{user.school ? ` · ${user.school}` : ''} · gửi {formatDate(user.createdAt)}</small></span></span>
        <div className="staff-row-actions">
          <button type="button" className="staff-button" aria-label={`Duyệt ${user.name}`} onClick={() => run((current) => reviewTeacher(current, actor, user.id, true), `Đã duyệt tài khoản giáo viên ${user.name}.`)}><Check size={16} /> Duyệt</button>
          <button type="button" className="staff-button is-danger" aria-label={`Từ chối ${user.name}`} onClick={() => { if (window.confirm(`Từ chối và xoá yêu cầu của ${user.name}?`)) run((current) => reviewTeacher(current, actor, user.id, false), `Đã từ chối yêu cầu của ${user.name}.`) }}><X size={16} /> Từ chối</button>
        </div>
      </li>)}</ul>}
    </section>

    <section className="staff-card" id="users" aria-labelledby="users-title">
      <div className="staff-card-heading"><h2 id="users-title">Người dùng</h2><span>{users.length} tài khoản</span></div>
      <div className="staff-filters">
        <label><span className="sr-only">Tìm người dùng</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc email…" aria-label="Tìm người dùng" /></label>
        <div className="staff-segmented" role="group" aria-label="Lọc theo vai trò">{(['all', 'student', 'teacher', 'admin'] as const).map((value) => <button key={value} type="button" aria-pressed={roleFilter === value} onClick={() => setRoleFilter(value)}>{value === 'all' ? 'Tất cả' : roleLabels[value]}</button>)}</div>
      </div>
      <div className="staff-table-wrap"><table className="staff-table">
        <thead><tr><th scope="col">Người dùng</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col">Thông tin</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
        <tbody>{users.map((user) => {
          const self = user.id === actor.id
          const classCount = user.role === 'teacher' ? store.classes.filter((item) => item.teacherId === user.id && !item.archived).length : store.classes.filter((item) => !item.archived && item.studentIds.includes(user.id)).length
          return <tr key={user.id} className={user.status === 'locked' ? 'is-locked' : ''}>
            <th scope="row"><span className="staff-person"><span className={`staff-person-avatar role-${user.role}`}>{user.name.replace(/^(Cô|Thầy)\s+/, '').slice(0, 1)}</span><span><strong>{user.name}{self ? ' (bạn)' : ''}</strong><small>{user.email}</small></span></span></th>
            <td><select aria-label={`Vai trò của ${user.name}`} value={user.role} disabled={self} onChange={(event) => { const role = event.target.value as Role; if (window.confirm(`Đổi vai trò của ${user.name} thành ${roleLabels[role]}?`)) run((current) => setRole(current, actor, user.id, role), `${user.name} giờ là ${roleLabels[role].toLowerCase()}.`) }}>{(['student', 'teacher', 'admin'] as const).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></td>
            <td><span className={`staff-status status-${user.status}`}>{statusLabels[user.status]}</span></td>
            <td><small>{user.role === 'student' ? `Lớp ${user.grade ?? '—'} · ${classCount} lớp học` : user.role === 'teacher' ? `${user.school ?? 'Chưa ghi trường'} · ${classCount} lớp` : 'Quản trị hệ thống'}</small></td>
            <td>{!self && <button type="button" className={`staff-button is-ghost ${user.status === 'active' ? 'is-danger-text' : ''}`} onClick={() => run((current) => setStatus(current, actor, user.id, user.status === 'active' ? 'locked' : 'active'), user.status === 'active' ? `Đã khoá ${user.name}.` : `Đã mở khoá ${user.name}.`)}>{user.status === 'active' ? <><Lock size={15} /> Khoá</> : <><LockOpen size={15} /> Mở khoá</>}</button>}</td>
          </tr>
        })}</tbody>
      </table></div>
      {users.length === 0 && <p className="staff-empty">Không có người dùng khớp bộ lọc.</p>}
    </section>

    <section className="staff-card" id="classes" aria-labelledby="admin-classes-title">
      <div className="staff-card-heading"><h2 id="admin-classes-title">Lớp học</h2><span>{store.classes.length} lớp · {store.assignments.length} bài giao</span></div>
      <div className="staff-table-wrap"><table className="staff-table">
        <thead><tr><th scope="col">Lớp</th><th scope="col">Giáo viên</th><th scope="col">Học sinh</th><th scope="col">Bài giao</th><th scope="col">Mã lớp</th><th scope="col">Trạng thái</th></tr></thead>
        <tbody>{store.classes.map((item) => <tr key={item.id}><th scope="row">Lớp {item.name} <small>· Khối {item.grade}</small></th><td>{userById(store, item.teacherId)?.name ?? '—'}</td><td>{item.studentIds.length}</td><td>{store.assignments.filter((entry) => entry.classId === item.id).length}</td><td><code>{item.joinCode}</code></td><td><span className={`staff-status ${item.archived ? 'status-locked' : 'status-active'}`}>{item.archived ? 'Lưu trữ' : 'Hoạt động'}</span></td></tr>)}</tbody>
      </table></div>
    </section>

    <section className="staff-card" id="system" aria-labelledby="system-title">
      <div className="staff-card-heading"><h2 id="system-title">Dữ liệu và hệ thống</h2><span>Đọc trực tiếp từ API</span></div>
      {systemError ? <p className="staff-empty" role="alert">{systemError}</p> : !health ? <p className="staff-empty" role="status">Đang kiểm tra backend…</p> : <div className="staff-stats is-compact">
        <StaffStat icon={Database} label="Phiên bản dataset SGK" value={health.datasetVersion} />
        <StaffStat icon={BookOpen} label="Bài học" value={health.totals.lessons} tone="green" />
        <StaffStat icon={ClipboardList} label="Đoạn tư liệu (chunk)" value={health.totals.chunks.toLocaleString('vi-VN')} tone="amber" />
        <StaffStat icon={History} label="Mốc sự kiện" value={events ?? '—'} tone="violet" />
      </div>}
      <p className="staff-hint">Cấu hình AI (khoá OpenAI, hạn mức câu trả lời, tắt AI khẩn cấp) nằm ở biến môi trường của máy chủ: <code>AI_DISABLED</code>, <code>AI_ANSWERS_PER_DAY</code>, <code>CHAT_RATE_PER_MINUTE</code>. Bản FastAPI sẽ đưa các mục này vào trang quản trị.</p>
      <button type="button" className="staff-button is-ghost" onClick={() => { if (window.confirm('Khôi phục dữ liệu demo ban đầu (tài khoản mẫu, lớp, bài giao)? Thay đổi trên trình duyệt này sẽ mất.')) { reset(); setNotice({ message: 'Đã khôi phục dữ liệu demo.', tone: 'ok' }) } }}><RotateCcw size={16} /> Khôi phục dữ liệu demo</button>
    </section>

    <section className="staff-card" id="audit" aria-labelledby="audit-title">
      <div className="staff-card-heading"><h2 id="audit-title">Nhật ký thao tác</h2><span>{store.audit.length} mục</span></div>
      {store.audit.length === 0 ? <p className="staff-empty">Chưa có thao tác nào.</p> : <ol className="staff-audit">{store.audit.slice(0, 30).map((entry) => <li key={entry.id}><time dateTime={entry.at}>{formatDateTime(entry.at)}</time><strong>{entry.action}</strong><span>{entry.detail}</span><small>bởi {userById(store, entry.actorId)?.name ?? 'tài khoản đã xoá'}</small></li>)}</ol>}
    </section>
  </StaffLayout>
}

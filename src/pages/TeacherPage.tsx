import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Archive, BookOpenCheck, ClipboardList, Copy, Download, GraduationCap, Plus, School, Trash2, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StaffLayout, StaffNotice, StaffStat, formatDate } from '../components/StaffLayout'
import { useDemoSession } from '../hooks/useDemoSession'
import { useSchool } from '../hooks/useSchool'
import { historyApi, type HistoryLesson, type PageResult } from '../lib/historyApi'
import { addAssignment, classCsv, classReport, createClass, findUserByEmail, removeAssignment, removeStudent, roleLabels, setClassArchived, userById } from '../lib/school'

const grades = [6, 7, 8, 9, 10, 11, 12]
const nav = [
  { id: 'classes', label: 'Lớp của tôi', icon: School },
  { id: 'students', label: 'Học sinh', icon: UsersRound },
  { id: 'assignments', label: 'Bài được giao', icon: ClipboardList },
]
const dateInput = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
const percent = (part: number, total: number) => total ? Math.round(part / total * 100) : 0

export function TeacherPage() {
  const navigate = useNavigate()
  const { session, logout } = useDemoSession()
  const { store, apply } = useSchool()
  const actor = session.userId ? findUserByEmail(store, session.userId) : undefined
  const isAdmin = actor?.role === 'admin'
  const classes = useMemo(() => store.classes.filter((item) => isAdmin || item.teacherId === actor?.id).sort((a, b) => Number(a.archived) - Number(b.archived) || a.grade - b.grade || a.name.localeCompare(b.name, 'vi')), [store.classes, actor?.id, isAdmin])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = classes.find((item) => item.id === selectedId) ?? classes.find((item) => !item.archived) ?? classes[0]
  const report = useMemo(() => selected ? classReport(store, selected.id) : { rows: [], assignments: [] }, [store, selected])
  const [notice, setNotice] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)
  const [className, setClassName] = useState('')
  const [classGrade, setClassGrade] = useState(7)
  const [lessons, setLessons] = useState<HistoryLesson[]>([])
  const [lessonError, setLessonError] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [dueDate, setDueDate] = useState(() => dateInput(7))

  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    setLessons([]); setLessonError(''); setLessonId('')
    historyApi<PageResult<HistoryLesson>>(`lessons?grade=${selected.grade}&limit=50`, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setLessons(data.items.filter((lesson) => lesson.number > 0)) })
      .catch((error: Error) => { if (!controller.signal.aborted) setLessonError(error.message) })
    return () => controller.abort()
  }, [selected?.id, selected?.grade])

  if (!actor) return null
  const run = (change: Parameters<typeof apply>[0], success: string) => {
    const error = apply(change)
    setNotice(error ? { message: error, tone: 'error' } : { message: success, tone: 'ok' })
    return !error
  }

  const active = classes.filter((item) => !item.archived)
  const studentIds = new Set(active.flatMap((item) => item.studentIds))
  const openAssignments = store.assignments.filter((entry) => active.some((item) => item.id === entry.classId) && Date.parse(entry.dueAt) >= Date.now()).length
  const completion = (() => {
    const reports = active.map((item) => classReport(store, item.id))
    const done = reports.reduce((sum, item) => sum + item.rows.reduce((total, row) => total + row.done, 0), 0)
    const total = reports.reduce((sum, item) => sum + item.rows.length * item.assignments.length, 0)
    return percent(done, total)
  })()

  function submitClass(event: FormEvent) {
    event.preventDefault()
    if (run((current) => createClass(current, actor!, className, classGrade), `Đã tạo lớp ${className.trim()}.`)) setClassName('')
  }
  function submitAssignment(event: FormEvent) {
    event.preventDefault()
    const lesson = lessons.find((item) => item.id === lessonId)
    if (!selected || !lesson) { setNotice({ message: 'Hãy chọn một bài học.', tone: 'error' }); return }
    if (run((current) => addAssignment(current, actor!, selected.id, lesson, `${dueDate}T23:59:00+07:00`), `Đã giao bài "${lesson.title}" cho lớp ${selected.name}.`)) setLessonId('')
  }
  function downloadCsv() {
    if (!selected) return
    const url = URL.createObjectURL(new Blob([classCsv(store, selected.id)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = `tien-do-lop-${selected.name.replace(/[^\p{L}\p{N}-]+/gu, '-')}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function copyCode(code: string) {
    try { await navigator.clipboard.writeText(code); setNotice({ message: `Đã sao chép mã lớp ${code}.`, tone: 'ok' }) }
    catch { setNotice({ message: `Mã lớp: ${code}`, tone: 'ok' }) }
  }

  const areas = isAdmin ? [{ to: '/admin', label: 'Trang quản trị' }, { to: '/home', label: 'Trang học sinh' }] : [{ to: '/home', label: 'Xem trang học sinh' }]
  return <StaffLayout area="Giáo viên" title={`Xin chào, ${actor.name}`} subtitle={isAdmin ? 'Bạn đang xem mọi lớp với quyền quản trị.' : `${actor.school ? actor.school + ' · ' : ''}Theo dõi lớp, giao bài SGK và xem tiến độ học sinh.`} name={actor.name} roleLabel={roleLabels[actor.role]} nav={nav} areas={areas} onLogout={() => { logout(); navigate('/', { replace: true }) }}>
    {notice && <StaffNotice message={notice.message} tone={notice.tone} onDone={() => setNotice(null)} />}
    <div className="staff-stats">
      <StaffStat icon={School} label="Lớp đang dạy" value={active.length} />
      <StaffStat icon={UsersRound} label="Học sinh" value={studentIds.size} tone="green" />
      <StaffStat icon={ClipboardList} label="Bài giao còn hạn" value={openAssignments} tone="amber" />
      <StaffStat icon={BookOpenCheck} label="Tỉ lệ hoàn thành bài giao" value={`${completion}%`} tone="violet" />
    </div>

    <section className="staff-card" id="classes" aria-labelledby="classes-title">
      <div className="staff-card-heading"><h2 id="classes-title">Lớp của tôi</h2><span>{classes.length} lớp</span></div>
      {classes.length === 0 && <p className="staff-empty">Bạn chưa có lớp nào. Tạo lớp đầu tiên rồi gửi mã lớp cho học sinh.</p>}
      <div className="staff-class-grid" role="list">
        {classes.map((item) => <button type="button" role="listitem" key={item.id} className={`staff-class ${item.id === selected?.id ? 'is-selected' : ''} ${item.archived ? 'is-archived' : ''}`} aria-pressed={item.id === selected?.id} onClick={() => setSelectedId(item.id)}>
          <strong>Lớp {item.name}</strong>
          <small>Khối {item.grade} · {item.studentIds.length} học sinh{isAdmin ? ` · ${userById(store, item.teacherId)?.name ?? ''}` : ''}</small>
          <span className="staff-code">{item.archived ? 'Đã lưu trữ' : `Mã: ${item.joinCode}`}</span>
        </button>)}
      </div>
      {!isAdmin && <form className="staff-inline-form" onSubmit={submitClass} aria-label="Tạo lớp mới">
        <label>Tên lớp<input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="VD: 7A2" maxLength={40} required /></label>
        <label>Khối<select value={classGrade} onChange={(event) => setClassGrade(Number(event.target.value))}>{grades.map((grade) => <option key={grade} value={grade}>Lớp {grade}</option>)}</select></label>
        <button type="submit" className="staff-button"><Plus size={16} /> Tạo lớp</button>
      </form>}
    </section>

    {selected && <>
      <section className="staff-card staff-class-head" aria-label={`Lớp ${selected.name}`}>
        <div><span className="staff-kicker">LỚP ĐANG XEM</span><h2>Lớp {selected.name} · Khối {selected.grade}</h2><p>Năm học {selected.schoolYear}. Học sinh vào trang học, chọn <strong>Tham gia lớp</strong> và nhập mã bên cạnh.</p></div>
        <div className="staff-class-actions">
          {!selected.archived && <button type="button" className="staff-code-button" onClick={() => copyCode(selected.joinCode)} aria-label={`Sao chép mã lớp ${selected.joinCode}`}><span>{selected.joinCode}</span><Copy size={16} /></button>}
          <button type="button" className="staff-button is-ghost" onClick={downloadCsv}><Download size={16} /> Xuất CSV</button>
          <button type="button" className="staff-button is-ghost" onClick={() => { if (selected.archived || window.confirm(`Lưu trữ lớp ${selected.name}? Học sinh sẽ không thấy bài giao của lớp này nữa.`)) run((current) => setClassArchived(current, actor, selected.id, !selected.archived), selected.archived ? `Đã khôi phục lớp ${selected.name}.` : `Đã lưu trữ lớp ${selected.name}.`) }}><Archive size={16} /> {selected.archived ? 'Khôi phục' : 'Lưu trữ'}</button>
        </div>
      </section>

      <section className="staff-card" id="students" aria-labelledby="students-title">
        <div className="staff-card-heading"><h2 id="students-title">Học sinh lớp {selected.name}</h2><span>{report.rows.length} học sinh</span></div>
        {report.rows.length === 0 ? <p className="staff-empty">Chưa có học sinh. Gửi mã <strong>{selected.joinCode}</strong> để học sinh tham gia.</p> : <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th scope="col">Học sinh</th><th scope="col">Bài giao đã xong</th><th scope="col">Bài đã đọc</th><th scope="col">XP</th><th scope="col">Quiz</th><th scope="col">Hoạt động gần nhất</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody>{report.rows.map((row) => <tr key={row.user.id}>
            <th scope="row"><span className="staff-person"><span className="staff-person-avatar">{row.user.name.split(' ').pop()?.slice(0, 1)}</span><span><strong>{row.user.name}</strong><small>{row.user.email}</small></span></span></th>
            <td><span className="staff-meter" aria-label={`${row.done} trên ${report.assignments.length} bài giao`}><span style={{ width: `${percent(row.done, report.assignments.length)}%` }} /></span>{row.done}/{report.assignments.length}</td>
            <td>{row.progress.read.length}</td><td>{row.progress.xp}</td><td>{row.progress.quizzes}</td><td>{formatDate(row.progress.lastActive)}</td>
            <td><button type="button" className="staff-icon-button" aria-label={`Xoá ${row.user.name} khỏi lớp`} onClick={() => { if (window.confirm(`Xoá ${row.user.name} khỏi lớp ${selected.name}?`)) run((current) => removeStudent(current, actor, selected.id, row.user.id), `Đã xoá ${row.user.name} khỏi lớp.`) }}><Trash2 size={16} /></button></td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      <section className="staff-card" id="assignments" aria-labelledby="assignments-title">
        <div className="staff-card-heading"><h2 id="assignments-title">Bài được giao</h2><span>{report.assignments.length} bài</span></div>
        {report.assignments.length === 0 && <p className="staff-empty">Chưa giao bài nào cho lớp này.</p>}
        <ul className="staff-assignments">{report.assignments.map((entry) => {
          const overdue = Date.parse(entry.dueAt) < Date.now()
          return <li key={entry.id}>
            <GraduationCap size={20} />
            <div><strong>{entry.lessonTitle}</strong><small>{entry.lessonId} · Hạn {formatDate(entry.dueAt)}{overdue ? ' · Đã hết hạn' : ''}</small></div>
            <div className="staff-assignment-progress"><span className="staff-meter"><span style={{ width: `${percent(entry.completed, report.rows.length)}%` }} /></span><small>{entry.completed}/{report.rows.length} đã đọc</small></div>
            <button type="button" className="staff-icon-button" aria-label={`Huỷ giao bài ${entry.lessonTitle}`} onClick={() => run((current) => removeAssignment(current, actor, entry.id), 'Đã huỷ bài được giao.')}><Trash2 size={16} /></button>
          </li>
        })}</ul>
        {!selected.archived && <form className="staff-inline-form" onSubmit={submitAssignment} aria-label="Giao bài mới">
          <label className="is-wide">Bài học SGK lớp {selected.grade}<select value={lessonId} onChange={(event) => setLessonId(event.target.value)} required disabled={!lessons.length}>
            <option value="">{lessonError ? 'Không tải được danh sách bài' : lessons.length ? 'Chọn bài học…' : 'Đang tải bài học…'}</option>
            {lessons.map((lesson) => <option key={lesson.id} value={lesson.id} disabled={report.assignments.some((entry) => entry.lessonId === lesson.id)}>Bài {lesson.number}. {lesson.title}</option>)}
          </select></label>
          <label>Hạn hoàn thành<input type="date" value={dueDate} min={dateInput(0)} onChange={(event) => setDueDate(event.target.value)} required /></label>
          <button type="submit" className="staff-button"><Plus size={16} /> Giao bài</button>
        </form>}
        {lessonError && <p className="staff-empty" role="alert">{lessonError}</p>}
      </section>
    </>}
  </StaffLayout>
}

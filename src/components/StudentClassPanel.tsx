import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, CircleDashed, School } from 'lucide-react'
import { useSchool } from '../hooks/useSchool'
import { classesOfStudent, findUserByEmail, joinClass, userById } from '../lib/school'
import { formatDate } from './StaffLayout'

interface Props { userId?: string; readLessons: string[]; onOpenLesson: (id: string) => void }

// "Lớp của em" on the learning dashboard: join a class with the teacher's code and see the lessons it was given.
export function StudentClassPanel({ userId, readLessons, onOpenLesson }: Props) {
  const { store, apply } = useSchool()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const student = userId ? findUserByEmail(store, userId) : undefined
  if (!student || student.role !== 'student') return null
  const classes = classesOfStudent(store, student.id)
  const assignments = store.assignments.filter((entry) => classes.some((item) => item.id === entry.classId)).sort((a, b) => Number(readLessons.includes(a.lessonId)) - Number(readLessons.includes(b.lessonId)) || a.dueAt.localeCompare(b.dueAt))
  const done = assignments.filter((entry) => readLessons.includes(entry.lessonId)).length

  function submit(event: FormEvent) {
    event.preventDefault()
    const joined = store.classes.find((item) => item.joinCode === code.trim().toUpperCase())
    const error = apply((current) => joinClass(current, student!, code))
    setMessage(error ? { text: error, error: true } : { text: `Đã vào lớp ${joined?.name}.`, error: false })
    if (!error) setCode('')
  }

  return <section className="dashboard-panel student-class-panel" aria-labelledby="student-class-title">
    <div className="dashboard-panel-heading"><h2 id="student-class-title">Lớp của em</h2>{assignments.length > 0 && <small>{done}/{assignments.length} bài giao</small>}</div>
    {classes.map((item) => <p className="student-class-name" key={item.id}><School size={16} /> Lớp {item.name} · {userById(store, item.teacherId)?.name ?? 'Giáo viên'}</p>)}
    {assignments.length > 0 && <ul className="student-assignments">{assignments.slice(0, 4).map((entry) => {
      const finished = readLessons.includes(entry.lessonId)
      const overdue = !finished && Date.parse(entry.dueAt) < Date.now()
      return <li key={entry.id}><button type="button" onClick={() => onOpenLesson(entry.lessonId)} aria-label={`Mở bài được giao: ${entry.lessonTitle}`}>
        {finished ? <CheckCircle2 size={18} className="is-done" /> : <CircleDashed size={18} />}
        <span><strong>{entry.lessonTitle}</strong><small className={overdue ? 'is-overdue' : ''}>{finished ? 'Đã đọc' : `${overdue ? 'Quá hạn' : 'Hạn'} ${formatDate(entry.dueAt)}`}</small></span>
        <ArrowRight size={15} />
      </button></li>
    })}</ul>}
    {classes.length > 0 && assignments.length === 0 && <p className="student-class-empty">Thầy cô chưa giao bài nào.</p>}
    <form className="student-join" onSubmit={submit}>
      <label htmlFor="join-code">{classes.length ? 'Tham gia lớp khác' : 'Tham gia lớp bằng mã thầy cô gửi'}</label>
      <div><input id="join-code" value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setMessage(null) }} placeholder="VD: DUN7A1" maxLength={8} autoComplete="off" required /><button type="submit">Tham gia lớp</button></div>
      {message && <small role={message.error ? 'alert' : 'status'} className={message.error ? 'is-error' : 'is-ok'}>{message.text}</small>}
    </form>
  </section>
}

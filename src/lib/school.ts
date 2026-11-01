/**
 * Demo school data for the teacher and admin roles. Like the rest of the demo it lives in this browser's localStorage:
 * roles are enforced only in the UI here. The real design (FastAPI + PostgreSQL, checks on the server) is in
 * docs/ARCHITECTURE.md. Every change goes through the pure functions below, so the pages and the tests share one logic.
 */
export type Role = 'student' | 'teacher' | 'admin'
export type AccountStatus = 'active' | 'pending' | 'locked'

export interface SchoolUser {
  id: string
  /** Normalised (trimmed, lower-case) e-mail; also the session userId. */
  email: string
  name: string
  role: Role
  status: AccountStatus
  grade?: number
  school?: string
  createdAt: string
}
export interface SchoolClass { id: string; name: string; grade: number; teacherId: string; joinCode: string; schoolYear: string; studentIds: string[]; archived: boolean; createdAt: string }
export interface Assignment { id: string; classId: string; lessonId: string; lessonTitle: string; dueAt: string; createdAt: string }
/** What a student has done, as the teacher sees it. Seeded for sample students; synced from the learning app for real ones. */
export interface StudentProgress { read: string[]; xp: number; quizzes: number; lastActive: string }
export interface AuditEntry { id: string; at: string; actorId: string; action: string; detail: string }
export interface SchoolStore { version: 1; users: SchoolUser[]; classes: SchoolClass[]; assignments: Assignment[]; progress: Record<string, StudentProgress>; audit: AuditEntry[] }

// v2: the sample student and teacher are Dũng; a new key re-seeds browsers that kept the older sample accounts.
export const schoolKey = 'xuyen-su-ky-school-v2'
export const roleLabels: Record<Role, string> = { student: 'Học sinh', teacher: 'Giáo viên', admin: 'Quản trị viên' }
export const statusLabels: Record<AccountStatus, string> = { active: 'Đang hoạt động', pending: 'Chờ duyệt', locked: 'Đã khoá' }

/** Built-in demo accounts. The student is the existing demo account; the password is the same for all three. */
export const demoStaff = [
  { role: 'teacher' as const, email: 'dung.gv@xuyensuki.vn', password: 'demo123', label: 'Giáo viên' },
  { role: 'admin' as const, email: 'admin@xuyensuki.vn', password: 'demo123', label: 'Admin' },
]

const day = 86_400_000
const iso = (offsetDays: number, now: number) => new Date(now + offsetDays * day).toISOString()
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

const sampleStudents: [string, string, number, string[], number, number][] = [
  // id, name, grade, lessons read, XP, quizzes
  ['an', 'Nguyễn Văn An', 7, ['LS7_B14', 'LS7_B15', 'LS7_B16', 'LS7_B17'], 420, 6],
  ['binh', 'Trần Thị Bình', 7, ['LS7_B14', 'LS7_B15', 'LS7_B17'], 360, 5],
  ['chi', 'Lê Minh Chi', 7, ['LS7_B14', 'LS7_B15'], 210, 3],
  ['dung', 'Phạm Quốc Dũng', 7, ['LS7_B14'], 120, 1],
  ['giang', 'Đỗ Hương Giang', 7, ['LS7_B14', 'LS7_B15', 'LS7_B16', 'LS7_B17', 'LS7_B18'], 530, 8],
  ['ha', 'Vũ Thu Hà', 7, [], 30, 0],
  ['khoa', 'Hoàng Anh Khoa', 7, ['LS7_B15', 'LS7_B17'], 260, 4],
  ['linh', 'Bùi Khánh Linh', 7, ['LS7_B14', 'LS7_B15', 'LS7_B16'], 310, 4],
  ['my', 'Ngô Trà My', 8, ['LS8_B08', 'LS8_B16'], 240, 3],
  ['phuc', 'Đặng Hồng Phúc', 8, ['LS8_B08'], 150, 2],
  ['quan', 'Lý Minh Quân', 8, ['LS8_B05', 'LS8_B08', 'LS8_B16', 'LS8_B17'], 470, 7],
  ['son', 'Mai Thanh Sơn', 7, ['LS7_B19'], 90, 1],
]

export function seedSchool(now = Date.now()): SchoolStore {
  const created = iso(-60, now)
  const users: SchoolUser[] = [
    { id: 'u-admin', email: 'admin@xuyensuki.vn', name: 'Quản trị viên', role: 'admin', status: 'active', createdAt: created },
    { id: 'u-thay-dung', email: 'dung.gv@xuyensuki.vn', name: 'Thầy Dũng', role: 'teacher', status: 'active', school: 'THCS Nguyễn Du', createdAt: created },
    { id: 'u-hung', email: 'hung.gv@xuyensuki.vn', name: 'Thầy Trần Văn Hùng', role: 'teacher', status: 'active', school: 'THCS Lê Lợi', createdAt: created },
    { id: 'u-nam', email: 'nam.gv@xuyensuki.vn', name: 'Thầy Lê Hoài Nam', role: 'teacher', status: 'pending', school: 'THCS Chu Văn An', createdAt: iso(-1, now) },
    { id: 'u-dung-demo', email: 'dung@xuyensuki.vn', name: 'Dũng', role: 'student', status: 'active', grade: 7, createdAt: created },
    ...sampleStudents.map(([id, name, grade]) => ({ id: `u-${id}`, email: `${id}.hs@xuyensuki.vn`, name, role: 'student' as const, status: 'active' as const, grade, createdAt: created })),
  ]
  const progress = Object.fromEntries(sampleStudents.map(([id, , , read, xp, quizzes], index) => [`u-${id}`, { read, xp, quizzes, lastActive: iso(-(index % 5), now) }]))
  const classes: SchoolClass[] = [
    { id: 'c-7a1', name: '7A1', grade: 7, teacherId: 'u-thay-dung', joinCode: 'DUN7A1', schoolYear: '2026–2027', studentIds: ['u-an', 'u-binh', 'u-chi', 'u-dung', 'u-giang', 'u-ha', 'u-khoa', 'u-linh'], archived: false, createdAt: created },
    { id: 'c-8a2', name: '8A2', grade: 8, teacherId: 'u-thay-dung', joinCode: 'DUN8A2', schoolYear: '2026–2027', studentIds: ['u-my', 'u-phuc', 'u-quan'], archived: false, createdAt: created },
    { id: 'c-7a3', name: '7A3', grade: 7, teacherId: 'u-hung', joinCode: 'HUNG73', schoolYear: '2026–2027', studentIds: ['u-son'], archived: false, createdAt: created },
  ]
  const assignments: Assignment[] = [
    { id: 'a-1', classId: 'c-7a1', lessonId: 'LS7_B15', lessonTitle: 'Công cuộc xây dựng và bảo vệ đất nước thời Lý (1009 - 1225)', dueAt: iso(-3, now), createdAt: iso(-10, now) },
    { id: 'a-2', classId: 'c-7a1', lessonId: 'LS7_B17', lessonTitle: 'Ba lần kháng chiến chống quân xâm lược mông - Nguyên', dueAt: iso(5, now), createdAt: iso(-2, now) },
    { id: 'a-3', classId: 'c-8a2', lessonId: 'LS8_B08', lessonTitle: 'Phong trào Tây Sơn', dueAt: iso(4, now), createdAt: iso(-1, now) },
  ]
  const audit: AuditEntry[] = [{ id: 'log-1', at: iso(-1, now), actorId: 'u-nam', action: 'Đăng ký giáo viên', detail: 'Thầy Lê Hoài Nam (nam.gv@xuyensuki.vn) gửi yêu cầu tài khoản giáo viên.' }]
  return { version: 1, users, classes, assignments, progress, audit }
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isStore = (value: unknown): value is SchoolStore => {
  const store = value as SchoolStore | null
  return !!store && store.version === 1 && Array.isArray(store.users) && Array.isArray(store.classes) && Array.isArray(store.assignments) && Array.isArray(store.audit) && typeof store.progress === 'object'
    && store.users.every((user) => user && isString(user.id) && isString(user.email) && isString(user.name) && ['student', 'teacher', 'admin'].includes(user.role) && ['active', 'pending', 'locked'].includes(user.status))
    && store.classes.every((item) => item && isString(item.id) && isString(item.teacherId) && Array.isArray(item.studentIds) && isString(item.joinCode))
}

export function readSchool(): SchoolStore {
  try {
    const saved = JSON.parse(localStorage.getItem(schoolKey) || 'null')
    if (isStore(saved)) return saved
  } catch { /* Fall back to the seed. */ }
  return seedSchool()
}
export function writeSchool(store: SchoolStore) {
  try { localStorage.setItem(schoolKey, JSON.stringify(store)) } catch { /* The demo keeps working in memory. */ }
}

export const findUserByEmail = (store: SchoolStore, email: string) => store.users.find((user) => user.email === normalizeEmail(email))
export const userById = (store: SchoolStore, id: string) => store.users.find((user) => user.id === id)
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

function log(store: SchoolStore, actorId: string, action: string, detail: string): SchoolStore {
  return { ...store, audit: [{ id: newId('log'), at: new Date().toISOString(), actorId, action, detail }, ...store.audit].slice(0, 200) }
}

/** Why a signed-in account may not enter, or null when it may. */
export function accessProblem(user: SchoolUser | undefined) {
  if (!user) return null
  if (user.status === 'pending') return 'Tài khoản giáo viên đang chờ quản trị viên duyệt.'
  if (user.status === 'locked') return 'Tài khoản đã bị khoá. Hãy liên hệ quản trị viên.'
  return null
}

/** Makes sure a signed-in student (demo or registered in this browser) has a directory entry. */
export function ensureStudent(store: SchoolStore, email: string, name: string, grade?: number): SchoolStore {
  if (findUserByEmail(store, email)) return store
  return { ...store, users: [...store.users, { id: newId('u'), email: normalizeEmail(email), name, role: 'student', status: 'active', grade, createdAt: new Date().toISOString() }] }
}

export function requestTeacher(store: SchoolStore, email: string, name: string, school: string): SchoolStore {
  const normalized = normalizeEmail(email)
  if (findUserByEmail(store, normalized)) throw new Error('Email này đã có trong hệ thống.')
  const user: SchoolUser = { id: newId('u'), email: normalized, name: name.trim() || normalized.split('@')[0], role: 'teacher', status: 'pending', school: school.trim() || undefined, createdAt: new Date().toISOString() }
  return log({ ...store, users: [...store.users, user] }, user.id, 'Đăng ký giáo viên', `${user.name} (${user.email}) gửi yêu cầu tài khoản giáo viên.`)
}

// ---- Teacher actions -------------------------------------------------------------------------------------------

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function joinCodeFor(store: SchoolStore, random = () => Math.random()) {
  for (;;) {
    const code = Array.from({ length: 6 }, () => codeAlphabet[Math.floor(random() * codeAlphabet.length)]).join('')
    if (!store.classes.some((item) => item.joinCode === code)) return code
  }
}

export function canManageClass(actor: SchoolUser | undefined, item: SchoolClass | undefined) {
  return !!actor && !!item && actor.status === 'active' && (actor.role === 'admin' || (actor.role === 'teacher' && item.teacherId === actor.id))
}
function requireClass(store: SchoolStore, actor: SchoolUser, classId: string) {
  const item = store.classes.find((entry) => entry.id === classId)
  if (!canManageClass(actor, item)) throw new Error('Bạn không quản lý lớp này.')
  return item!
}

export function createClass(store: SchoolStore, actor: SchoolUser, name: string, grade: number, schoolYear = '2026–2027'): SchoolStore {
  if (actor.role !== 'teacher' || actor.status !== 'active') throw new Error('Chỉ giáo viên mới tạo được lớp.')
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 40) throw new Error('Tên lớp cần 1–40 ký tự.')
  if (![6, 7, 8, 9, 10, 11, 12].includes(grade)) throw new Error('Khối lớp không hợp lệ.')
  if (store.classes.some((item) => item.teacherId === actor.id && !item.archived && item.name.toLowerCase() === trimmed.toLowerCase())) throw new Error('Bạn đã có lớp trùng tên.')
  const item: SchoolClass = { id: newId('c'), name: trimmed, grade, teacherId: actor.id, joinCode: joinCodeFor(store), schoolYear, studentIds: [], archived: false, createdAt: new Date().toISOString() }
  return { ...store, classes: [...store.classes, item] }
}

export function setClassArchived(store: SchoolStore, actor: SchoolUser, classId: string, archived: boolean): SchoolStore {
  requireClass(store, actor, classId)
  return { ...store, classes: store.classes.map((item) => item.id === classId ? { ...item, archived } : item) }
}

export function removeStudent(store: SchoolStore, actor: SchoolUser, classId: string, studentId: string): SchoolStore {
  const item = requireClass(store, actor, classId)
  const student = userById(store, studentId)
  const next = { ...store, classes: store.classes.map((entry) => entry.id === classId ? { ...entry, studentIds: entry.studentIds.filter((id) => id !== studentId) } : entry) }
  return log(next, actor.id, 'Xoá học sinh khỏi lớp', `${student?.name ?? studentId} rời lớp ${item.name}.`)
}

export function addAssignment(store: SchoolStore, actor: SchoolUser, classId: string, lesson: { id: string; title: string; grade: number }, dueAt: string): SchoolStore {
  const item = requireClass(store, actor, classId)
  if (item.archived) throw new Error('Lớp đã lưu trữ, không giao bài mới.')
  if (lesson.grade !== item.grade) throw new Error('Bài học không thuộc khối của lớp.')
  if (Number.isNaN(Date.parse(dueAt))) throw new Error('Hạn nộp không hợp lệ.')
  if (store.assignments.some((entry) => entry.classId === classId && entry.lessonId === lesson.id)) throw new Error('Bài này đã được giao cho lớp.')
  return { ...store, assignments: [...store.assignments, { id: newId('a'), classId, lessonId: lesson.id, lessonTitle: lesson.title, dueAt: new Date(dueAt).toISOString(), createdAt: new Date().toISOString() }] }
}

export function removeAssignment(store: SchoolStore, actor: SchoolUser, assignmentId: string): SchoolStore {
  const assignment = store.assignments.find((entry) => entry.id === assignmentId)
  if (!assignment) return store
  requireClass(store, actor, assignment.classId)
  return { ...store, assignments: store.assignments.filter((entry) => entry.id !== assignmentId) }
}

export interface StudentRow { user: SchoolUser; progress: StudentProgress; done: number }
export function classReport(store: SchoolStore, classId: string): { rows: StudentRow[]; assignments: (Assignment & { completed: number })[] } {
  const item = store.classes.find((entry) => entry.id === classId)
  if (!item) return { rows: [], assignments: [] }
  const assigned = store.assignments.filter((entry) => entry.classId === classId).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const rows = item.studentIds.map((id) => userById(store, id)).filter((user): user is SchoolUser => !!user).map((user) => {
    const progress = store.progress[user.id] ?? { read: [], xp: 0, quizzes: 0, lastActive: '' }
    return { user, progress, done: assigned.filter((entry) => progress.read.includes(entry.lessonId)).length }
  }).sort((a, b) => a.user.name.localeCompare(b.user.name, 'vi'))
  return { rows, assignments: assigned.map((entry) => ({ ...entry, completed: rows.filter((row) => row.progress.read.includes(entry.lessonId)).length })) }
}

const csvCell = (value: string | number) => { const text = String(value); return /[",\n]/.test(text) || /^[=+\-@]/.test(text) ? `"${(/^[=+\-@]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"` : text }
export function classCsv(store: SchoolStore, classId: string) {
  const { rows, assignments } = classReport(store, classId)
  const header = ['Học sinh', 'Email', 'Số bài đã đọc', 'XP', 'Số quiz', `Bài được giao đã xong (/${assignments.length})`, ...assignments.map((entry) => entry.lessonId), 'Hoạt động gần nhất']
  const lines = rows.map((row) => [row.user.name, row.user.email, row.progress.read.length, row.progress.xp, row.progress.quizzes, row.done, ...assignments.map((entry) => row.progress.read.includes(entry.lessonId) ? 'Đã đọc' : 'Chưa'), row.progress.lastActive ? row.progress.lastActive.slice(0, 10) : ''])
  return '﻿' + [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n')
}

// ---- Student actions -------------------------------------------------------------------------------------------

export function joinClass(store: SchoolStore, student: SchoolUser, code: string): SchoolStore {
  if (student.role !== 'student' || student.status !== 'active') throw new Error('Chỉ tài khoản học sinh mới tham gia lớp.')
  const item = store.classes.find((entry) => entry.joinCode === code.trim().toUpperCase() && !entry.archived)
  if (!item) throw new Error('Mã lớp không đúng hoặc lớp đã đóng.')
  if (item.studentIds.includes(student.id)) throw new Error(`Bạn đã ở trong lớp ${item.name}.`)
  return { ...store, classes: store.classes.map((entry) => entry.id === item.id ? { ...entry, studentIds: [...entry.studentIds, student.id] } : entry) }
}

export function syncProgress(store: SchoolStore, studentId: string, progress: Omit<StudentProgress, 'lastActive'>): SchoolStore {
  const previous = store.progress[studentId]
  if (previous && previous.xp === progress.xp && previous.quizzes === progress.quizzes && previous.read.length === progress.read.length && previous.read.every((id) => progress.read.includes(id))) return store
  return { ...store, progress: { ...store.progress, [studentId]: { ...progress, lastActive: new Date().toISOString() } } }
}

export const classesOfStudent = (store: SchoolStore, studentId: string) => store.classes.filter((item) => !item.archived && item.studentIds.includes(studentId))

// ---- Admin actions ---------------------------------------------------------------------------------------------

function requireAdmin(actor: SchoolUser) { if (actor.role !== 'admin' || actor.status !== 'active') throw new Error('Chỉ quản trị viên mới làm được việc này.') }
function requireOther(store: SchoolStore, actor: SchoolUser, userId: string) {
  requireAdmin(actor)
  if (userId === actor.id) throw new Error('Không thể tự đổi vai trò hoặc khoá chính mình.')
  const user = userById(store, userId)
  if (!user) throw new Error('Không tìm thấy người dùng.')
  return user
}
const activeAdmins = (store: SchoolStore) => store.users.filter((user) => user.role === 'admin' && user.status === 'active').length

export function setRole(store: SchoolStore, actor: SchoolUser, userId: string, role: Role): SchoolStore {
  const user = requireOther(store, actor, userId)
  if (user.role === role) return store
  if (user.role === 'admin' && user.status === 'active' && activeAdmins(store) <= 1) throw new Error('Hệ thống cần ít nhất một quản trị viên.')
  const next = { ...store, users: store.users.map((entry) => entry.id === userId ? { ...entry, role, grade: role === 'student' ? entry.grade ?? 7 : entry.grade } : entry) }
  return log(next, actor.id, 'Đổi vai trò', `${user.name}: ${roleLabels[user.role]} → ${roleLabels[role]}.`)
}

export function setStatus(store: SchoolStore, actor: SchoolUser, userId: string, status: AccountStatus): SchoolStore {
  const user = requireOther(store, actor, userId)
  if (user.status === status) return store
  const next = { ...store, users: store.users.map((entry) => entry.id === userId ? { ...entry, status } : entry) }
  return log(next, actor.id, status === 'locked' ? 'Khoá tài khoản' : 'Mở khoá tài khoản', `${user.name} (${user.email}).`)
}

export function reviewTeacher(store: SchoolStore, actor: SchoolUser, userId: string, approve: boolean): SchoolStore {
  const user = requireOther(store, actor, userId)
  if (user.status !== 'pending') throw new Error('Yêu cầu này đã được xử lý.')
  const next = approve
    ? { ...store, users: store.users.map((entry) => entry.id === userId ? { ...entry, status: 'active' as const } : entry) }
    : { ...store, users: store.users.filter((entry) => entry.id !== userId) }
  return log(next, actor.id, approve ? 'Duyệt giáo viên' : 'Từ chối giáo viên', `${user.name} (${user.email}).`)
}

export function systemStats(store: SchoolStore) {
  const count = (role: Role) => store.users.filter((user) => user.role === role && user.status !== 'pending').length
  return {
    students: count('student'), teachers: count('teacher'), admins: count('admin'),
    pending: store.users.filter((user) => user.status === 'pending').length,
    locked: store.users.filter((user) => user.status === 'locked').length,
    classes: store.classes.filter((item) => !item.archived).length,
    assignments: store.assignments.length,
  }
}

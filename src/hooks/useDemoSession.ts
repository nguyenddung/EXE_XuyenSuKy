import { useRef, useState } from 'react'
import { verifyLocal } from '../lib/localAccount'
import { demoAccount } from '../data/demo'
import { accessProblem, demoStaff, ensureStudent, findUserByEmail, normalizeEmail, readSchool, roleLabels, writeSchool, type Role } from '../lib/school'

export interface DemoSession {
  name?: string
  /** Stable identity of the signed-in demo account (normalised email); never the display name. Absent for guests and for sessions saved before it existed. */
  userId?: string
  loggedIn: boolean
  /** Role of a signed-in account; read again from the school directory on every load, so admin changes apply. */
  role?: Role
  /** Explicit "learn without an account" mode; it opens the app but never borrows the demo member's profile. */
  guest: boolean
  /** Set for a "remembered" sign-in: it survives closing the browser until this time (ms). Absent: the sign-in lasts for this browser session only. */
  expiresAt?: number
  gradeSelected: boolean
  gameRecords: Record<string, number>
  grade: number
  completedActivities: string[]
  earnedXp: number
}

// Progress (grade, XP, games) stays in localStorage. Who is signed in lives in sessionStorage, so a fresh visit
// opens the public landing page as a visitor, unless the member ticked "remember me" (then it is kept in
// localStorage until expiresAt). Older builds kept a sign-in there forever; such sessions are dropped.
const storageKey = 'xuyen-su-ky-demo-v1'
const authKey = 'xuyen-su-ky-auth-v1'
export const rememberDays = 30
const initialSession: DemoSession = { loggedIn: false, guest: false, gradeSelected: false, gameRecords: {}, grade: 7, completedActivities: [], earnedXp: 0 }
type Auth = Pick<DemoSession, 'loggedIn' | 'guest' | 'userId' | 'name' | 'expiresAt' | 'role'>
const signedOut: Auth = { loggedIn: false, guest: false, role: undefined }

function parse(storage: () => Storage, key: string) {
  try { return JSON.parse(storage().getItem(key) || 'null') as Partial<DemoSession> | null } catch { return null }
}

function readAuth(saved: Partial<DemoSession> | null): Auth {
  const fromTab = parse(() => sessionStorage, authKey)
  const remembered = typeof saved?.expiresAt === 'number' && saved.expiresAt > Date.now()
  const source = fromTab || (remembered ? saved : null)
  if (!source) return signedOut
  const loggedIn = source.loggedIn === true
  const userId = loggedIn && typeof source.userId === 'string' && source.userId ? source.userId : undefined
  // The directory decides the role; a locked or not yet approved account is signed out.
  const member = userId ? findUserByEmail(readSchool(), userId) : undefined
  if (member && member.status !== 'active') return signedOut
  return {
    loggedIn,
    role: loggedIn ? member?.role ?? (['student', 'teacher', 'admin'].includes(source.role as string) ? source.role : 'student') : undefined,
    guest: !loggedIn && source.guest === true,
    userId,
    name: loggedIn && typeof source.name === 'string' ? source.name : undefined,
    expiresAt: fromTab ? undefined : saved!.expiresAt,
  }
}

export function readSession(): DemoSession {
  const saved = parse(() => localStorage, storageKey)
  const auth = readAuth(saved)
  if (!saved) return { ...initialSession, ...auth }
  return {
    ...auth,
    gradeSelected: saved.gradeSelected === true || (saved.gradeSelected === undefined && auth.loggedIn && [6, 7, 8, 9, 10, 11, 12].includes(saved.grade ?? 0)),
    gameRecords: Object.fromEntries(Object.entries(saved.gameRecords || {}).filter(([id, stars]) => ['timeline', 'memory', 'detective', 'strategy'].includes(id) && Number.isInteger(stars) && stars >= 1 && stars <= 3)),
    grade: [6, 7, 8, 9, 10, 11, 12].includes(saved.grade ?? 0) ? saved.grade! : 7,
    completedActivities: Array.isArray(saved.completedActivities) ? saved.completedActivities.filter((id): id is string => typeof id === 'string') : [],
    earnedXp: typeof saved.earnedXp === 'number' && Number.isFinite(saved.earnedXp) && saved.earnedXp >= 0 ? saved.earnedXp : 0,
  }
}

function writeSession(session: DemoSession) {
  const { loggedIn, guest, userId, name, expiresAt, role, ...progress } = session
  const auth = { loggedIn, guest, userId, name, role }
  try { localStorage.setItem(storageKey, JSON.stringify(expiresAt ? { ...progress, ...auth, expiresAt } : progress)) } catch { /* Demo vẫn dùng được nếu trình duyệt chặn lưu trữ. */ }
  try {
    if (!expiresAt && (loggedIn || guest)) sessionStorage.setItem(authKey, JSON.stringify(auth))
    else sessionStorage.removeItem(authKey)
  } catch { /* The sign-in then lasts until the page closes. */ }
}

/** Whether the learning app at /home may open: a signed-in member or a visitor who chose guest mode. */
export const hasAppAccess = (session: DemoSession) => session.loggedIn || session.guest

/** Students and guests learn at /home; teachers and admins start at their own area. */
export const roleHome = (session: DemoSession) => session.loggedIn && session.role === 'admin' ? '/admin' : session.loggedIn && session.role === 'teacher' ? '/giao-vien' : '/home'
/** Grade onboarding only concerns learners. */
export const isLearner = (session: DemoSession) => !session.loggedIn || !session.role || session.role === 'student'

/** Owner of locally stored per-user data: the account id, 'guest' in guest mode, or null when the identity is unknown (legacy session). */
export const storageOwner = (session: DemoSession) => session.loggedIn ? session.userId ?? null : session.guest ? 'guest' : null

export function useDemoSession() {
  const [session, setSession] = useState<DemoSession>(readSession)
  const latest = useRef(session)

  // Persist synchronously so a route change in the same handler (login → /home) already sees the new session.
  function update(change: (previous: DemoSession) => DemoSession) {
    const next = change(latest.current)
    latest.current = next
    writeSession(next)
    setSession(next)
  }

  /** Returns true when signed in, otherwise the message to show. */
  /** `role` is the role chosen on the sign-in form; when given, the account must have that role. */
  async function login(email: string, password: string, remember = false, role?: Role): Promise<true | string> {
    const normalized = normalizeEmail(email)
    const builtIn = (normalized === demoAccount.email && password === demoAccount.password) || demoStaff.some((account) => account.email === normalized && account.password === password)
    if (!builtIn && !await verifyLocal(email, password)) return 'Email hoặc mật khẩu chưa đúng.'
    let school = readSchool()
    const member = findUserByEmail(school, normalized)
    const problem = accessProblem(member)
    if (problem) return problem
    const actual = member?.role ?? 'student'
    if (role && role !== actual) return `Tài khoản này là tài khoản ${roleLabels[actual].toLowerCase()}. Hãy chọn vai trò "${roleLabels[actual]}" để đăng nhập.`
    const name = member?.name ?? (normalized === demoAccount.email ? demoAccount.name : email.trim().split('@')[0])
    if (!member) { school = ensureStudent(school, normalized, name); writeSchool(school) }
    const expiresAt = remember ? Date.now() + rememberDays * 86_400_000 : undefined
    update((previous) => ({ ...previous, loggedIn: true, guest: false, userId: normalized, name, role: member?.role ?? 'student', expiresAt }))
    return true
  }

  function startGuest() { update((previous) => ({ ...previous, ...signedOut, guest: true })) }
  function logout() { update((previous) => ({ ...previous, ...signedOut })) }
  function selectGrade(grade: number) { if (![6, 7, 8, 9, 10, 11, 12].includes(grade)) return; update((previous) => ({ ...previous, grade, gradeSelected: true })) }
  function recordGame(id: string, stars: number) { update(previous => ({ ...previous, gameRecords: { ...previous.gameRecords, [id]: Math.max(previous.gameRecords[id] || 0, stars) } })) }
  function reset() { update((previous) => ({ ...initialSession, loggedIn: previous.loggedIn, guest: previous.guest, name: previous.name, userId: previous.userId, role: previous.role, expiresAt: previous.expiresAt, grade: previous.grade, gradeSelected: previous.gradeSelected })) }

  function completeActivity(id: string, reward: number) {
    update((previous) => previous.completedActivities.includes(id) ? previous : {
      ...previous,
      completedActivities: [...previous.completedActivities, id],
      earnedXp: previous.earnedXp + reward,
    })
  }

  return { session, login, startGuest, logout, selectGrade, reset, completeActivity, recordGame }
}

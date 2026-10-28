import { useRef, useState } from 'react'
import { verifyLocal } from '../lib/localAccount'
import { demoAccount } from '../data/demo'

export interface DemoSession {
  name?: string
  /** Stable identity of the signed-in demo account (normalised email); never the display name. Absent for guests and for sessions saved before it existed. */
  userId?: string
  loggedIn: boolean
  /** Explicit "learn without an account" mode; it opens the app but never borrows the demo member's profile. */
  guest: boolean
  gradeSelected: boolean
  gameRecords: Record<string, number>
  grade: number
  completedActivities: string[]
  earnedXp: number
}

const storageKey = 'xuyen-su-ky-demo-v1'
const initialSession: DemoSession = { loggedIn: false, guest: false, gradeSelected: false, gameRecords: {}, grade: 7, completedActivities: [], earnedXp: 0 }

export function readSession(): DemoSession {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null') as Partial<DemoSession> | null
    if (!saved) return initialSession
    const loggedIn = saved.loggedIn === true
    return {
      loggedIn,
      userId: loggedIn && typeof saved.userId === 'string' && saved.userId ? saved.userId : undefined,
      name: typeof saved.name === 'string' ? saved.name : undefined,
      gradeSelected: saved.gradeSelected === true || (saved.gradeSelected === undefined && loggedIn && [6, 7, 8, 9, 10, 11, 12].includes(saved.grade ?? 0)),
      gameRecords: Object.fromEntries(Object.entries(saved.gameRecords || {}).filter(([id, stars]) => ['timeline', 'memory', 'detective', 'strategy'].includes(id) && Number.isInteger(stars) && stars >= 1 && stars <= 3)),
      guest: !loggedIn && saved.guest === true,
      grade: [6, 7, 8, 9, 10, 11, 12].includes(saved.grade ?? 0) ? saved.grade! : 7,
      completedActivities: Array.isArray(saved.completedActivities) ? saved.completedActivities.filter((id): id is string => typeof id === 'string') : [],
      earnedXp: typeof saved.earnedXp === 'number' && Number.isFinite(saved.earnedXp) && saved.earnedXp >= 0 ? saved.earnedXp : 0,
    }
  } catch { return initialSession }
}

/** Whether the learning app at /home may open: a signed-in member or a visitor who chose guest mode. */
export const hasAppAccess = (session: DemoSession) => session.loggedIn || session.guest

/** Owner of locally stored per-user data: the account id, 'guest' in guest mode, or null when the identity is unknown (legacy session). */
export const storageOwner = (session: DemoSession) => session.loggedIn ? session.userId ?? null : session.guest ? 'guest' : null

export function useDemoSession() {
  const [session, setSession] = useState<DemoSession>(readSession)
  const latest = useRef(session)

  // Persist synchronously so a route change in the same handler (login → /home) already sees the new session.
  function update(change: (previous: DemoSession) => DemoSession) {
    const next = change(latest.current)
    latest.current = next
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Demo vẫn dùng được nếu trình duyệt chặn lưu trữ. */ }
    setSession(next)
  }

  async function login(email: string, password: string) {
    if (!(email.trim().toLowerCase() === demoAccount.email && password === demoAccount.password) && !await verifyLocal(email, password)) return false
    const normalized = email.trim().toLowerCase()
    update((previous) => ({ ...previous, loggedIn: true, guest: false, userId: normalized, name: normalized === demoAccount.email ? demoAccount.name : email.trim().split('@')[0] }))
    return true
  }

  function startGuest() { update((previous) => ({ ...previous, loggedIn: false, guest: true, userId: undefined })) }
  function logout() { update((previous) => ({ ...previous, loggedIn: false, guest: false, userId: undefined })) }
  function selectGrade(grade: number) { if (![6, 7, 8, 9, 10, 11, 12].includes(grade)) return; update((previous) => ({ ...previous, grade, gradeSelected: true })) }
  function recordGame(id: string, stars: number) { update(previous => ({ ...previous, gameRecords: { ...previous.gameRecords, [id]: Math.max(previous.gameRecords[id] || 0, stars) } })) }
  function reset() { update((previous) => ({ ...initialSession, loggedIn: previous.loggedIn, guest: previous.guest, name: previous.name, userId: previous.userId, grade: previous.grade, gradeSelected: previous.gradeSelected })) }

  function completeActivity(id: string, reward: number) {
    update((previous) => previous.completedActivities.includes(id) ? previous : {
      ...previous,
      completedActivities: [...previous.completedActivities, id],
      earnedXp: previous.earnedXp + reward,
    })
  }

  return { session, login, startGuest, logout, selectGrade, reset, completeActivity, recordGame }
}

import { useRef, useState } from 'react'
import { demoAccount } from '../data/demo'

export interface DemoSession {
  loggedIn: boolean
  /** Explicit "learn without an account" mode; it opens the app but never borrows the demo member's profile. */
  guest: boolean
  grade: number
  completedActivities: string[]
  earnedXp: number
}

const storageKey = 'xuyen-su-ky-demo-v1'
const initialSession: DemoSession = { loggedIn: false, guest: false, grade: 7, completedActivities: [], earnedXp: 0 }

export function readSession(): DemoSession {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null') as Partial<DemoSession> | null
    if (!saved) return initialSession
    const loggedIn = saved.loggedIn === true
    return {
      loggedIn,
      guest: !loggedIn && saved.guest === true,
      grade: [6, 7, 8, 9, 10, 11, 12].includes(saved.grade ?? 0) ? saved.grade! : 7,
      completedActivities: Array.isArray(saved.completedActivities) ? saved.completedActivities.filter((id): id is string => typeof id === 'string') : [],
      earnedXp: typeof saved.earnedXp === 'number' && Number.isFinite(saved.earnedXp) && saved.earnedXp >= 0 ? saved.earnedXp : 0,
    }
  } catch { return initialSession }
}

/** Whether the learning app at /home may open: a signed-in member or a visitor who chose guest mode. */
export const hasAppAccess = (session: DemoSession) => session.loggedIn || session.guest

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

  function login(email: string, password: string) {
    if (email.trim().toLowerCase() !== demoAccount.email || password !== demoAccount.password) return false
    update((previous) => ({ ...previous, loggedIn: true, guest: false }))
    return true
  }

  function startGuest() { update((previous) => ({ ...previous, loggedIn: false, guest: true })) }
  function logout() { update((previous) => ({ ...previous, loggedIn: false, guest: false })) }
  function selectGrade(grade: number) { update((previous) => ({ ...previous, grade })) }
  function reset() { update((previous) => ({ ...initialSession, loggedIn: previous.loggedIn, guest: previous.guest })) }

  function completeActivity(id: string, reward: number) {
    update((previous) => previous.completedActivities.includes(id) ? previous : {
      ...previous,
      completedActivities: [...previous.completedActivities, id],
      earnedXp: previous.earnedXp + reward,
    })
  }

  return { session, login, startGuest, logout, selectGrade, reset, completeActivity }
}

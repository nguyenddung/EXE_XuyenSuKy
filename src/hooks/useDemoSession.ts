import { useEffect, useState } from 'react'
import { demoAccount } from '../data/demo'

export interface DemoSession {
  loggedIn: boolean
  grade: number
  completedActivities: string[]
  earnedXp: number
}

const storageKey = 'xuyen-su-ky-demo-v1'
const initialSession: DemoSession = { loggedIn: false, grade: 7, completedActivities: [], earnedXp: 0 }

function readSession(): DemoSession {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null') as Partial<DemoSession> | null
    if (!saved) return initialSession
    return {
      loggedIn: saved.loggedIn === true,
      grade: [6, 7, 8, 9, 10, 11, 12].includes(saved.grade ?? 0) ? saved.grade! : 7,
      completedActivities: Array.isArray(saved.completedActivities) ? saved.completedActivities.filter((id): id is string => typeof id === 'string') : [],
      earnedXp: typeof saved.earnedXp === 'number' && Number.isFinite(saved.earnedXp) && saved.earnedXp >= 0 ? saved.earnedXp : 0,
    }
  } catch { return initialSession }
}

export function useDemoSession() {
  const [session, setSession] = useState<DemoSession>(readSession)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(session)) } catch { /* Demo vẫn dùng được nếu trình duyệt chặn lưu trữ. */ }
  }, [session])

  function login(email: string, password: string) {
    if (email.trim().toLowerCase() !== demoAccount.email || password !== demoAccount.password) return false
    setSession(previous => ({ ...previous, loggedIn: true }))
    return true
  }

  function logout() { setSession(previous => ({ ...previous, loggedIn: false })) }
  function selectGrade(grade: number) { setSession(previous => ({ ...previous, grade })) }
  function reset() { setSession({ ...initialSession, loggedIn: true }) }

  function completeActivity(id: string, reward: number) {
    setSession(previous => previous.completedActivities.includes(id) ? previous : {
      ...previous,
      completedActivities: [...previous.completedActivities, id],
      earnedXp: previous.earnedXp + reward,
    })
  }

  return { session, login, logout, selectGrade, reset, completeActivity }
}

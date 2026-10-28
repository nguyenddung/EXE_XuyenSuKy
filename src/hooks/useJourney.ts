import { useEffect, useRef, useState } from 'react'
import { historyApi } from '../lib/historyApi'
import { dayNumber, emptyProgress, journeyStorageKey, parseProgress, type Journey, type JourneyProgress, type JourneySummary } from '../lib/journey'
import { dayKey } from './useLearningJournal'

type Store = Record<string, JourneyProgress>

function readStore(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(journeyStorageKey) || 'null')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return Object.fromEntries(Object.entries(raw).filter(([id]) => /^[a-z0-9_]+$/.test(id)).map(([id, value]) => [id, parseProgress(value)]))
  } catch { return {} }
}

// The chapter a learner last opened, per grade, so the app reopens it next time.
const selectedKey = 'xuyen-su-ky-journey-selected-v1'
function readSelected(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(selectedKey) || 'null')
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.fromEntries(Object.entries(raw).filter(([grade, id]) => /^\d{1,2}$/.test(grade) && typeof id === 'string')) as Record<string, string> : {}
  } catch { return {} }
}

/** Loads the journeys (one per chapter) of the learner's grade and keeps their progress in this browser. */
export function useJourney(grade: number) {
  const [summaries, setSummaries] = useState<JourneySummary[] | null>(null)
  const [journey, setJourney] = useState<Journey | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [store, setStore] = useState<Store>(readStore)
  const [storageError, setStorageError] = useState(false)
  const [calendarDay, setCalendarDay] = useState(dayKey)
  const [selected, setSelected] = useState(readSelected)
  const latest = useRef(store)
  const loaded = useRef(new Map<string, Journey>())

  useEffect(() => { const timer = window.setInterval(() => setCalendarDay(dayKey()), 60000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    historyApi<{ items: JourneySummary[] }>('journeys', controller.signal).then((data) => setSummaries(data.items)).catch((reason) => { if (!controller.signal.aborted) setError((reason as Error).message) })
    return () => controller.abort()
  }, [retry])
  // Chapters of this grade; other grades fall back to all journeys so there is still something to try.
  const forGradeList = summaries?.filter((item) => item.grade === grade) || []
  const choices = forGradeList.length ? forGradeList : summaries || []
  // Reopen the last chapter chosen for this grade, else the first one already started, else the first chapter.
  const chosen = choices.find((item) => item.id === selected[grade]) || choices.find((item) => store[item.id]?.xp) || choices[0]
  useEffect(() => {
    if (!chosen || journey?.id === chosen.id) return
    const cached = loaded.current.get(chosen.id)
    if (cached) { setJourney(cached); return }
    const controller = new AbortController()
    setError('')
    historyApi<Journey>(`journeys/${chosen.id}`, controller.signal).then((data) => { loaded.current.set(data.id, data); setJourney(data) }).catch((reason) => { if (!controller.signal.aborted) setError((reason as Error).message) })
    return () => controller.abort()
  }, [chosen?.id, retry])

  function persist(next: Store) {
    latest.current = next
    setStore(next)
    try { localStorage.setItem(journeyStorageKey, JSON.stringify(next)); setStorageError(false) } catch { setStorageError(true) }
  }

  /** Applies a change to a copy of the current journey's progress, saves it, and returns whatever the change returned. */
  function update<T>(change: (draft: JourneyProgress) => T): T | undefined {
    if (!journey) return undefined
    const draft = structuredClone(latest.current[journey.id] || emptyProgress())
    const result = change(draft)
    persist({ ...latest.current, [journey.id]: draft })
    return result
  }

  const progress = (journey && store[journey.id]) || emptyProgress()
  const status = journey && journey.id === chosen?.id ? 'ready' : error ? 'error' : summaries && !summaries.length ? 'empty' : 'loading'
  return {
    status: status as 'ready' | 'error' | 'empty' | 'loading',
    error,
    retry: () => setRetry((value) => value + 1),
    journey: status === 'ready' ? journey : null,
    /** Whether the journey shown was written for the learner's grade (otherwise it is the closest one available). */
    forGrade: chosen?.grade === grade,
    progress,
    today: dayNumber(calendarDay) + progress.dayOffset,
    update,
    reset: () => persist({}),
    totalXp: Object.values(store).reduce((sum, item) => sum + item.xp, 0),
    storageError,
    /** Chapters the learner can switch between, with how many Sử Ký pieces each already holds. */
    choices: choices.map((item) => ({ ...item, pieces: Object.keys(store[item.id]?.pieces || {}).length })),
    chosenId: chosen?.id,
    select(id: string) {
      const next = { ...selected, [grade]: id }
      setSelected(next)
      try { localStorage.setItem(selectedKey, JSON.stringify(next)) } catch { /* The choice simply is not remembered. */ }
    },
  }
}

export type JourneyState = ReturnType<typeof useJourney>

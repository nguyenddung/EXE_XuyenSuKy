import { useEffect, useRef, useState } from 'react'
import { readSchool, schoolKey, seedSchool, writeSchool, type SchoolStore } from '../lib/school'

const schoolChanged = 'xuyen-su-ky-school-changed'

/** School directory, classes and assignments for the demo roles, kept in localStorage and shared between tabs. */
export function useSchool() {
  const [store, setStore] = useState<SchoolStore>(readSchool)
  const latest = useRef(store)

  useEffect(() => {
    const reload = () => { const next = readSchool(); latest.current = next; setStore(next) }
    const onStorage = (event: StorageEvent) => { if (event.key === schoolKey) reload() }
    // The storage event only reaches other tabs: a change made in this tab (a student joining a class) is announced
    // with schoolChanged so every other part of the page using the store sees it too.
    window.addEventListener('storage', onStorage)
    window.addEventListener(schoolChanged, reload)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(schoolChanged, reload) }
  }, [])

  /** Applies a change; returns the error message when the action is not allowed, otherwise null. */
  function apply(change: (store: SchoolStore) => SchoolStore): string | null {
    try {
      const next = change(latest.current)
      if (next !== latest.current) { latest.current = next; writeSchool(next); setStore(next); window.dispatchEvent(new Event(schoolChanged)) }
      return null
    } catch (error) { return error instanceof Error ? error.message : 'Không thực hiện được thao tác.' }
  }

  const reset = () => apply(() => seedSchool())
  return { store, apply, reset }
}

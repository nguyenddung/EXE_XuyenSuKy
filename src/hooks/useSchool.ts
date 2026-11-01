import { useEffect, useRef, useState } from 'react'
import { readSchool, schoolKey, seedSchool, writeSchool, type SchoolStore } from '../lib/school'

/** School directory, classes and assignments for the demo roles, kept in localStorage and shared between tabs. */
export function useSchool() {
  const [store, setStore] = useState<SchoolStore>(readSchool)
  const latest = useRef(store)

  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === schoolKey) { const next = readSchool(); latest.current = next; setStore(next) } }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Applies a change; returns the error message when the action is not allowed, otherwise null. */
  function apply(change: (store: SchoolStore) => SchoolStore): string | null {
    try {
      const next = change(latest.current)
      if (next !== latest.current) { latest.current = next; writeSchool(next); setStore(next) }
      return null
    } catch (error) { return error instanceof Error ? error.message : 'Không thực hiện được thao tác.' }
  }

  const reset = () => apply(() => seedSchool())
  return { store, apply, reset }
}

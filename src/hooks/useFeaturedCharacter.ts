import { useEffect, useState } from 'react'
import type { Character } from '../types'
import { historyApi } from '../lib/historyApi'

/** Trần Hưng Đạo by default; with `grade`, the first character found in that grade's textbook (him when he is there). */
export function useFeaturedCharacter(grade?: number) {
  const [character, setCharacter] = useState<Character | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    historyApi<{ items: Character[] }>('characters', controller.signal)
      .then(({ items }) => {
        if (controller.signal.aborted) return
        const pool = grade ? items.filter((item) => item.grades.includes(grade)) : items
        setCharacter(pool.find((item) => item.id === 'tran-hung-dao') || pool[0] || null)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [grade])
  return character
}

import { useEffect, useState } from 'react'
import type { Character } from '../types'
import { historyApi } from '../lib/historyApi'

export function useFeaturedCharacter() {
  const [character, setCharacter] = useState<Character | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    historyApi<{ items: Character[] }>('characters', controller.signal)
      .then(({ items }) => { if (!controller.signal.aborted) setCharacter(items.find((item) => item.id === 'tran-hung-dao') || items[0] || null) })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  return character
}

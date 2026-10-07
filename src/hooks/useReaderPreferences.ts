import { useEffect, useState } from 'react'
const key = 'xuyen-su-ky-reader-v1'
export function useReaderPreferences() {
  const [preferences, setPreferences] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); return { large: saved?.large === true, focused: saved?.focused === true } }
    catch { return { large: false, focused: false } }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(preferences)) } catch { /* Reading remains available. */ } }, [preferences])
  return { ...preferences, toggleLarge: () => setPreferences(p => ({ ...p, large: !p.large })), toggleFocus: () => setPreferences(p => ({ ...p, focused: !p.focused })) }
}

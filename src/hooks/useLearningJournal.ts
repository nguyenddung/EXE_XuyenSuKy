import { useEffect, useState } from 'react'
export type JournalKind = 'read' | 'quiz' | 'game' | 'review'
export interface JournalEvent { id: string; kind: JournalKind; day: string }
export interface ReadingCheckpoint { section: number; title: string; grade: number; openedAt: string }
export interface Journal { reading: Record<string, ReadingCheckpoint>; bookmarks: string[]; notes: Record<string,string>; read: string[]; review: Record<string,'again'|'remembered'>; goal: number; events: JournalEvent[] }
const empty: Journal = { reading: {}, bookmarks: [], notes: {}, read: [], review: {}, goal: 3, events: [] }
export const journalKey = 'xuyen-su-ky-journal-v1'
export function dayKey(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) }
export function shiftDay(day: string, offset: number) { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0,10) }
export function streak(events: JournalEvent[], today = dayKey()) { const days = new Set(events.map(e => e.day)); let cursor = days.has(today) ? today : shiftDay(today,-1); let count = 0; while (days.has(cursor)) { count++; cursor = shiftDay(cursor,-1) } return count }
function readJournal(): Journal {
  try {
    const value = JSON.parse(localStorage.getItem(journalKey) || 'null'); if (!value || typeof value !== 'object') return empty
    const strings = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((id): id is string => typeof id === 'string'))] : []
    const notes = Object.fromEntries(Object.entries(value.notes || {}).filter(([,text]) => typeof text === 'string').map(([id,text]) => [id,(text as string).slice(0,2000)]))
    const review = Object.fromEntries(Object.entries(value.review || {}).filter(([,rating]) => rating === 'again' || rating === 'remembered')) as Journal['review']
    const events = Array.isArray(value.events) ? value.events.filter((e: JournalEvent) => e && typeof e.id === 'string' && ['read','quiz','game','review'].includes(e.kind) && typeof e.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.day) && !Number.isNaN(Date.parse(e.day))).slice(-1000) : []
    const reading = Object.fromEntries(Object.entries(value.reading || {}).filter(([id, entry]) => {
      const item = entry as ReadingCheckpoint | null
      return /^LS\d{1,2}_B\d{2}$/.test(id) && item && Number.isInteger(item.section) && item.section >= 0 && item.section < 1000 && typeof item.title === 'string' && [6,7,8,9,10,11,12].includes(item.grade) && typeof item.openedAt === 'string' && !Number.isNaN(Date.parse(item.openedAt))
    })) as Journal['reading']
    return { reading, bookmarks: strings(value.bookmarks), read: strings(value.read), notes, review, events, goal: [1,3,5].includes(value.goal) ? value.goal : 3 }
  } catch { return empty }
}
function log(journal: Journal, id: string, kind: JournalKind): Journal { const day = dayKey(); return journal.events.some(e => e.id === id && e.kind === kind && e.day === day) ? journal : { ...journal, events: [...journal.events,{id,kind,day}].slice(-1000) } }
export function useLearningJournal() {
  const [journal,setJournal] = useState<Journal>(readJournal)
  const [storageError,setStorageError] = useState(false)
  useEffect(() => { try { localStorage.setItem(journalKey,JSON.stringify(journal)); setStorageError(false) } catch { setStorageError(true) } },[journal])
  const bookmark = (id: string) => setJournal(j => ({...j, bookmarks: j.bookmarks.includes(id) ? j.bookmarks.filter(x=>x!==id) : [...j.bookmarks,id]}))
  const note = (id: string, text: string) => setJournal(j => ({...j, notes: {...j.notes,[id]:text.slice(0,2000)}}))
  const markRead = (id: string) => setJournal(j => log({...j,read:[...new Set([...j.read,id])]},id,'read'))
  const rate = (id: string, rating: 'again'|'remembered') => setJournal(j => log({...j,review:{...j.review,[id]:rating}},id,'review'))
  const rememberLesson = (lesson: { id: string; title: string; grade: number }, section: number) => setJournal(j => ({
    ...j, reading: { ...j.reading, [lesson.id]: { section, title: lesson.title, grade: lesson.grade, openedAt: new Date().toISOString() } }
  }))
  const record = (id: string, kind: JournalKind) => setJournal(j => log(j,id,kind))
  const setGoal = (goal: number) => { if ([1,3,5].includes(goal)) setJournal(j=>({...j,goal})) }
  const resetJournal = () => setJournal(empty)
  return { journal, bookmark, note, markRead, rate, rememberLesson, record, setGoal, storageError, resetJournal }
}

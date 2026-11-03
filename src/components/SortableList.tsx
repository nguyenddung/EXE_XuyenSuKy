import { GripVertical } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

export type SortableItem = { key: string; label: string; content: ReactNode }

type Drag = { key: string; pointerId: number; startY: number; waiting: boolean }

/**
 * Ordered list rearranged by drag and drop. A mouse can grab the whole row; touch grabs the
 * handle so the rest of the row still scrolls the page. A focused row moves with ↑ ↓.
 * `onMove` always swaps two neighbours, so callers only implement an adjacent swap.
 */
export function SortableList({ items, onMove, disabled = false, className, numberClassName }: { items: SortableItem[]; onMove: (from: number, to: number) => void; disabled?: boolean; className: string; numberClassName: string }) {
  const list = useRef<HTMLOListElement>(null)
  const drag = useRef<Drag | null>(null)
  const [dragging, setDragging] = useState<{ key: string; dy: number } | null>(null)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const order = useRef(items)
  order.current = items

  // The parent has re-rendered with the swapped order: the next move may swap again.
  useLayoutEffect(() => { if (drag.current) drag.current.waiting = false }, [items])
  useEffect(() => {
    if (!focusKey) return
    list.current?.querySelector<HTMLElement>(`[data-sort-key="${CSS.escape(focusKey)}"]`)?.focus()
    setFocusKey(null)
  }, [focusKey, items])

  const announce = (key: string, index: number) => {
    const item = order.current.find(entry => entry.key === key)
    if (item) setAnnouncement(`${item.label}: vị trí ${index + 1} trên ${order.current.length}`)
  }

  function start(event: PointerEvent<HTMLLIElement>, key: string) {
    if (disabled || event.button !== 0) return
    if (event.pointerType !== 'mouse' && !(event.target as HTMLElement).closest('.sortable-handle')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { key, pointerId: event.pointerId, startY: event.clientY, waiting: false }
    setDragging({ key, dy: 0 })
  }

  function follow(event: PointerEvent<HTMLLIElement>) {
    const current = drag.current
    if (!current || event.pointerId !== current.pointerId) return
    const rows = Array.from(list.current?.children ?? []) as HTMLElement[]
    const index = order.current.findIndex(item => item.key === current.key)
    const dy = event.clientY - current.startY
    const row = rows[index], next = rows[index + 1], previous = rows[index - 1]
    if (!current.waiting && row) {
      // Swap once the dragged row passes the middle of its neighbour, then rebase so it stays under the pointer.
      if (next && row.offsetTop + row.offsetHeight + dy > next.offsetTop + next.offsetHeight / 2) {
        current.startY += next.offsetTop + next.offsetHeight - row.offsetHeight - row.offsetTop
        current.waiting = true
        onMove(index, index + 1)
      } else if (previous && row.offsetTop + dy < previous.offsetTop + previous.offsetHeight / 2) {
        current.startY += previous.offsetTop - row.offsetTop
        current.waiting = true
        onMove(index, index - 1)
      }
    }
    setDragging({ key: current.key, dy: event.clientY - current.startY })
  }

  function end(event: PointerEvent<HTMLLIElement>) {
    const current = drag.current
    if (!current || event.pointerId !== current.pointerId) return
    drag.current = null
    setDragging(null)
    announce(current.key, order.current.findIndex(item => item.key === current.key))
  }

  function keyboard(event: KeyboardEvent<HTMLLIElement>, index: number, key: string) {
    if (disabled || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    event.preventDefault()
    const target = event.key === 'ArrowUp' ? index - 1 : index + 1
    if (target < 0 || target >= items.length) return
    onMove(index, target)
    setFocusKey(key)
    announce(key, target)
  }

  return <>
    <ol ref={list} className={`${className} sortable-list`}>
      {items.map((item, index) => {
        const active = dragging?.key === item.key
        return <li key={item.key} data-sort-key={item.key} tabIndex={disabled ? -1 : 0} aria-roledescription="mục kéo thả" aria-label={`${item.label}, vị trí ${index + 1} trên ${items.length}`} aria-disabled={disabled || undefined}
          className={`sortable-item${active ? ' is-dragging' : ''}`} style={active ? { transform: `translateY(${dragging.dy}px)` } : undefined}
          onPointerDown={event => start(event, item.key)} onPointerMove={follow} onPointerUp={end} onPointerCancel={end} onKeyDown={event => keyboard(event, index, item.key)}>
          <span className={numberClassName}>{index + 1}</span>
          <span>{item.content}</span>
          <span className="sortable-handle" aria-hidden="true"><GripVertical size={20} /></span>
        </li>
      })}
    </ol>
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </>
}

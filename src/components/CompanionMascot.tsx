import { useEffect, useId, useRef, useState } from 'react'

/**
 * What the companion is doing; companion.css animates each mood.
 * idle: breathes and blinks, now and then tilts its head, turns a page, hops or looks around ·
 * wave: waves hello (a few times, then rests) · lifted: being dragged, feet dangling · land: just dropped ·
 * happy: hops with sparkles.
 */
export type MascotMood = 'idle' | 'wave' | 'lifted' | 'land' | 'happy'
type IdleAction = 'tilt' | 'page' | 'hop' | 'look'
const idleActions: IdleAction[] = ['tilt', 'page', 'hop', 'look']

export interface MascotProps {
  mood?: MascotMood
  /** Pupils follow the pointer. */
  track?: boolean
  /** Small spontaneous actions while idle. */
  lively?: boolean
  /** Rendered width in px; the height follows the drawing. */
  size?: number
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Kim Quy, the Xuyên Sử Ký turtle, standing with a book: same colours, shell and face as the brand mascot
 * (public/images/brand/xuyen-su-ky-mascot-brand-avatar.svg), drawn in parts so each one can move. The head reuses
 * the brand drawing's coordinates, scaled into place.
 */
export function TurtleMascot({ mood = 'idle', track = false, lively = false, size = 76 }: MascotProps) {
  const svg = useRef<SVGSVGElement>(null)
  const id = useId().replace(/:/g, '')
  const [action, setAction] = useState<IdleAction | null>(null)

  useEffect(() => {
    const element = svg.current
    if (!track || !element) return
    let frame = 0, x = 0, y = 0
    const look = () => {
      frame = 0
      const box = element.getBoundingClientRect()
      const dx = x - (box.left + box.width / 2), dy = y - (box.top + box.height * 0.3)
      const distance = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, distance / 140)
      element.style.setProperty('--cm-px', `${(dx / distance * 2 * reach).toFixed(2)}px`)
      element.style.setProperty('--cm-py', `${(dy / distance * 2.2 * reach).toFixed(2)}px`)
    }
    const move = (event: PointerEvent) => { x = event.clientX; y = event.clientY; if (!frame) frame = requestAnimationFrame(look) }
    const rest = () => { element.style.setProperty('--cm-px', '0px'); element.style.setProperty('--cm-py', '0px') }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', rest)
    return () => { window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', rest); cancelAnimationFrame(frame) }
  }, [track])

  useEffect(() => {
    if (!lively || mood !== 'idle' || reducedMotion()) return
    let next = 0, done = 0
    const schedule = () => {
      next = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setAction(idleActions[Math.floor(Math.random() * idleActions.length)])
          done = window.setTimeout(() => setAction(null), 1800)
        }
        schedule()
      }, 9000 + Math.random() * 9000)
    }
    schedule()
    return () => { window.clearTimeout(next); window.clearTimeout(done); setAction(null) }
  }, [lively, mood])

  const shell = 'M19,106 C12,86 16,62 35,53 C47,47 73,47 85,53 C104,62 108,86 101,106 Q60,116 19,106 Z'
  const head = 'M76,20 C99,20 112,31 112,51 C112,71 100,84 76,84 C52,84 40,71 40,51 C40,31 53,20 76,20 Z'
  const star = 'M0,-5 L1.3,-1.3 L5,0 L1.3,1.3 L0,5 L-1.3,1.3 L-5,0 L-1.3,-1.3 Z'

  return <svg ref={svg} className="cm" data-mood={mood} data-action={action ?? undefined} viewBox="0 0 120 132" width={size} height={Math.round(size * 132 / 120)} aria-hidden="true" focusable="false">
    <defs>
      <clipPath id={`${id}-shell`}><path d={shell} /></clipPath>
      <clipPath id={`${id}-head`}><path d={head} /></clipPath>
    </defs>
    <ellipse className="cm-shadow" cx="60" cy="125" rx="28" ry="4.5" />
    <g className="cm-figure"><g className="cm-breath">
      <g className="cm-feet">
        <rect x="33" y="104" width="22" height="17" rx="8.5" fill="#FCBE47" />
        <ellipse cx="39.5" cy="114.5" rx="2.6" ry="4.2" fill="#A67029" />
        <ellipse cx="48.5" cy="114.5" rx="2.6" ry="4.2" fill="#A67029" />
        <rect x="65" y="104" width="22" height="17" rx="8.5" fill="#FCBE47" />
        <ellipse cx="71.5" cy="114.5" rx="2.6" ry="4.2" fill="#A67029" />
        <ellipse cx="80.5" cy="114.5" rx="2.6" ry="4.2" fill="#A67029" />
      </g>
      <path d={shell} fill="#523629" />
      <g clipPath={`url(#${id}-shell)`} fill="none" stroke="#BD4D31" strokeWidth="4.5" strokeLinejoin="round">
        <path d="M30,56 L42,68 M14,84 L31,88 L42,80 M31,88 L30,110" />
        <path d="M90,56 L78,68 M106,84 L89,88 L78,80 M89,88 L90,110" />
      </g>
      <rect x="31" y="54" width="58" height="58" rx="25" fill="#E69B28" />
      <rect x="37" y="58" width="46" height="52" rx="21" fill="#FEF2CD" />
      <path d="M37,76 Q60,71 83,76 L83,82 Q60,77 37,82 Z" fill="#FEDA95" />
      <path d="M38,95 Q60,90 82,95 L82,100 Q60,95 38,100 Z" fill="#FEDA95" />

      <g className="cm-arm cm-arm--wave">
        <path d="M83,64 C92,72 93,86 89,95" fill="none" stroke="#FCBE47" strokeWidth="11" strokeLinecap="round" />
        <circle cx="88.5" cy="96" r="6.2" fill="#FCBE47" />
        <ellipse cx="86" cy="99.5" rx="1.7" ry="2.8" fill="#A67029" />
        <ellipse cx="90.6" cy="99.2" rx="1.7" ry="2.8" fill="#A67029" />
      </g>

      <g transform="rotate(-6 53 89)">
        <rect x="37.5" y="78" width="31" height="21.5" rx="3" fill="#BD4D31" />
        <path d="M40,80 Q46.5,78.5 53,80.5 L53,97 Q46.5,95.5 40,97 Z" fill="#FFFDF6" />
        <path d="M53,80.5 Q59.5,78.5 66,80 L66,97 Q59.5,95.5 53,97 Z" fill="#FFF3DA" />
        <path d="M43,85 H50 M43,88.5 H50 M43,92 H48 M56,85 H63 M56,88.5 H63 M56,92 H61" stroke="#E2CFA6" strokeWidth="1.2" strokeLinecap="round" />
        <path className="cm-page" d="M53,80.5 Q59.5,78.5 66,80 L66,97 Q59.5,95.5 53,97 Z" fill="#FFFDF6" stroke="#EADBB8" strokeWidth=".6" />
      </g>
      <g className="cm-arm cm-arm--hold">
        <path d="M37,64 C28,72 29,88 38,95" fill="none" stroke="#FCBE47" strokeWidth="11" strokeLinecap="round" />
        <circle cx="40" cy="95" r="6" fill="#FCBE47" />
        <ellipse cx="43.6" cy="92.6" rx="1.7" ry="2.8" fill="#A67029" />
      </g>

      <path d="M39,61 Q60,72 81,61 L82,67.5 Q60,79 38,67.5 Z" fill="#BD4D31" />
      <path className="cm-scarf-tail" d="M63,70 L72,86 Q68.5,88.5 65,86.5 L59.5,71.5 Z" fill="#A63F27" />

      <g className="cm-head"><g transform="translate(60 37) scale(.86) translate(-76 -52)">
        <path d={head} fill="#FCBE47" />
        <path d="M30,14 L122,14 L82,38 Q76,44 70,38 Z" fill="#E69B28" clipPath={`url(#${id}-head)`} />
        <g fill="none" stroke="#FEF2CD" strokeLinecap="round">
          <path d="M37,44 C32,35 40,29 50,30 C58,31 63,34 66,38" strokeWidth="8" />
          <path d="M115,44 C120,35 112,29 102,30 C94,31 89,34 86,38" strokeWidth="8" />
          <path d="M38,69 C36,77 44,80 52,79.5 C57,79 61,77.5 64,76" strokeWidth="9" />
          <path d="M114,69 C116,77 108,80 100,79.5 C95,79 91,77.5 88,76" strokeWidth="9" />
        </g>
        <ellipse cx="50" cy="70" rx="6" ry="3.4" fill="#F2876A" opacity=".35" />
        <ellipse cx="102" cy="70" rx="6" ry="3.4" fill="#F2876A" opacity=".35" />
        {mood === 'happy'
          ? <g fill="none" stroke="#4C2F1B" strokeWidth="3" strokeLinecap="round">
            <path d="M49,58 Q57,48 65,58" /><path d="M87,58 Q95,48 103,58" />
          </g>
          : <g className="cm-eyes">
            <ellipse cx="57" cy="55" rx="9.5" ry="10.5" fill="#FFFFFF" />
            <ellipse cx="95" cy="55" rx="9.5" ry="10.5" fill="#FFFFFF" />
            <g className="cm-pupils">
              <ellipse cx="59.5" cy="56" rx="5.4" ry="7.2" fill="#4C2F1B" />
              <circle cx="62.5" cy="51.2" r="1.9" fill="#FFFFFF" />
              <ellipse cx="92.5" cy="56" rx="5.4" ry="7.2" fill="#4C2F1B" />
              <circle cx="96.5" cy="51.2" r="1.9" fill="#FFFFFF" />
            </g>
          </g>}
        <circle cx="72" cy="64" r="1.7" fill="#A67029" />
        <circle cx="80" cy="64" r="1.7" fill="#A67029" />
        {mood === 'lifted'
          ? <ellipse cx="76" cy="74" rx="3.6" ry="4.6" fill="#8E4A26" />
          : mood === 'wave' || mood === 'happy'
            ? <path d="M67,71 Q76,83 85,71 Q76,74 67,71 Z" fill="#8E4A26" />
            : <path d="M66,72 Q76,78 86,72" fill="none" stroke="#A67029" strokeWidth="2" strokeLinecap="round" />}
      </g></g>
    </g></g>
    <g className="cm-sparkles" fill="#FFC044">
      <g transform="translate(17 26)"><path className="cm-star" d={star} /></g>
      <g transform="translate(104 20)"><path className="cm-star" d={star} /></g>
      <g transform="translate(108 60) scale(.7)"><path className="cm-star" d={star} /></g>
    </g>
  </svg>
}

/** Drawing for each animal in companionSpecies (lib/companion.ts); an unknown one gets the turtle. */
const mascots: Record<string, (props: MascotProps) => JSX.Element> = { turtle: TurtleMascot }
export const mascotFor = (species: string) => mascots[species] ?? TurtleMascot

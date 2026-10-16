import { useId } from 'react'
import { Headphones, Mic, Sparkles, Volume2 } from 'lucide-react'
import type { Character } from '../types'
import type { CharacterActivity } from '../lib/animatedCharacters'

interface Props { character: Character; activity: CharacterActivity }

const activityLabels: Record<CharacterActivity, string> = {
  idle: 'Sẵn sàng trò chuyện',
  listening: 'Đang lắng nghe em',
  thinking: 'Đang tìm trong sách…',
  loading: 'Đang chuẩn bị giọng nói…',
  speaking: 'Đang nói cùng em',
}

/** An articulated SVG portrait. Speech motion follows actual playback, never request time. */
export function CharacterStage({ character, activity }: Props) {
  const id = useId().replace(/:/g, '')
  const veteran = character.id === 'tran-hung-dao'
  const paint = (name: string) => `url(#${id}-${name})`
  const Icon = activity === 'listening' ? Mic : activity === 'speaking' ? Volume2 : activity === 'idle' ? Headphones : Sparkles

  return <aside className={`character-stage character-stage--${character.id}`} data-activity={activity} aria-label={`Nhân vật hoạt hoạ ${character.name}`}>
    <div className="stage-topline"><span><span className="stage-live-dot" /> GẶP GỠ LỊCH SỬ</span><span>HOẠT HOẠ 2D</span></div>
    <div className="stage-landscape" aria-hidden="true">
      <svg viewBox="0 0 600 760" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#e8d9ae" /><stop offset=".55" stopColor="#f4e9c9" /><stop offset="1" stopColor="#819e92" /></linearGradient>
          <linearGradient id={`${id}-water`} x2="0" y2="1"><stop stopColor="#91b1a5" /><stop offset="1" stopColor="#284f4a" /></linearGradient>
        </defs>
        <path fill={paint('sky')} d="M0 0h600v760H0z" />
        <circle cx="320" cy="240" r="157" fill="#f3d28b" opacity=".65" />
        <circle cx="320" cy="240" r="178" fill="none" stroke="#fff7d8" opacity=".4" />
        <path d="M0 380 35 287 66 313 103 215 134 240 173 351 220 298 275 394 318 354 366 277 396 286 437 201 474 240 514 332 557 272 600 337V580H0Z" fill="#7c9486" opacity=".35" />
        <path d="M0 415 49 351 73 361 120 286 145 319 189 454 248 396 295 467 340 404 380 347 419 377 452 318 493 350 541 433 600 363V580H0Z" fill="#496d62" opacity=".45" />
        <path fill={paint('water')} d="M0 488h600v272H0z" />
        {[520, 548, 587, 624, 671, 715].map((y, i) => <path key={y} d={`M${i % 2 ? -20 : 10} ${y}q70 -8 135 0t140 0t145 0t160 0`} fill="none" stroke="#e1e5ca" strokeWidth="2" opacity=".25" />)}
        <g fill="#6c5440" stroke="#e6cea0" strokeWidth="1" opacity=".7">
          <path d="M20 512q48 25 105 0l-18 24H40Z" /><path d="M66 420v102m4-93 37 64H70Z" fill="#a66248" />
          <path d="M466 495q48 25 105 0l-18 24h-67Z" /><path d="M518 400v107m4-96 35 64h-35Z" fill="#a66248" />
        </g>
        <g stroke="#513e2d" strokeWidth="8" strokeLinecap="round" opacity=".55"><path d="m25 660 12-67m35 115 9-65m447 30-10-65m48 15-9-60" /></g>
      </svg>
    </div>
    <div className="stage-portrait-wrap">
      <svg className={`stage-character${veteran ? ' stage-character--veteran' : ''}`} viewBox="0 0 500 620" role="img" aria-label={`Minh hoạ ${character.name}, ${activityLabels[activity].toLocaleLowerCase('vi')}`}>
        <defs>
          <linearGradient id={`${id}-skin`} x1="0" x2="1" y2=".7"><stop stopColor="#f5c994" /><stop offset=".5" stopColor="#eab580" /><stop offset="1" stopColor="#c68a59" /></linearGradient>
          <linearGradient id={`${id}-armor`} x2=".9" y2="1"><stop stopColor={veteran ? '#44675e' : '#516a67'} /><stop offset="1" stopColor="#203b36" /></linearGradient>
          <linearGradient id={`${id}-gold`} x2="1" y2="1"><stop stopColor="#f1d18a" /><stop offset=".45" stopColor="#bc8c49" /><stop offset="1" stopColor="#80602f" /></linearGradient>
          <linearGradient id={`${id}-cape`} x2="1" y2=".8"><stop stopColor={veteran ? '#b35b46' : '#a77542'} /><stop offset="1" stopColor={veteran ? '#713d36' : '#65412e'} /></linearGradient>
          <linearGradient id={`${id}-hat`} x2=".8" y2="1"><stop stopColor="#3d4540" /><stop offset="1" stopColor="#202c29" /></linearGradient>
          <pattern id={`${id}-scales`} width="27" height="29" patternUnits="userSpaceOnUse"><path d="M1 1h25v19q-12 13-25 0Z" fill="none" stroke="#bfa267" strokeWidth="1.2" opacity=".55" /><path d="M13 3v18" stroke="#142f2b" opacity=".35" /><circle cx="13" cy="6" r="1.7" fill="#bfa267" /></pattern>
          <filter id={`${id}-shadow`} x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#153e35" floodOpacity=".22" /></filter>
        </defs>
        <ellipse cx="250" cy="604" rx="172" ry="13" fill="#163e35" opacity=".18" />
        <g className="actor-breathe" filter={paint('shadow')}>
          <path className="actor-cape" d="M153 278Q83 286 73 392L41 603q100-21 164-9l243 9-31-174q-6-130-97-153Z" fill={paint('cape')} stroke="#563d32" strokeWidth="3" />
          <path d="m107 383-35 196m315-185 33 180" fill="none" stroke="#e9b071" strokeWidth="3" opacity=".35" />
          <path d="M152 302q98-43 197 0l33 280q-131 36-262 0Z" fill={paint('armor')} stroke="#243c33" strokeWidth="3" />
          <path d="m158 333 185 1 26 243q-119 26-233 0Z" fill={paint('scales')} />
          <path d="m182 284 68 58 66-58-28-20h-78Z" fill="#ead8af" stroke="#665c43" strokeWidth="3" />
          <path d="m174 290 76 52-33 47-59-80m170-20-78 53 31 46 68-74" fill={paint('armor')} stroke="#b99b60" strokeWidth="4" />
          <g className="actor-rest-arm">
            <path d="M137 313Q75 324 81 396l11 130 53-3 27-154Z" fill={paint('armor')} stroke="#233c33" strokeWidth="3" />
            <path d="M108 468 92 516l55 12 9-49Z" fill={paint('gold')} stroke="#6f592f" strokeWidth="3" />
            <path d="M97 520q-12 23-3 49 6 15 15 4 7 17 14 4 14 7 17-9l4-39Z" fill={paint('skin')} stroke="#a8714e" strokeWidth="2" />
          </g>
          <g className="actor-gesture-arm">
            <path d="M352 315q53 3 63 65l-5 101q-12 33-45 15l-28-101Z" fill={paint('armor')} stroke="#233c33" strokeWidth="3" />
            <g className="actor-forearm">
              <path d="M372 440q16-10 34 9l20 53q-8 27-35 24l-35-59Z" fill={paint('armor')} stroke="#233c33" strokeWidth="3" />
              <path d="m363 454 39-18 12 23-40 22Z" fill={paint('gold')} stroke="#6f592f" strokeWidth="3" />
              <g className="actor-hand">
                <path d="M369 453q-13-12-17-28l-6-23q-1-9 5-9t12 26l-1-48q0-10 7-9t8 40l4-43q2-9 8-5t3 44l7-34q3-8 8-4t-1 44l7-21q4-9 9-4t-9 45q-5 19-22 28Z" fill={paint('skin')} stroke="#ae7851" strokeWidth="2" strokeLinejoin="round" />
                <path d="m365 421 20 8 10 14m-18-41 0 20m14-24-3 23" fill="none" stroke="#bf875b" strokeWidth="2" strokeLinecap="round" />
              </g>
            </g>
          </g>
          <path d="M146 300q-34 3-48 40l-8 33q40 21 76-3l21-43Z" fill={paint('gold')} stroke="#735b33" strokeWidth="3" />
          <path d="M351 300q34 3 48 40l8 33q-40 21-76-3l-21-43Z" fill={paint('gold')} stroke="#735b33" strokeWidth="3" />
          <g fill="none" stroke="#735b33" strokeWidth="2"><path d="M108 355q30 17 55-8m-47-4q18 9 39-6m183 10q25 25 57 8m-47-18q21 15 39 6" /><path d="m119 324 21 8-14 17 22-8 8 15 2-25 14-8m173 0 18 8-14 17 22-8 8 15 2-25 10-8" /></g>
          <circle cx="250" cy="434" r="54" fill={paint('gold')} stroke="#e1c381" strokeWidth="3" />
          <circle cx="250" cy="434" r="44" fill="none" stroke="#715c36" strokeWidth="2" />
          <path d="M232 460q-24-18-7-38 13-15 33-6l-4-14 23 12-7 15-16-4q-22-4-21 12 0 12 14 13 20 0 18-19 18 11 8 24-13 16-34 7m-6-42-8-10m31 9 7-3m-21 28-9 11" fill="none" stroke="#705832" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M124 535q127 24 253 0l-1 29q-125 22-252-1Z" fill={paint('gold')} stroke="#705832" strokeWidth="3" />
          <rect x="226" y="532" width="49" height="39" rx="9" fill="#b49152" stroke="#f0d294" strokeWidth="3" />
          <circle cx="250" cy="551" r="11" fill="none" stroke="#765e32" strokeWidth="3" />
          <g className="actor-head">
            <path d="M192 97q-24 73-38 181l33-24 24-136m91-14q23 70 31 164l-26-21-28-123" fill={paint('hat')} />
            <path d="m214 224 1 53 35 31 37-32-3-53Z" fill={paint('skin')} stroke="#b27b50" strokeWidth="2" />
            <path d="m216 236 66-1-2 24q-37 8-64-23" fill="#ae734e" opacity=".45" />
            <ellipse cx="185" cy="166" rx="17" ry="27" fill={paint('skin')} stroke="#a87049" strokeWidth="2" />
            <ellipse cx="315" cy="166" rx="17" ry="27" fill={paint('skin')} stroke="#a87049" strokeWidth="2" />
            <path d="m182 155 8 17-8 9m136-26-8 17 8 9" fill="none" stroke="#b97e52" strokeWidth="3" strokeLinecap="round" />
            <path d="M184 111q0-59 67-60 67 4 66 64l-7 79q-4 37-58 61-52-19-61-57Z" fill={paint('skin')} stroke="#a6724d" strokeWidth="2.5" />
            <path d="M188 125q7 63 14 70l-1-68m108-2q-6 63-14 70l1-68" fill="#30382d" />
            <path d="M197 133q21-17 43-2l-1 7q-25-8-43 2Zm65-2q23-15 43 2l1 7q-20-10-43-2Z" fill="#32382b" />
            <g className="actor-eyes">
              <path d="M201 153q18-15 36 0-19 15-36 0m65 0q18-15 36 0-18 15-36 0" fill="#fff5df" stroke="#865b38" strokeWidth="2" />
              <ellipse cx="221" cy="153" rx="6" ry="8" fill="#30372c" /><ellipse cx="282" cy="153" rx="6" ry="8" fill="#30372c" />
              <circle cx="223" cy="150" r="2" fill="#fff" /><circle cx="284" cy="150" r="2" fill="#fff" />
            </g>
            <path d="m248 151-7 29q9 8 20 0m-50-16 22 1m37 0 20-1" fill="none" stroke="#b97f52" strokeWidth="2" strokeLinecap="round" />
            {veteran && <g fill="none" stroke="#be875d" strokeWidth="1.5" opacity=".8"><path d="m208 119 26-3m34 0 26 3m-94 48 9 5m86-5-9 5m-81 14-4 12m88-12 4 12" /></g>}
            <path d="M212 195q12-13 34-6l5 4 6-4q21-6 32 6l5 13q-20-10-41-9-24-1-47 10Z" fill="#33382c" />
            <path className="actor-mouth-closed" d="M232 204q19 9 38 0" fill="none" stroke="#8f4e3c" strokeWidth="3" strokeLinecap="round" />
            <g className="actor-mouth-open">
              <path d="M231 202q20 4 40 0-1 20-20 20-18-1-20-20" fill="#693c32" stroke="#a35f49" strokeWidth="2" />
              <path d="m234 204 34 0-3 5h-28Z" fill="#fff0d5" /><ellipse cx="251" cy="218" rx="11" ry="3" fill="#d68e76" />
            </g>
            <path d={veteran ? 'M207 211q9 27 31 27l13-11 13 11q23-3 31-27-1 46-43 69-40-24-45-69' : 'M224 222q15 12 27 3 12 9 28-3-5 33-27 43-22-11-28-43'} fill="#333a2f" />
            <g fill="none" stroke={veteran ? '#a8a18b' : '#66705a'} strokeWidth="2" opacity=".65"><path d="m240 238 6 22m9-23-2 30m12-29-7 21" />{veteran && <path d="m212 219 12 20m64-20-12 20m-47 0 12 21m33-21-12 21" />}</g>
            <ellipse cx="250" cy="63" rx="33" ry="28" fill={paint('hat')} stroke="#1c2d27" strokeWidth="3" />
            <path d="M179 116q-8-53 36-66 69-19 103 27l5 46q-69-39-144-7Z" fill={paint('hat')} stroke="#203128" strokeWidth="3" />
            <path d="M182 102q59-48 135-14m-125-5q52-31 101-13m-109 44q70-36 136-2" fill="none" stroke="#667063" strokeWidth="3" opacity=".6" />
            {!veteran && <path d="M184 109q66-34 135-4" fill="none" stroke="#bf9b58" strokeWidth="5" />}
          </g>
        </g>
      </svg>
    </div>
    <div className="stage-caption"><span>{character.period}</span><strong>{character.name}</strong><p>{veteran ? 'Hào khí Đông A · Dòng sông Bạch Đằng' : 'Bạch Đằng dậy sóng · Dấu mốc tự chủ'}</p></div>
    <div className="stage-status" role="status"><Icon size={16} aria-hidden="true" /><span>{activityLabels[activity]}</span><span className="stage-sound" aria-hidden="true"><i /><i /><i /><i /><i /></span></div>
    <span className="stage-disclaimer">Nhân vật và giọng nói mô phỏng</span>
  </aside>
}

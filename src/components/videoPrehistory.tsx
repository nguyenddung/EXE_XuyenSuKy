import type { ReactNode } from 'react'
import type { HumanForm, VideoCast, VideoFind, VideoScene } from '../lib/journey'

// Prehistory set for mission videos (lessons on human origins): dusk savanna backdrop, the three stages of human
// evolution as articulated figures, a timeline, and an excavation cross-section where finds come to light.
// Figures are stylised silhouettes (fur for the early forms, an animal-skin wrap for Người tinh khôn), feet at (0, 0).
// Everything is a pure function of the scene time, like the rest of the video.

const W = 1600
const H = 900
const ink = '#1d1408'
const cream = '#fbf3df'
const gold = '#f2b24c'
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3)
const enter = (t: number, at: number, length = 0.8) => ease((t - at) / length)
const wave = (t: number, speed: number, phase = 0) => Math.sin(t * speed + phase)

export const formNames: Record<HumanForm, string> = { vuon_nguoi: 'Vượn người', nguoi_toi_co: 'Người tối cổ', nguoi_tinh_khon: 'Người tinh khôn' }

// ---------------------------------------------------------------- backdrop and title emblem

export function PrehistoryBackdrop({ t }: { t: number }) {
  return <g>
    <defs>
      <linearGradient id="jv-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#241a3a" /><stop offset="0.55" stopColor="#7a3f45" /><stop offset="1" stopColor="#d9844a" /></linearGradient>
      <radialGradient id="jv-sun-glow"><stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#jv-dusk)" />
    <circle cx={1280} cy={560} r={260 + 10 * wave(t, 0.8)} fill="url(#jv-sun-glow)" />
    <circle cx={1280} cy={560} r={110} fill="#ffcf73" opacity={0.85} />
    <path d="M 0 640 L 160 560 L 300 610 L 470 520 L 650 600 L 820 540 L 1000 610 L 1180 560 L 1380 620 L 1600 570 L 1600 900 L 0 900 Z" fill="#4b2a33" opacity={0.75} />
    <g transform="translate(180 650)" fill="#2c1820"><rect x={-8} y={-150} width={16} height={150} /><path d="M -150 -150 C -90 -200 90 -200 150 -150 C 90 -165 -90 -165 -150 -150 Z" /><path d="M 0 -120 L -60 -160 M 0 -110 L 55 -160" stroke="#2c1820" strokeWidth={10} /></g>
  </g>
}

export function SunEmblem({ radius, t }: { radius: number; t: number }) {
  return <g>
    <g transform={`rotate(${t * 6})`}>{Array.from({ length: 16 }, (_, index) => <rect key={index} x={-6} y={-radius * 1.45} width={12} height={radius * 0.32} rx={6} fill={gold} transform={`rotate(${index * 22.5})`} />)}</g>
    <circle r={radius} fill={gold} />
    <circle r={radius * 0.78} fill="none" stroke={cream} strokeWidth={radius * 0.05} strokeDasharray={`${radius * 0.06} ${radius * 0.08}`} />
    <circle r={radius * 0.45} fill="#ffd98a" />
  </g>
}

// ---------------------------------------------------------------- the three human forms

const forms: Record<HumanForm, { lean: number; torso: number; leg: number; arm: number; head: number; body: string; face: string; brow: boolean; wrap: boolean }> = {
  vuon_nguoi: { lean: 58, torso: 86, leg: 66, arm: 104, head: 23, body: '#4a2e1a', face: '#a87850', brow: true, wrap: false },
  nguoi_toi_co: { lean: 18, torso: 88, leg: 88, arm: 86, head: 24, body: '#6a4327', face: '#b98457', brow: true, wrap: false },
  nguoi_tinh_khon: { lean: 3, torso: 86, leg: 98, arm: 80, head: 25, body: '#c58b5a', face: '#c58b5a', brow: false, wrap: true },
}

interface HomininProps { form: HumanForm; x: number; y: number; scale?: number; facing?: 1 | -1; walk?: number; armSwing?: number; hold?: ReactNode; opacity?: number }

/** walk: phase of the walking cycle (undefined = standing); armSwing: extra rotation of the front arm (negative = forward). */
export function Hominin({ form, x, y, scale = 1, facing = 1, walk, armSwing = 0, hold, opacity = 1 }: HomininProps) {
  const f = forms[form]
  const step = walk === undefined ? 0 : Math.sin(walk)
  const bob = walk === undefined ? 0 : -4 * Math.abs(Math.cos(walk))
  const limb = (angle: number, length: number, width: number, color: string, item?: ReactNode) => <g transform={`rotate(${angle})`}><rect x={-width / 2} y={-width / 2} width={width} height={length} rx={width / 2} fill={color} />{item && <g transform={`translate(0 ${length - 6})`}>{item}</g>}</g>
  const shade = form === 'nguoi_tinh_khon' ? '#a8744a' : '#3a2414'
  return <g transform={`translate(${x} ${y + bob}) scale(${scale * facing} ${scale})`} opacity={opacity}>
    <g transform={`translate(-7 ${-f.leg})`}>{limb(22 * step + (form === 'vuon_nguoi' ? 18 : 0), f.leg + 6, 18, shade)}</g>
    <g transform={`translate(7 ${-f.leg})`}>{limb(-22 * step + (form === 'vuon_nguoi' ? -10 : 0), f.leg + 6, 18, f.body)}</g>
    <g transform={`translate(0 ${-f.leg}) rotate(${f.lean})`}>
      <g transform={`translate(-4 ${-f.torso + 12}) rotate(${-f.lean - 14 * step})`}>{limb(0, f.arm, 15, shade)}</g>
      <rect x={-23} y={-f.torso} width={46} height={f.torso + 6} rx={20} fill={f.body} />
      {!f.wrap && <path d={`M -18 ${-f.torso + 20} q 8 6 0 12 M -6 ${-f.torso / 2} q 8 6 0 12 M 8 ${-f.torso + 34} q 8 6 0 12`} stroke="#2a180c" strokeWidth={3} fill="none" opacity={0.6} />}
      {f.wrap && <path d={`M -24 -30 L 24 -36 L 22 8 L -22 8 Z M -24 ${-f.torso + 6} L 8 ${-f.torso + 4} L 24 -36 L 10 -30 Z`} fill="#8a6234" stroke="#5f4020" strokeWidth={3} />}
      <g transform={`translate(8 ${-f.torso - f.head + 8})`}>
        <circle r={f.head} fill={f.body} />
        <ellipse cx={8} cy={4} rx={f.head * 0.7} ry={f.head * 0.75} fill={f.face} />
        {f.brow && <path d={`M -2 -4 Q 12 -12 ${f.head + 2} -4`} stroke="#2a180c" strokeWidth={6} strokeLinecap="round" fill="none" />}
        {f.wrap && <path d={`M ${-f.head} -2 C ${-f.head} ${-f.head * 1.3} ${f.head} ${-f.head * 1.4} ${f.head} -6 C ${f.head * 0.4} -14 0 -12 ${-f.head * 0.6} 8 Z`} fill="#2a1a10" />}
        <circle cx={14} cy={0} r={3} fill="#1d1408" />
      </g>
      <g transform={`translate(4 ${-f.torso + 12}) rotate(${-f.lean + 14 * step + armSwing})`}>{limb(0, f.arm, 15, f.body, hold)}</g>
    </g>
  </g>
}

const stone = <path d="M -14 -10 L 12 -14 L 18 4 L 2 16 L -16 8 Z" fill="#9aa1a8" stroke="#5d6369" strokeWidth={3} />

// ---------------------------------------------------------------- scene templates

function Ground() {
  return <g><path d="M 0 720 C 300 690 700 715 1000 700 S 1400 690 1600 710 L 1600 900 L 0 900 Z" fill="#6b4a26" /><path d="M 0 790 C 500 770 1000 800 1600 780 L 1600 900 L 0 900 Z" fill="#553a1e" /></g>
}

function wrap(text: string, max: number) {
  const lines: string[] = []
  for (const word of text.split(' ')) {
    const last = lines[lines.length - 1]
    if (last && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}

/** A label card that wraps inside its column and sits with its bottom edge at y. */
function LabelCard({ x, y, text, maxChars, size, opacity }: { x: number; y: number; text: string; maxChars: number; size: number; opacity: number }) {
  const lines = wrap(text, maxChars)
  const width = Math.max(...lines.map((line) => line.length)) * size * 0.56 + 56
  const height = lines.length * size * 1.25 + 28
  return <g opacity={opacity} transform={`translate(${x} ${y - height})`}>
    <rect x={-width / 2} y={0} width={width} height={height} rx={22} fill={gold} />
    {lines.map((line, index) => <text key={line} y={14 + size + index * size * 1.25} textAnchor="middle" fontSize={size} fontWeight={800} fill={ink}>{line}</text>)}
  </g>
}

function Pill({ x, y, text, opacity = 1, fill = gold, color = ink, size = 36 }: { x: number; y: number; text: string; opacity?: number; fill?: string; color?: string; size?: number }) {
  const width = text.length * size * 0.56 + 60
  return <g opacity={opacity} transform={`translate(${x} ${y})`}><rect x={-width / 2} y={-size} width={width} height={size * 1.8} rx={size * 0.9} fill={fill} /><text y={size * 0.28} textAnchor="middle" fontSize={size} fontWeight={800} fill={color}>{text}</text></g>
}

export function EvolutionScene({ scene, local }: { scene: Extract<VideoScene, { kind: 'tien_hoa' }>; local: number }) {
  const count = scene.forms.length
  const spots = count === 1 ? [800] : count === 2 ? [560, 1040] : [380, 800, 1220]
  const arrive = ease((local - 0.2) / 2.6)
  return <g>
    <Ground />
    {scene.forms.map((form, index) => {
      const current = index === count - 1
      const x = current ? 1750 + (spots[index] - 1750) * arrive : spots[index]
      const walking = current && arrive < 1
      return <g key={form}>
        <Hominin form={form} x={x} y={820} scale={1.45} facing={current && walking ? -1 : 1} walk={walking ? local * 7 : undefined} hold={form === 'vuon_nguoi' ? undefined : stone} opacity={current ? 1 : 0.6} />
        <Pill x={x} y={880} text={formNames[form]} size={30} opacity={current ? enter(local, 2.4) : 0.8} fill={current ? gold : '#3b2a1c'} color={current ? ink : cream} />
        {index > 0 && <text x={(spots[index - 1] + spots[index]) / 2} y={640} textAnchor="middle" fontSize={70} fontWeight={800} fill={cream} opacity={current ? enter(local, 2.2) * 0.85 : 0.6}>→</text>}
      </g>
    })}
    {scene.label && <Pill x={800} y={170} text={scene.label} size={40} opacity={enter(local, 0.4)} />}
  </g>
}

export function TimelineScene({ scene, local }: { scene: Extract<VideoScene, { kind: 'moc_thoi_gian' }>; local: number }) {
  const count = scene.events.length
  const left = 230
  const right = 1370
  const x = (index: number) => left + (index + 0.5) * ((right - left) / count)
  const step = Math.min(1.8, (scene.duration - 1.5) / count)
  const axis = enter(local, 0.1, 1)
  return <g>
    <rect x={0} y={0} width={W} height={H} fill="#1d1408" opacity={0.72} />
    <line x1={150} y1={560} x2={150 + (1450 - 150) * axis} y2={560} stroke={cream} strokeWidth={8} strokeLinecap="round" />
    <path d={`M ${1450 * axis + 150 * (1 - axis) - 6} 536 l 30 24 l -30 24`} fill="none" stroke={cream} strokeWidth={8} opacity={axis} />
    <text x={150} y={520} fontSize={28} fill={cream} opacity={0.8 * axis}>Xa xưa</text>
    <text x={1470} y={520} textAnchor="end" fontSize={28} fill={cream} opacity={0.8 * axis}>Gần ngày nay</text>
    {scene.events.map((event, index) => {
      const shown = enter(local, 0.8 + index * step, 0.6)
      return <g key={event.time + event.label} opacity={shown}>
        {event.form && <Hominin form={event.form} x={x(index)} y={530} scale={0.95} hold={event.form === 'vuon_nguoi' ? undefined : stone} />}
        <circle cx={x(index)} cy={560} r={18 * (0.6 + 0.4 * shown)} fill={gold} stroke={cream} strokeWidth={5} />
        <text x={x(index)} y={650} textAnchor="middle" fontSize={40} fontWeight={800} fill={cream}>{event.label}</text>
        <text x={x(index)} y={700} textAnchor="middle" fontSize={32} fill="#ffd98a">{event.time}</text>
      </g>
    })}
  </g>
}

const findArt: Record<VideoFind, ReactNode> = {
  hoa_thach: <g fill="#efe3c4" stroke="#8a7650" strokeWidth={4}><path d="M -70 -10 C -90 -40 -60 -56 -46 -32 L 46 -32 C 60 -56 90 -40 70 -10 C 90 20 60 36 46 12 L -46 12 C -60 36 -90 20 -70 -10 Z" /><path d="M -20 -32 l 8 22 l -6 12 M 22 -32 l -6 16" fill="none" /></g>,
  rang: <g fill="#f5efe0" stroke="#8a7650" strokeWidth={4}><path d="M -42 -30 C -40 -60 -10 -52 0 -44 C 10 -52 40 -60 42 -30 C 44 0 30 10 26 30 L 18 62 C 14 70 6 66 4 56 L 0 30 L -4 56 C -6 66 -14 70 -18 62 L -26 30 C -30 10 -44 0 -42 -30 Z" /></g>,
  so: <g fill="#efe3c4" stroke="#8a7650" strokeWidth={4}><path d="M -66 10 C -74 -60 70 -70 66 0 C 64 30 46 40 40 60 L -30 60 C -40 40 -62 36 -66 10 Z" /><ellipse cx={-18} cy={4} rx={16} ry={14} fill="#3b2816" /><ellipse cx={26} cy={4} rx={16} ry={14} fill="#3b2816" /><path d="M 2 18 l -6 16 l 12 0 Z" fill="#3b2816" /><path d="M -22 60 v -10 M -6 60 v -10 M 10 60 v -10 M 26 60 v -10" /></g>,
  riu_tay: <g stroke="#4f555b" strokeWidth={4}><path d="M 0 -70 C 40 -40 52 20 30 60 C 14 76 -14 76 -30 60 C -52 20 -40 -40 0 -70 Z" fill="#9aa1a8" /><path d="M 0 -60 L -16 0 L 10 40 M 18 -24 L -6 18" fill="none" opacity={0.7} /></g>,
  cong_cu_da: <g stroke="#4f555b" strokeWidth={4}><path d="M -60 10 L -30 -40 L 30 -46 L 64 -6 L 40 40 L -30 46 Z" fill="#8e959c" /><path d="M -30 -40 L -10 0 L 30 -46 M -10 0 L 40 40 M -10 0 L -30 46" fill="none" opacity={0.6} /></g>,
}

export function DiscoveryScene({ scene, local }: { scene: Extract<VideoScene, { kind: 'phat_hien' }>; local: number }) {
  const count = scene.finds.length
  const xs = count === 1 ? [800] : count === 2 ? [520, 1080] : [380, 800, 1220]
  const depth = [640, 700, 620]
  const step = Math.min(3, (scene.duration - 1.5) / count)
  const reveal = (index: number) => enter(local, 1.4 + index * step, 0.7)
  const target = Math.min(count - 1, Math.max(0, Math.floor((local - 0.6) / step)))
  const glassFrom = target === 0 ? 120 : xs[target - 1]
  const glassX = glassFrom + (xs[target] - glassFrom) * ease((local - 0.6 - target * step) / 0.9)
  return <g>
    <rect x={0} y={360} width={W} height={H - 360} fill="#7a5530" />
    {[[430, '#6b4a2b'], [540, '#5a3d22'], [660, '#4a321c'], [780, '#3b2816']].map(([y, color]) => <path key={String(y)} d={`M 0 ${y} C 300 ${Number(y) - 20} 600 ${Number(y) + 18} 900 ${y} S 1400 ${Number(y) - 16} 1600 ${y} L 1600 900 L 0 900 Z`} fill={String(color)} />)}
    <path d="M 0 360 C 400 340 900 372 1600 352 L 1600 380 L 0 384 Z" fill="#5f7d3a" />
    {[[210, 480], [640, 590], [1380, 520], [990, 760], [300, 820], [1250, 800]].map(([x, y]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={22} ry={12} fill="#2e1f10" opacity={0.45} />)}
    {scene.finds.map((item, index) => {
      const shown = reveal(index)
      return <g key={item.label}>
        <circle cx={xs[index]} cy={depth[index]} r={110 * shown} fill="#ffd98a" opacity={0.22 * shown} />
        <g transform={`translate(${xs[index]} ${depth[index]}) scale(${0.7 + 0.5 * shown})`} opacity={shown}>{findArt[item.find]}</g>
        <line x1={xs[index]} y1={depth[index] - 90} x2={xs[index]} y2={300} stroke={cream} strokeWidth={4} strokeDasharray="10 10" opacity={shown} />
        <LabelCard x={xs[index]} y={300} text={item.label} maxChars={count === 1 ? 40 : count === 2 ? 24 : 16} size={count > 1 ? 30 : 36} opacity={shown} />
      </g>
    })}
    <g transform={`translate(${glassX} ${depth[target] - 10}) rotate(-20)`} opacity={local < 1 + (count - 1) * step + 1.2 ? 0.9 : 0}>
      <circle r={70} fill="#ffffff22" stroke="#e8d7b0" strokeWidth={12} /><rect x={-10} y={70} width={20} height={110} rx={8} fill="#5a3a1c" />
    </g>
    <text x={40} y={H - 30} fontSize={26} fill={cream} opacity={0.75}>Minh hoạ lớp đất, không phải bản đồ</text>
  </g>
}

// ---------------------------------------------------------------- icons and band scenes

export const prehistoryIcons = {
  hai_chan: <g fill="#e8c9a0">{[[-34, 20, -12], [30, -24, 12]].map(([x, y, r]) => <g key={x} transform={`translate(${x} ${y}) rotate(${r})`}><ellipse cy={10} rx={24} ry={42} /><circle cx={-14} cy={-40} r={8} /><circle cx={0} cy={-46} r={8} /><circle cx={14} cy={-40} r={7} /></g>)}</g>,
  ban_tay: <g><path d="M -40 70 L -40 -10 C -40 -30 -20 -30 -20 -10 L -20 -50 C -20 -70 0 -70 0 -50 L 0 -56 C 0 -76 20 -76 20 -56 L 20 -40 C 20 -60 40 -60 40 -40 L 40 30 C 40 60 20 70 0 70 Z" fill="#e8c9a0" stroke="#a87850" strokeWidth={4} /><g transform="translate(-50 -10) scale(1.6)">{stone}</g></g>,
  bo_nao: <g><path d="M -60 60 C -80 0 -60 -70 0 -76 C 60 -80 80 -20 66 20 L 70 40 L 50 44 L 46 70 Z" fill="#e8c9a0" stroke="#a87850" strokeWidth={4} /><path d="M -40 -20 C -50 -60 20 -70 40 -36 C 56 -10 30 10 0 6 C -30 2 -36 -4 -40 -20 Z" fill="#f2a6a6" stroke="#c96b6b" strokeWidth={4} /><path d="M -24 -30 q 10 -10 20 0 q 10 10 20 0" stroke="#c96b6b" strokeWidth={3} fill="none" /></g>,
  tieng_noi: <g><path d="M -70 60 C -86 0 -70 -60 -16 -66 C 30 -70 46 -30 40 0 L 46 18 L 30 22 L 26 60 Z" fill="#e8c9a0" stroke="#a87850" strokeWidth={4} />{[0, 1, 2].map((ring) => <path key={ring} d={`M ${54 + ring * 16} -20 q ${14 + ring * 6} 20 0 ${40 + ring * 8}`} transform={`translate(0 ${-ring * 4})`} stroke={gold} strokeWidth={7} strokeLinecap="round" fill="none" />)}</g>,
}

function Knapping({ t, cx }: { t: number; cx: number }) {
  return <g>{[[-110, 1, 0], [120, -1, 1.7]].map(([dx, facing, phase]) => {
    const hit = Math.abs(wave(t, 4, phase))
    const flake = (t * 4 + phase) % Math.PI < 0.5
    return <g key={dx}>
      <ellipse cx={cx + dx + 70 * facing} cy={848} rx={46} ry={14} fill="#7d838a" />
      <Hominin form="nguoi_toi_co" x={cx + dx} y={850} scale={1.05} facing={facing as 1 | -1} armSwing={-40 - 60 * hit} hold={stone} />
      {flake && [0, 1, 2].map((index) => <path key={index} d="M 0 0 l 10 -6 l -2 10 Z" fill="#c9ced3" transform={`translate(${cx + dx + facing * (70 + index * 16)} ${818 - index * 14})`} />)}
    </g>
  })}</g>
}

function Walkers({ t, cx }: { t: number; cx: number }) {
  return <g>{[0, 1, 2].map((index) => {
    const x = cx - 420 + ((t * 70 + index * 150) % 900)
    return <Hominin key={index} form="nguoi_tinh_khon" x={x} y={850} scale={index === 1 ? 0.8 : 1} walk={t * 6 + index} hold={index === 0 ? stone : undefined} />
  })}</g>
}

export function isPrehistoryCast(item: VideoCast): item is 'ghe_da' | 'di_bo' { return item === 'ghe_da' || item === 'di_bo' }

/** Band people for prehistoric scenes; drawn on the same strip as the Việt cổ figures. */
export function PrehistoryCast({ item, t, cx }: { item: 'ghe_da' | 'di_bo'; t: number; cx: number }) {
  return item === 'ghe_da' ? <Knapping t={t} cx={cx} /> : <Walkers t={t} cx={cx} />
}

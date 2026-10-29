import type { ReactNode } from 'react'
import type { HumanForm, VideoCast, VideoFind, VideoScene } from '../lib/journey'

// Prehistory set for mission videos (Chương 2: human origins, primitive society, the first metals): dusk savanna backdrop,
// the three stages of human evolution as articulated figures, a timeline, an excavation cross-section where finds (bones,
// stone and bronze tools, pottery, ornaments) come to light, icons, and people hunting, gathering, firing pots, casting metal.
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
  // Ground stone: smooth outline and a bright polished edge, unlike the flaked tools above.
  riu_mai: <g><path d="M -34 -66 L 34 -66 L 50 54 C 20 70 -20 70 -50 54 Z" fill="#7f8f86" stroke="#45524b" strokeWidth={4} /><path d="M -46 50 C -18 62 18 62 46 50" stroke="#e8f0ea" strokeWidth={6} fill="none" /><path d="M -14 -50 C -20 -10 -18 20 -24 40" stroke="#c9d6cd" strokeWidth={5} fill="none" opacity={0.7} /></g>,
  manh_gom: <g><path d="M -70 -40 C -20 -64 40 -60 72 -36 L 56 44 C 20 30 -24 34 -60 48 Z" fill="#b8693a" stroke="#7a3f1c" strokeWidth={4} /><path d="M -60 -18 l 16 -14 l 16 14 l 16 -14 l 16 14 l 16 -14 l 16 14 M -56 10 l 16 -12 l 16 12 l 16 -12 l 16 12 l 16 -12 l 16 12" stroke="#f3d3a8" strokeWidth={4} fill="none" /></g>,
  vo_oc: <g><path d="M -86 -30 C -40 10 40 10 86 -30" stroke="#8a6234" strokeWidth={4} fill="none" />{[-64, -32, 0, 32, 64].map((x, index) => <g key={x} transform={`translate(${x} ${4 - Math.abs(x) * 0.25}) rotate(${index * 20 - 40})`}><path d="M 0 -26 C 22 -18 24 14 0 26 C -24 14 -22 -18 0 -26 Z" fill="#f2e6cf" stroke="#a88b5c" strokeWidth={3} /><path d="M 0 -18 V 18 M -8 -10 l 8 6 l 8 -6" stroke="#c9ad7c" strokeWidth={2} fill="none" /><circle cy={-18} r={4} fill="#5a3d22" /></g>)}</g>,
  dan_da: <g>{[[-60, 100], [0, 120], [60, 90]].map(([x, length]) => <g key={x} transform={`translate(${x} 0) rotate(${x / 8})`}><path d={`M -14 ${-length / 2} L 14 ${-length / 2 + 6} L 18 ${length / 2} L -16 ${length / 2 - 4} Z`} fill="#7d838a" stroke="#4f555b" strokeWidth={4} /><path d={`M -6 ${-length / 2 + 12} L -2 ${length / 2 - 14}`} stroke="#b9bfc5" strokeWidth={3} /></g>)}</g>,
  vong_tay: <g><circle r={54} fill="none" stroke="#8e959c" strokeWidth={22} /><circle r={54} fill="none" stroke="#c4c9ce" strokeWidth={5} strokeDasharray="12 16" /></g>,
  mat_nguoi: <g><path d="M -84 -60 C -40 -80 50 -76 86 -54 L 80 64 C 30 76 -40 74 -86 60 Z" fill="#8b8172" stroke="#5c5448" strokeWidth={4} /><g stroke="#3b342a" strokeWidth={5} fill="none" strokeLinecap="round"><ellipse cx={0} cy={0} rx={38} ry={48} /><circle cx={-14} cy={-10} r={6} /><circle cx={14} cy={-10} r={6} /><path d="M 0 -2 v 18 M -14 28 q 14 10 28 0 M -40 -40 l -14 -12 M 40 -40 l 14 -12" /></g></g>,
  xi_dong: <g>{[[-44, 10, 30], [10, -16, 36], [48, 22, 24], [-6, 38, 18]].map(([x, y, r]) => <path key={x} d={`M ${x - r} ${y} C ${x - r} ${y - r} ${x + r * 0.6} ${y - r * 1.1} ${x + r} ${y - r * 0.2} C ${x + r * 1.1} ${y + r * 0.7} ${x - r * 0.3} ${y + r} ${x - r} ${y} Z`} fill="#8a5a2b" stroke="#4f8a6e" strokeWidth={5} />)}</g>,
  mui_ten: <g><path d="M 0 -80 L 34 10 L 10 0 L 8 70 L -8 70 L -10 0 L -34 10 Z" fill="#c8913a" stroke="#7a5418" strokeWidth={4} /><path d="M 0 -64 V 50" stroke="#f2c97a" strokeWidth={3} /></g>,
  luoi_cau: <g fill="none" strokeLinecap="round"><path d="M 20 -76 V 30 C 20 66 -44 66 -44 30 L -44 6 L -30 20" stroke="#c8913a" strokeWidth={12} /><circle cx={20} cy={-80} r={10} stroke="#c8913a" strokeWidth={6} /></g>,
  // Gò Mun axe with the slanted edge the textbook singles out.
  riu_xeo: <g><rect x={-14} y={-80} width={28} height={50} rx={6} fill="#a8742e" stroke="#7a5418" strokeWidth={4} /><path d="M -22 -34 L 22 -34 L 60 60 C 20 40 -30 52 -48 74 Z" fill="#c8913a" stroke="#7a5418" strokeWidth={4} /><path d="M -40 66 C -20 50 20 44 54 56" stroke="#f2c97a" strokeWidth={4} fill="none" /></g>,
  giao: <g><path d="M 0 -84 C 26 -40 30 0 14 30 L 10 76 L -10 76 L -14 30 C -30 0 -26 -40 0 -84 Z" fill="#c8913a" stroke="#7a5418" strokeWidth={4} /><path d="M 0 -70 V 40" stroke="#7a5418" strokeWidth={4} /></g>,
  chuoi_dat: <g><path d="M -90 -40 C -50 40 50 40 90 -40" stroke="#8a6234" strokeWidth={4} fill="none" />{Array.from({ length: 7 }, (_, index) => { const u = (index + 0.5) / 7; const x = -90 + 180 * u; const y = -40 + 80 * 4 * u * (1 - u) * 0.75; return <g key={index}><circle cx={x} cy={y} r={15} fill="#b8693a" stroke="#7a3f1c" strokeWidth={3} /><circle cx={x} cy={y} r={4} fill="#3b2816" /></g> })}</g>,
  hat: <g><path d="M -70 40 C -30 -40 30 -60 76 -70" stroke="#6f8f3a" strokeWidth={6} fill="none" /><path d="M 20 -50 C 40 -90 80 -86 76 -70 C 66 -50 40 -44 20 -50 Z" fill="#7fae55" />{[[-40, 30], [-6, 44], [28, 30], [-24, 62], [12, 70]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx={13} ry={9} fill="#d8b46a" stroke="#8a6a30" strokeWidth={3} />)}</g>,
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
  hang_dong: <g><path d="M -104 72 C -104 -40 -54 -98 0 -98 C 54 -98 104 -40 104 72 Z" fill="#8a6a4a" stroke="#5a4028" strokeWidth={5} /><path d="M -48 72 C -48 0 -24 -38 0 -38 C 24 -38 48 0 48 72 Z" fill="#1d1408" /><path d="M -80 -20 l 20 8 M 60 -50 l 22 10 M 70 20 l 16 -6" stroke="#5a4028" strokeWidth={5} /><path d="M -110 72 H 110" stroke="#5a4028" strokeWidth={7} /></g>,
  san_bat: <g strokeLinecap="round">{[1, -1].map((side) => <g key={side} transform={`scale(${side} 1)`}><path d="M -76 84 L 64 -64" stroke="#7a4b22" strokeWidth={10} /><path d="M 54 -54 L 92 -96 L 76 -42 Z" fill="#9aa1a8" stroke="#5d6369" strokeWidth={3} /></g>)}</g>,
  hai_luom: <g><path d="M -80 70 C -40 20 0 -20 70 -70" stroke="#6b4a26" strokeWidth={9} fill="none" strokeLinecap="round" />{[[-40, 10, -30], [10, -34, 20], [40, -50, -20], [-10, -10, 40]].map(([x, y, r]) => <ellipse key={x} cx={x} cy={y} rx={30} ry={14} fill="#6f9f45" transform={`rotate(${r} ${x} ${y})`} />)}{[[-18, 34], [26, -8], [56, -24], [-50, 44]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={15} fill="#e0603c" stroke="#9a3a1c" strokeWidth={3} />)}</g>,
  leu: <g><path d="M 0 -96 L 100 70 H -100 Z" fill="#c9a24e" stroke="#8a6a2a" strokeWidth={5} />{[-60, -30, 0, 30, 60].map((x) => <path key={x} d={`M ${x * 0.4} -60 L ${x} 64`} stroke="#8a6a2a" strokeWidth={3} />)}<path d="M -24 70 L 0 20 L 24 70 Z" fill="#1d1408" /><path d="M -10 -96 L 0 -116 L 10 -96" stroke="#7a4b22" strokeWidth={6} fill="none" /></g>,
  tranh_vach: <g><path d="M -100 -74 C -40 -90 50 -86 100 -70 L 96 76 C 40 88 -40 86 -100 74 Z" fill="#c9a77a" stroke="#8a6a44" strokeWidth={4} /><g fill="#9a3a1c"><ellipse cx={-6} cy={0} rx={44} ry={22} /><path d="M 30 -10 L 58 -30 L 64 -12 L 40 6 Z" /></g><path d="M 52 -30 l 10 -18 M 58 -28 l 16 -12 M -36 18 l -6 30 M -18 20 l 2 30 M 10 20 l -4 30 M 26 16 l 6 30" stroke="#9a3a1c" strokeWidth={6} strokeLinecap="round" /><g stroke="#5a2a12" strokeWidth={5} strokeLinecap="round" fill="none"><circle cx={-74} cy={-30} r={7} /><path d="M -74 -22 V 6 M -74 6 l -10 26 M -74 6 l 10 26 M -74 -12 l 26 -10 M -50 -24 l 40 6" /></g></g>,
  trang_suc: <g><path d="M -80 -60 C -80 30 80 30 80 -60" stroke="#8a6234" strokeWidth={4} fill="none" />{Array.from({ length: 9 }, (_, index) => { const a = Math.PI * (index + 1) / 10; return <circle key={index} cx={-80 * Math.cos(a)} cy={-60 + 72 * Math.sin(a)} r={10} fill={index % 2 ? '#c8913a' : '#e8d7b0'} stroke="#8a6234" strokeWidth={3} /> })}<path d="M 0 14 C 26 22 28 56 0 76 C -28 56 -26 22 0 14 Z" fill="#f2e6cf" stroke="#a88b5c" strokeWidth={4} /></g>,
  gom: <g><path d="M -44 -70 H 44 C 40 -54 34 -48 34 -42 C 80 -20 84 40 50 70 H -50 C -84 40 -80 -20 -34 -42 C -34 -48 -40 -54 -44 -70 Z" fill="#b8693a" stroke="#7a3f1c" strokeWidth={5} /><path d="M -62 -6 l 15 -14 l 15 14 l 15 -14 l 15 14 l 15 -14 l 15 14 l 15 -14 l 15 14 M -64 26 H 64" stroke="#f3d3a8" strokeWidth={5} fill="none" /></g>,
  det_vai: <g><rect x={-84} y={-80} width={168} height={14} rx={6} fill="#7a4b22" /><rect x={-84} y={66} width={168} height={14} rx={6} fill="#7a4b22" />{[-64, -40, -16, 8, 32, 56].map((x) => <line key={x} x1={x} y1={-66} x2={x} y2={66} stroke="#e8d7b0" strokeWidth={4} />)}{[-50, -26, -2, 22, 46].map((y, row) => <rect key={y} x={-76} y={y} width={152} height={16} fill={row % 2 ? '#b8432f' : '#d9a441'} opacity={0.92} />)}</g>,
  chan_nuoi: <g><ellipse cx={-6} cy={6} rx={70} ry={42} fill="#7a5a44" /><circle cx={64} cy={-14} r={30} fill="#7a5a44" /><ellipse cx={86} cy={-6} rx={14} ry={11} fill="#c49a80" /><path d="M 52 -40 l -6 -20 l 18 10 Z M -76 -8 q -24 -10 -18 14" fill="#5f4535" stroke="#5f4535" strokeWidth={5} /><circle cx={70} cy={-22} r={4} fill="#1d1408" />{[-50, -20, 20, 44].map((x) => <rect key={x} x={x - 8} y={36} width={16} height={34} rx={6} fill="#5f4535" />)}</g>,
  tuong: <g><path d="M -26 76 C -40 30 -44 -6 -26 -26 C -40 -46 -30 -76 0 -78 C 30 -76 40 -46 26 -26 C 44 -6 40 30 26 76 Z" fill="#c4875a" stroke="#86532e" strokeWidth={4} /><path d="M -10 -54 h 4 M 6 -54 h 4 M -8 -40 q 8 6 16 0 M -26 -6 C -8 6 8 6 26 -6" stroke="#86532e" strokeWidth={4} fill="none" strokeLinecap="round" /></g>,
  mo_tang: <g><path d="M -100 66 C -70 -10 70 -10 100 66 Z" fill="#7a5530" stroke="#4a321c" strokeWidth={5} /><path d="M -100 66 H 100" stroke="#4a321c" strokeWidth={6} /><g transform="translate(-34 30) scale(0.9)">{stone}</g>{[10, 20, 30, 40, 50].map((x) => <circle key={x} cx={x} cy={24 + Math.sin((x - 6) / 44 * Math.PI) * 18} r={5} fill="#e8d7b0" />)}<path d="M 0 -70 l 6 16 l 16 2 l -12 10 l 4 16 l -14 -8 l -14 8 l 4 -16 l -12 -10 l 16 -2 Z" fill={gold} /></g>,
  lua_chay: <g><path d="M -40 70 C -80 30 -60 -20 -26 -50 C -24 -20 -10 -10 0 -4 C -6 -40 10 -80 40 -96 C 34 -56 76 -30 70 20 C 66 50 44 70 40 70 Z" fill="#f08a2c" /><path d="M -14 70 C -34 46 -26 14 -6 -4 C -2 18 12 24 20 30 C 22 8 32 -6 44 -14 C 46 18 56 46 30 70 Z" fill="#ffd25a" /><path d="M -70 76 L 70 64 M -60 64 L 66 78" stroke="#6b4a26" strokeWidth={10} strokeLinecap="round" /></g>,
  dong_do: <g>{[[-36, 16, 34], [24, -14, 40], [44, 40, 24]].map(([x, y, r]) => <path key={x} d={`M ${x - r} ${y} C ${x - r} ${y - r} ${x + r * 0.7} ${y - r * 1.1} ${x + r} ${y - r * 0.1} C ${x + r * 1.1} ${y + r * 0.8} ${x - r * 0.4} ${y + r} ${x - r} ${y} Z`} fill="#c0582c" stroke="#7a2f14" strokeWidth={4} />)}<path d="M 6 -40 q 14 -6 24 4 M -54 4 q 10 -8 22 -2" stroke="#f2a070" strokeWidth={5} fill="none" strokeLinecap="round" /></g>,
  dong_thau: <g><path d="M -74 -30 H 74 L 58 40 C 40 66 -40 66 -58 40 Z" fill="#6d5a44" stroke="#3e3226" strokeWidth={5} /><ellipse cy={-30} rx={74} ry={18} fill="#f2b24c" /><ellipse cy={-30} rx={50} ry={10} fill="#ffe08a" /><path d="M 70 -26 C 96 -20 100 10 96 40" stroke="#f2b24c" strokeWidth={10} fill="none" strokeLinecap="round" /><circle cx={96} cy={60} r={8} fill="#f2b24c" /></g>,
  cuoc: <g strokeLinecap="round"><path d="M -70 90 L 40 -60" stroke="#7a4b22" strokeWidth={12} /><path d="M 18 -76 L 80 -30 L 64 -10 L 6 -50 Z" fill="#c8913a" stroke="#7a5418" strokeWidth={4} /></g>,
  cay: <g strokeLinecap="round"><path d="M -96 -70 L 30 30" stroke="#7a4b22" strokeWidth={12} /><path d="M 20 26 L 90 30 L 50 62 Z" fill="#c8913a" stroke="#7a5418" strokeWidth={4} /><path d="M -10 -4 L -40 50 M -96 -70 l -10 -16" stroke="#7a4b22" strokeWidth={10} /></g>,
  gia_dinh: <g>{([[-50, 0, 1.15, '#8a5a34'], [22, 10, 1, '#b8432f'], [70, 36, 0.62, '#d9a441']] as const).map(([x, y, size, color]) => <g key={x} transform={`translate(${x} ${y}) scale(${size})`}><circle cy={-50} r={20} fill="#e8c9a0" /><path d="M -28 66 L -22 -10 C -20 -26 20 -26 22 -10 L 28 66 Z" fill={color} /></g>)}<path d="M -84 -66 l 34 -26 l 34 26" stroke={gold} strokeWidth={8} fill="none" strokeLinecap="round" /></g>,
  cua_cai: <g><path d="M -74 -6 H 74 L 56 70 H -56 Z" fill="#9a6a34" stroke="#5f4020" strokeWidth={5} /><path d="M -66 20 H 66 M -62 44 H 62" stroke="#5f4020" strokeWidth={4} />{Array.from({ length: 14 }, (_, index) => <ellipse key={index} cx={-60 + (index % 7) * 20} cy={-16 - Math.floor(index / 7) * 18} rx={11} ry={8} fill={gold} stroke="#9a6418" strokeWidth={2} />)}<ellipse cx={0} cy={-52} rx={11} ry={8} fill={gold} stroke="#9a6418" strokeWidth={2} /></g>,
  giau_ngheo: <g strokeLinecap="round"><path d="M 0 -80 V 70 M -40 70 H 40 M -84 -30 L 84 -62" stroke="#c9b48a" strokeWidth={8} /><path d="M -84 -30 l -18 46 M -84 -30 l 18 46 M 84 -62 l -18 46 M 84 -62 l 18 46" stroke="#c9b48a" strokeWidth={4} /><path d="M -102 16 h 36 C -66 36 -102 36 -102 16 Z M 66 -16 h 36 C 102 4 66 4 66 -16 Z" fill="#c9b48a" />{[[-96, 6], [-84, 0], [-72, 6], [-84, -10]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={8} fill={gold} />)}</g>,
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

// A spear held across the raised hand, its stone tip pointing the way the figure faces.
const spear = <g><rect x={-120} y={-4} width={230} height={8} rx={4} fill="#7a4b22" /><path d="M -120 -10 L -150 0 L -120 10 Z" fill="#9aa1a8" stroke="#5d6369" strokeWidth={2} /></g>

function Deer({ x, y, t }: { x: number; y: number; t: number }) {
  const gallop = wave(t, 9)
  return <g transform={`translate(${x} ${y - 6 * Math.abs(gallop)})`} fill="#8a5a34">
    {[[-46, 1], [-30, -1], [30, 1], [46, -1]].map(([dx, side]) => <rect key={dx} x={dx - 5} y={-46} width={10} height={50} rx={5} transform={`rotate(${28 * gallop * side} ${dx} -46)`} />)}
    <ellipse cx={0} cy={-60} rx={62} ry={26} />
    <path d="M 44 -70 L 74 -114 L 92 -104 L 64 -60 Z" />
    <ellipse cx={92} cy={-112} rx={22} ry={12} />
    <path d="M 84 -122 l -10 -30 M 80 -140 l -14 -6 M 94 -122 l 6 -30 M 98 -142 l 12 -8 M -60 -66 l -16 -10" stroke="#5a3a1c" strokeWidth={5} strokeLinecap="round" />
  </g>
}

/** A hunt: two hunters with spears raised chase a deer across the strip. */
function Hunting({ t, cx }: { t: number; cx: number }) {
  const sway = 40 * wave(t, 0.7)
  return <g>
    <Deer x={cx + 220 + sway} y={850} t={t} />
    {[[-60, 0], [-220, 1.4]].map(([dx, phase]) => <Hominin key={dx} form="nguoi_toi_co" x={cx + dx + sway} y={850} scale={1.05} walk={t * 9 + phase} armSwing={-150 + 14 * wave(t, 4, phase)} hold={spear} />)}
  </g>
}

/** Gathering: one reaches into a fruit tree, another carries a basket; now and then a fruit drops. */
function Gathering({ t, cx }: { t: number; cx: number }) {
  const fall = (t * 0.9) % 1
  const basket = <g><path d="M -30 0 H 30 L 22 34 H -22 Z" fill="#9a6a34" stroke="#5f4020" strokeWidth={3} /><circle cx={-8} cy={-2} r={8} fill="#e0603c" /><circle cx={8} cy={-4} r={8} fill="#e0603c" /></g>
  return <g>
    <rect x={cx - 14} y={640} width={28} height={210} rx={10} fill="#5a3a1c" />
    {[[-70, 640, 70], [40, 610, 80], [90, 670, 60], [-20, 590, 66]].map(([dx, y, r]) => <circle key={dx} cx={cx + dx} cy={y} r={r} fill="#4f7d34" />)}
    {[[-60, 650], [10, 600], [80, 680], [40, 640], [-30, 690]].map(([dx, y]) => <circle key={dx} cx={cx + dx} cy={y} r={11} fill="#e0603c" />)}
    <circle cx={cx + 60} cy={700 + fall * 140} r={11} fill="#e0603c" opacity={1 - fall * 0.3} />
    <Hominin form="nguoi_toi_co" x={cx - 130} y={850} scale={1.05} armSwing={-150 + 22 * wave(t, 3)} />
    <Hominin form="nguoi_toi_co" x={cx + 170 + 30 * wave(t, 0.9)} y={850} scale={0.95} facing={-1} walk={t * 6} armSwing={-40} hold={basket} />
  </g>
}

/** Pottery: shaping a pot by hand, finished pots drying beside it. */
function Pottery({ t, cx }: { t: number; cx: number }) {
  const pot = (x: number, size: number, color: string) => <g transform={`translate(${x} 850) scale(${size})`}><path d="M -26 -70 H 26 C 24 -60 20 -56 20 -52 C 50 -40 52 -6 30 0 H -30 C -52 -6 -50 -40 -20 -52 C -20 -56 -24 -60 -26 -70 Z" fill={color} stroke="#7a3f1c" strokeWidth={3} /><path d="M -36 -30 l 9 -8 l 9 8 l 9 -8 l 9 8 l 9 -8 l 9 8 l 9 -8 l 9 8" stroke="#f3d3a8" strokeWidth={3} fill="none" /></g>
  const shaping = 0.5 + 0.5 * wave(t, 3)
  return <g>
    <Hominin form="nguoi_tinh_khon" x={cx - 110} y={850} scale={1.05} armSwing={-70 - 30 * shaping} />
    {pot(cx + 10, 1.25, '#9a6a44')}
    {pot(cx + 150, 1, '#b8693a')}
    {pot(cx + 240, 0.8, '#b8693a')}
  </g>
}

/** Metalworking: a fire under a crucible of glowing metal; one fans the flames, one holds up a finished bronze axe. */
function Smelting({ t, cx }: { t: number; cx: number }) {
  const flicker = (phase: number) => 1 + 0.12 * wave(t, 11, phase)
  const axe = <g transform="rotate(180)"><rect x={-5} y={-10} width={10} height={90} rx={4} fill="#7a4b22" /><path d="M -6 70 L 34 62 L 40 96 L -6 88 Z" fill="#c8913a" stroke="#7a5418" strokeWidth={3} /></g>
  return <g>
    <g transform={`translate(${cx} 850)`}>
      <path d="M -70 0 L 70 -10 M -60 -12 L 66 2" stroke="#5a3a1c" strokeWidth={12} strokeLinecap="round" />
      <path d={`M -50 -6 C -70 -40 -40 -70 -20 ${-92 * flicker(0)} C -10 -60 10 -60 20 ${-110 * flicker(1)} C 40 -70 70 -40 50 -6 Z`} fill="#f08a2c" />
      <path d={`M -26 -6 C -36 -30 -14 -46 0 ${-70 * flicker(2)} C 14 -46 36 -30 26 -6 Z`} fill="#ffd25a" />
      <path d="M -54 -96 H 54 L 42 -56 C 30 -44 -30 -44 -42 -56 Z" fill="#6d5a44" stroke="#3e3226" strokeWidth={4} />
      <ellipse cy={-96} rx={54} ry={12} fill="#ffb347" />
      {[0, 1, 2, 3].map((index) => { const rise = (t * 0.8 + index * 0.25) % 1; return <circle key={index} cx={-30 + index * 20 + 10 * wave(t, 3, index)} cy={-110 - rise * 150} r={5 * (1 - rise)} fill="#ffd25a" /> })}
    </g>
    <Hominin form="nguoi_tinh_khon" x={cx - 200} y={850} scale={1.05} armSwing={-90 + 40 * wave(t, 6)} />
    <Hominin form="nguoi_tinh_khon" x={cx + 200} y={850} scale={1.05} facing={-1} armSwing={-170} hold={axe} />
  </g>
}

const prehistoryCast = { ghe_da: Knapping, di_bo: Walkers, san_bat: Hunting, hai_luom: Gathering, lam_gom: Pottery, luyen_kim: Smelting }
type PrehistoryCastName = keyof typeof prehistoryCast

export function isPrehistoryCast(item: VideoCast): item is PrehistoryCastName { return item in prehistoryCast }

/** Band people for prehistoric scenes; drawn on the same strip as the Việt cổ figures. */
export function PrehistoryCast({ item, t, cx }: { item: PrehistoryCastName; t: number; cx: number }) {
  const Scene = prehistoryCast[item]
  return <Scene t={t} cx={cx} />
}

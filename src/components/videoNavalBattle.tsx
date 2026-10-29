import type { BattlePhase, VideoScene } from '../lib/journey'

// River-battle set for mission videos (thuy_chien): a cross-section of an estuary in the manner of a Đông Hồ woodcut,
// with the tide rising and falling, a field of hidden stakes, the invaders' junks, our light boats and an ambush on both
// banks. Ported from the canvas prototype bach_dang_938.html: the whole battle runs on one story clock T (0–76 s), each
// phase plays its own stretch of that clock, stretched to the scene's length, so consecutive phases join without a cut.
// State (tide, boats, stakes) is a pure function of T; ripples, flags and oars follow the video time t.

const W = 1600
const H = 900
const C = {
  sky: '#EFEAE8', paper: '#ECE7E6', card: '#F7F4F3', ink: '#1D1A20', son: '#B3362A', hoe: '#D9A21B', cham: '#24466B', foam: '#B9CCE0',
  la: '#3C6E45', la2: '#86A67F', reed: '#2A4A30', go: '#6B4A2F', goDark: '#3B2A20', boat: '#8A5A32', bed: '#7A5535', pebble: '#5E4029',
  iron: '#8D9299', sail: '#CDBB9C', enemy: '#22314F', plank: '#8A6A4E',
}
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => { const x = clamp(value); return x * x * (3 - 2 * x) }
/** 0 → 1 between the times a and b. */
const seg = (t: number, a: number, b: number) => smooth((t - a) / (b - a))
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
/** Value at time t of a list of [time, value] keyframes, eased between them. */
function keys(t: number, frames: [number, number][]) {
  if (t <= frames[0][0]) return frames[0][1]
  for (let i = 1; i < frames.length; i++) if (t <= frames[i][0]) return lerp(frames[i - 1][1], frames[i][1], smooth((t - frames[i - 1][0]) / (frames[i][0] - frames[i - 1][0])))
  return frames[frames.length - 1][1]
}
const line = (width: number) => ({ stroke: C.ink, strokeWidth: width, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const })
const n = (value: number) => value.toFixed(1)

/** The stretch of the story clock each phase plays, in story order. */
export const battleWindows: Record<BattlePhase, [number, number]> = {
  tien_quan: [0, 10], chon_tran_dia: [10, 20], dong_coc: [20, 32], nhu_dich: [32, 46], trieu_rut: [46, 58], tan_vo: [58, 66], ket_thuc: [66, 76],
}

// ---------------------------------------------------------------- the river and what moves on it

const HIGH = 440
const LOW = 590
const BED = 770
const TIP = 505
// High tide while the fleet arrives; the tide falls and rises to show the 2–3 m range; low water to drive the stakes;
// high again for the lure; it falls once the junks are over the stakes.
const water = (T: number) => keys(T, [[0, HIGH], [11.5, HIGH], [14, LOW], [16.5, HIGH], [18, HIGH], [20, LOW], [32, LOW], [36, HIGH], [46, HIGH], [52, LOW]])
const surfaceY = (x: number, T: number, t: number) => water(T) + 4 * Math.sin(x / 60 + t * 2)
const hillY = (x: number) => 380 - 32 * Math.sin(x / 190) - 18 * Math.sin(x / 70 + 1)
const STAKES = Array.from({ length: 9 }, (_, i) => 700 + i * 52)
/** Where each junk ends up, over the stakes. */
const STOP = [800, 955, 1105]
const across = (step: number) => Array.from({ length: W / step + 1 }, (_, i) => i * step)

const farHill = `M 0 650 ${across(20).map((x) => `L ${x} ${n(hillY(x) - 40 + 20 * Math.sin(x / 120))}`).join(' ')} L ${W} 650 Z`
const nearHill = `M 0 650 ${across(20).map((x) => `L ${x} ${n(hillY(x))}`).join(' ')} L ${W} 650 Z`
const riverBed = `M 0 ${H} ${across(20).map((x) => `L ${x} ${n(BED + 10 * Math.sin(x / 90))}`).join(' ')} L ${W} ${H} Z`
const pebbles = Array.from({ length: 40 }, (_, k) => [(k * 137) % W, BED + 40 + ((k * 53) % 90)])
const reeds = Array.from({ length: 42 }, (_, i) => 20 + i * 38)

function enemyPose(i: number, T: number, t: number) {
  // They sail in and wait at the river mouth, pull out of sight while the trap is laid, then chase the light boats in.
  const x = T < 11 ? keys(T, [[0, 1900 + i * 190], [9, 1180 + i * 190]]) : keys(T, [[35, 1780 + i * 190], [40, 1400 + i * 175], [46, STOP[i]]])
  let alpha = T <= 10 ? 1 : T < 11 ? 11 - T : T < 35 ? 0 : Math.min(1, (T - 35) / 0.8)
  const sign = i % 2 ? -1 : 1
  let bottom = water(T) + 28 + 3 * Math.sin(t * 2 + i)
  let tilt = 0
  // As the tide falls the hulls settle on the stake tips and lean, then capsize and sink.
  if (T >= 46) { const limit = TIP + 6; if (bottom > limit) { tilt = Math.min(12, (bottom - limit) * 0.15) * sign; bottom = limit } }
  if (T >= 58) { const u = seg(T, 58 + i * 0.6, 63 + i * 0.6); tilt = lerp(tilt, 80 * sign, u); bottom += u * 110; alpha *= 1 - 0.65 * u }
  return { x, bottom, tilt, alpha }
}

function ourPose(j: number, T: number, t: number) {
  if (T < 33.5) return null
  let x: number
  let dir = 1
  if (T < 39) x = keys(T, [[33.5, -160 - j * 150], [39, 1120 - j * 150]])
  else if (T < 40) { x = 1120 - j * 150; dir = T < 39.5 ? 1 : -1 }
  else if (T < 51.5) { x = keys(T, [[40, 1120 - j * 150], [46, 330 - j * 150]]); dir = -1 }
  else x = keys(T, [[51.5, 330 - j * 150], [56, 640 - j * 130]])
  return { x, dir, bottom: water(T) + 14 + 2 * Math.sin(t * 3 + j) }
}

// ---------------------------------------------------------------- drawings

function Cloud({ x, y, size }: { x: number; y: number; size: number }) {
  return <g transform={`translate(${n(x)} ${y}) scale(${size})`} {...line(2.5)}>
    <path d="M -26 0 A 26 26 0 0 1 26 0 L 12 -8 A 32 32 0 0 1 76 -8 L 68 0 A 24 24 0 0 1 116 0 Z" fill={C.card} />
    <path d="M 30.7 -3.7 A 14 14 0 1 1 48.3 5.3" fill="none" />
  </g>
}

function Banks({ T, t, calm }: { T: number; t: number; calm: number }) {
  const up = seg(T, 51.5, 53.2)
  return <g>
    <path d={farHill} fill={C.la2} />
    <path d={nearHill} fill={C.la} {...line(3)} />
    <path d={reeds.map((x) => { const y = hillY(x) + 30; return `M ${x} ${n(y + 20)} Q ${x + 4} ${n(y)} ${n(x + 10 + 3 * Math.sin(t + x))} ${n(y - 14)}` }).join(' ')} fill="none" stroke={C.reed} strokeWidth={2} strokeLinecap="round" />
    {up > 0 && calm > 0 && Array.from({ length: 7 }, (_, k) => {
      // The ambush rises from behind both banks: banners on poles, heads below them.
      const x = 520 + k * 145
      const base = hillY(x) + 10
      const top = base - 90 * up
      const flap = 6 * Math.sin(t * 6 + k)
      return <g key={k} opacity={calm} {...line(3)}>
        <path d={`M ${x} ${n(base + 30)} L ${x} ${n(top)}`} fill="none" />
        <path d={`M ${x} ${n(top)} L ${x + 46} ${n(top + 12 + flap)} L ${x} ${n(top + 26)} Z`} fill={C.son} />
        <circle cx={x + 14} cy={n(top + 13 + flap / 3)} r={4} fill={C.hoe} stroke="none" />
        {[-22, 22].map((dx) => <circle key={dx} cx={x + dx} cy={n(top + 46 + 40 * (1 - up))} r={7} fill={C.ink} stroke="none" />)}
      </g>
    })}
  </g>
}

/** An iron-tipped stake; dy lifts it above its place while it is being driven in. */
function Stake({ x, dy }: { x: number; dy: number }) {
  const top = TIP + 28 + dy
  return <g {...line(2.5)}>
    <rect x={x - 8} y={n(top)} width={16} height={BED + 20 - TIP - 28} fill={C.go} />
    <path d={`M ${x - 8} ${n(top)} L ${x + 8} ${n(top)} L ${x} ${n(TIP + dy)} Z`} fill={C.iron} />
  </g>
}

function Junk({ pose, t }: { pose: ReturnType<typeof enemyPose>; t: number }) {
  return <g transform={`translate(${n(pose.x)} ${n(pose.bottom)}) rotate(${n(pose.tilt)})`} opacity={pose.alpha} {...line(3)}>
    {[-45, 35].map((mx) => <g key={mx}>
      <path d={`M ${mx} -40 L ${mx} -205`} fill="none" />
      <path d={`M ${mx - 38} -190 L ${mx + 32} -195 L ${mx + 38} -70 L ${mx - 34} -66 Z`} fill={C.sail} />
      <path d={[1, 2, 3, 4].map((k) => `M ${mx - 37} ${-190 + k * 25} L ${mx + 34} ${-191 + k * 25}`).join(' ')} fill="none" strokeWidth={1.5} />
      <path d={`M ${mx} -205 L ${mx - 34} ${n(-196 + 4 * Math.sin(t * 5 + mx))} L ${mx} -186 Z`} fill={C.enemy} />
    </g>)}
    <path d="M -130 -58 L -105 -40 L 105 -40 L 132 -62 L 96 0 L -86 0 Z" fill={C.goDark} />
    <rect x={-70} y={-64} width={60} height={24} fill={C.enemy} />
    <path d="M -100 -20 L 100 -20" stroke={C.plank} strokeWidth={2} />
  </g>
}

function LightBoat({ pose, j, t }: { pose: NonNullable<ReturnType<typeof ourPose>>; j: number; t: number }) {
  return <g transform={`translate(${n(pose.x)} ${n(pose.bottom)}) scale(${pose.dir} 1)`} {...line(2.5)}>
    <path d="M -70 -26 L 70 -26 L 84 -40 L 56 0 L -56 0 Z" fill={C.boat} />
    {[0, 1, 2, 3].map((k) => {
      const x = -42 + k * 26
      const stroke = 0.6 * Math.sin(t * 9 + k)
      return <g key={k}>
        <circle cx={x} cy={-38} r={7} fill={C.ink} stroke="none" />
        <path d={`M ${x} -30 L ${n(x - 26 * Math.cos(stroke))} ${n(6 + 10 * Math.sin(stroke))}`} fill="none" />
      </g>
    })}
    <path d="M 60 -26 L 60 -90" fill="none" />
    <path d={`M 60 -90 L 96 ${n(-80 + 4 * Math.sin(t * 6 + j))} L 60 -70 Z`} fill={C.son} />
  </g>
}

/** See-through water, so the stakes stay visible under it, with Đông Hồ style wave crests. */
function Water({ T, t }: { T: number; t: number }) {
  const surface = across(10).map((x) => `${x ? 'L' : 'M'} ${x} ${n(surfaceY(x, T, t))}`).join(' ')
  const crests: string[] = []
  for (let row = 0; row < 3; row++) for (let x = (row % 2) * 30 - 40 + ((t * 25) % 60); x < W + 40; x += 60) {
    const y = surfaceY(x, T, t) + 22 + row * 34
    if (y <= BED - 10) crests.push(`M ${n(x - 13.8)} ${n(y - 2.2)} A 14 14 0 0 1 ${n(x + 13.8)} ${n(y - 2.2)}`)
  }
  return <g>
    <path d={`M 0 ${BED + 40} ${surface.replace(/^M/, 'L')} L ${W} ${BED + 40} Z`} fill={C.cham} opacity={0.8} />
    <path d={crests.join(' ')} fill="none" stroke={C.foam} strokeWidth={3} />
    <path d={surface} fill="none" {...line(3)} />
  </g>
}

function Arrows({ T }: { T: number }) {
  const shafts: string[] = []
  for (let k = 0; k < 14; k++) {
    const u = (T - (52.8 + k * 0.45)) / 1.1
    if (u < 0 || u > 1) continue
    const x0 = 520 + (k % 7) * 145
    const y0 = hillY(x0) - 40
    const x1 = STOP[k % 3] + ((k * 37) % 80) - 40
    const y1 = TIP - 40
    const at = (v: number) => [lerp(x0, x1, v), lerp(y0, y1, v) - Math.sin(Math.PI * v) * 120]
    const [px, py] = at(u)
    const [qx, qy] = at(u - 0.04)
    const angle = Math.atan2(py - qy, px - qx)
    shafts.push(`M ${n(px)} ${n(py)} L ${n(px - 34 * Math.cos(angle))} ${n(py - 34 * Math.sin(angle))}`)
  }
  return shafts.length ? <path d={shafts.join(' ')} fill="none" {...line(3)} /> : null
}

/** A boxed label; width is estimated from the text, as the other templates do. */
function Tag({ text, x, y, size = 26, opacity = 1 }: { text: string; x: number; y: number; size?: number; opacity?: number }) {
  const width = text.length * size * 0.56 + 28
  const left = Math.min(Math.max(x - width / 2, 16), W - 16 - width)
  return <g opacity={opacity}>
    <rect x={n(left)} y={n(y - 24)} width={n(width)} height={48} fill={C.card} {...line(2)} />
    <text x={n(left + width / 2)} y={n(y + size * 0.36)} textAnchor="middle" fontSize={size} fontWeight={600} fill={C.ink}>{text}</text>
  </g>
}

function Gauge({ T, range, shown }: { T: number; range?: string; shown: number }) {
  const x = 36
  const y = 100
  const w = 170
  const h = 250
  const top = y + 70
  const bottom = y + h - 30
  const level = lerp(top, bottom, (water(T) - HIGH) / (LOW - HIGH))
  return <g>
    <rect x={x} y={y} width={w} height={h} fill={C.card} {...line(2.5)} />
    <text x={x + w / 2} y={y + 34} textAnchor="middle" fontSize={24} fontWeight={600} fill={C.ink}>Mực nước</text>
    <rect x={x + 22} y={n(level)} width={30} height={n(bottom - level)} fill={C.cham} />
    <rect x={x + 22} y={top} width={30} height={bottom - top} fill="none" {...line(2)} />
    {([[top, 'Triều cao'], [bottom, 'Triều thấp']] as const).map(([at, text]) => <g key={text}>
      <path d={`M ${x + 52} ${at} L ${x + 64} ${at}`} {...line(2)} />
      <text x={x + 70} y={at + 7} fontSize={20} fontWeight={500} fill={C.ink}>{text}</text>
    </g>)}
    {range && <g opacity={shown}>
      <path d={`M ${x + 14} ${top} L ${x + 8} ${top} L ${x + 8} ${bottom} L ${x + 14} ${bottom}`} fill="none" stroke={C.son} strokeWidth={3} />
      <text x={x + 112} y={(top + bottom) / 2 + 9} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.son}>{range}</text>
    </g>}
  </g>
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

/** A paper card over the river: the opening title (big title, red line below) or the closing words (red title, text below). */
function Card({ title, label, closing, opacity }: { title: string; label?: string; closing: boolean; opacity: number }) {
  const titleLines = wrap(title, closing ? 30 : 18)
  const labelLines = label ? wrap(label, closing ? 38 : 24) : []
  const [titleSize, labelSize] = closing ? [60, 38] : [96, 72]
  const height = titleLines.length * (titleSize + 16) + labelLines.length * (labelSize + 18) + (labelLines.length ? 30 : 0)
  let y = H / 2 - height / 2 + titleSize * 0.8
  return <g opacity={opacity}>
    <rect width={W} height={H} fill={C.paper} opacity={0.92} />
    <rect x={260} y={190} width={1080} height={520} fill={C.card} {...line(4)} />
    <rect x={276} y={206} width={1048} height={488} fill="none" stroke={C.son} strokeWidth={2} />
    {titleLines.map((text, row) => <text key={`t${row}`} x={W / 2} y={n(y + row * (titleSize + 16))} textAnchor="middle" fontSize={titleSize} fontWeight={800} fill={closing ? C.son : C.ink}>{text}</text>)}
    {labelLines.map((text, row) => <text key={`l${row}`} x={W / 2} y={n(y + titleLines.length * (titleSize + 16) + 30 + row * (labelSize + 18))} textAnchor="middle" fontSize={labelSize} fontWeight={closing ? 500 : 800} fill={closing ? C.ink : C.son}>{text}</text>)}
  </g>
}

// ---------------------------------------------------------------- the scene

/** One phase of the battle at scene time `local`; t is the video time, for motion that should not jump between scenes. */
export function NavalBattleScene({ scene, local, t }: { scene: Extract<VideoScene, { kind: 'thuy_chien' }>; local: number; t: number }) {
  const [from, to] = battleWindows[scene.phase]
  // The phase's action ends a little before the scene does, so its last state holds while the sentence finishes.
  const T = lerp(from, to, clamp(local / Math.max(1, scene.duration - 0.6)))
  const callouts = scene.callouts || {}
  const wy = water(T)
  const enemies = [0, 1, 2].map((i) => enemyPose(i, T, t))
  const ours = [0, 1, 2].map((j) => ourPose(j, T, t))
  const lead = enemies[0]
  const scout = ours[0]
  const closing = scene.phase === 'ket_thuc'
  // After the battle our boats, the ambush and the labels fade away behind the closing card.
  const calm = 1 - seg(T, 66, 67.5)
  const card =closing ? seg(local, 0.3, 1.8) : local < 2.5 ? 1 : 1 - seg(local, 2.5, 3.6)
  return <g>
    <rect width={W} height={H} fill={C.sky} />
    <Cloud x={380 + t * 3} y={120} size={1.3} />
    <Cloud x={1050 + t * 2} y={80} size={1} />
    <Cloud x={1380 - t * 1.5} y={190} size={0.8} />
    <Banks T={T} t={t} calm={calm} />
    {STAKES.map((x, i) => { const start = 21.5 + i * 0.9; return T < start ? null : <Stake key={x} x={x} dy={(1 - seg(T, start, start + 0.6)) * -260} /> })}
    {enemies.map((pose, i) => pose.alpha > 0.01 && <Junk key={i} pose={pose} t={t} />)}
    {calm > 0 && <g opacity={calm}>{ours.map((pose, j) => pose && <LightBoat key={j} pose={pose} j={j} t={t} />)}</g>}
    <Water T={T} t={t} />
    <path d={riverBed} fill={C.bed} {...line(3)} />
    {pebbles.map(([x, y], k) => <ellipse key={k} cx={x} cy={y} rx={9} ry={5} fill={C.pebble} />)}
    <Arrows T={T} />
    {calm > 0 && <g fontSize={26} fontWeight={600} fill={C.card} opacity={calm}>
      <text x={30} y={n(Math.min(wy + 70, BED - 30) + 9)}>← Thượng nguồn</text>
      <text x={W - 30} y={n(Math.min(wy + 70, BED - 30) + 9)} textAnchor="end">Ra biển →</text>
    </g>}
    {callouts.coc && T >= 24 && calm > 0 && <Tag text={callouts.coc} x={(STAKES[0] + STAKES[STAKES.length - 1]) / 2} y={BED + 70} opacity={seg(T, 24, 25) * calm} />}
    {callouts.dich && lead.alpha > 0.5 && lead.x < W - 100 && T < 58 && <Tag text={callouts.dich} x={lead.x + 120} y={lead.bottom - 250} size={24} />}
    {callouts.ta && scout && T >= 34.5 && <Tag text={callouts.ta} x={Math.max(scout.x, 380)} y={scout.bottom - 130} size={24} />}
    {callouts.phuc_binh && T >= 52.5 && calm > 0 && <Tag text={callouts.phuc_binh} x={960} y={250} size={24} opacity={seg(T, 52.5, 53.3) * calm} />}
    <Gauge T={T} range={callouts.muc_nuoc} shown={seg(T, 10.5, 11.5)} />
    <text x={W - 30} y={H - 30} textAnchor="end" fontSize={22} fill={C.card} opacity={0.85}>Tranh minh hoạ mặt cắt cửa sông, không theo tỉ lệ</text>
    {scene.title && card > 0 && <Card title={scene.title} label={scene.label} closing={closing} opacity={card} />}
  </g>
}

import type { ReactNode } from 'react'
import type { VideoLandmark } from '../lib/journey'

// The "co_dai" look for lessons on the ancient world (Ai Cập, Lưỡng Hà, Ấn Độ, Trung Quốc, Hy Lạp, La Mã): a dusk sky
// over dunes instead of the Đông Sơn drum, and a landmark drawn stroke by stroke in title scenes. Like the rest of
// the video, every frame is a pure function of time.

const W = 1600
const H = 900
const cream = '#fbf3df'
const gold = '#f2b24c'
const sand = '#e9c77b'
const sandShade = '#c79a52'
const stone = '#d9b98a'
const stoneShade = '#a9844f'
const marble = '#efe6d2'
const marbleShade = '#c9bea6'
const brick = '#c0703f'
const brickShade = '#8f4f2a'
const dark = '#3b2a1c'
const red = '#b8432f'
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3)
const enter = (local: number, at: number, length = 0.8) => ease((local - at) / length)

export function AncientBackdrop({ t }: { t: number }) {
  const sunY = 250 - Math.min(t, 60) * 1.2
  return <g>
    <defs>
      <linearGradient id="jv-ancient-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#16213f" /><stop offset="0.55" stopColor="#5b3b4a" /><stop offset="1" stopColor="#c9834e" /></linearGradient>
      <radialGradient id="jv-ancient-glow"><stop offset="0" stopColor="#ffd98a" stopOpacity="0.75" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#jv-ancient-sky)" />
    {[[180, 90], [420, 160], [640, 70], [960, 130], [1480, 100], [300, 240], [1120, 60]].map(([x, y], index) => <circle key={x} cx={x} cy={y} r={3} fill={cream} opacity={0.25 + 0.25 * Math.sin(t * 1.3 + index * 1.7)} />)}
    <circle cx={1260} cy={sunY} r={260} fill="url(#jv-ancient-glow)" />
    <circle cx={1260} cy={sunY} r={95} fill={gold} opacity={0.9} />
    <path d={`M 0 ${H - 120} C 260 ${H - 190} 520 ${H - 110} 800 ${H - 150} S 1340 ${H - 200} ${W} ${H - 130} L ${W} ${H} L 0 ${H} Z`} fill="#8a5634" transform={`translate(${Math.sin(t * 0.25) * 18} 0)`} />
    <path d={`M 0 ${H - 60} C 300 ${H - 110} 640 ${H - 40} 960 ${H - 80} S 1420 ${H - 110} ${W} ${H - 60} L ${W} ${H} L 0 ${H} Z`} fill="#6e4127" />
  </g>
}

/** A part of a landmark: drawn along its outline first, then filled. */
interface Part { d: string; fill?: string; stroke?: string; w?: number }
const P = (d: string, fill?: string, stroke = dark, w = 5): Part => ({ d, fill, stroke, w })
const rect = (x: number, y: number, width: number, height: number) => `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`
const arch = (x: number, y: number, half: number, height: number) => `M ${x - half} ${y} V ${y - height + half} A ${half} ${half} 0 0 1 ${x + half} ${y - height + half} V ${y} Z`

function pyramid(cx: number, base: number, half: number, height: number): Part[] {
  const top = base - height
  const courses = [0.25, 0.5, 0.75].map((share) => {
    const y = top + height * share
    const w = half * share
    return P(`M ${cx - w} ${y} H ${cx + w}`, undefined, sandShade, 3)
  })
  return [P(`M ${cx - half} ${base} L ${cx} ${top} L ${cx + half} ${base} Z`, sand), P(`M ${cx} ${top} L ${cx + half} ${base} L ${cx + half * 0.2} ${base} Z`, sandShade, sandShade, 2), ...courses]
}

const landmarks: Record<VideoLandmark, Part[]> = {
  kim_tu_thap: [P('M -440 130 H 440', undefined, dark, 4), ...pyramid(-250, 130, 120, 150), ...pyramid(250, 130, 110, 135), ...pyramid(0, 130, 230, 300)],
  thap_tang: [P(rect(-250, 50, 500, 80), brick, brickShade), P(rect(-180, -30, 360, 80), brick, brickShade), P(rect(-115, -105, 230, 75), brick, brickShade), P(rect(-50, -160, 100, 55), '#d98a52', brickShade),
    P('M -22 130 L -22 -105 M 22 130 L 22 -105', undefined, brickShade, 6), ...[-10, 20, 50, 80, 110].map((y) => P(`M -22 ${y} H 22`, undefined, brickShade, 3))],
  bao_thap: [P(rect(-240, 100, 480, 30), stone, stoneShade), P('M -205 100 A 205 175 0 0 1 205 100 Z', '#e7d6b0', stoneShade), P(rect(-45, -105, 90, 34), stone, stoneShade), P('M 0 -105 V -185', undefined, stoneShade, 6),
    P('M -55 -150 H 55', undefined, stoneShade, 8), P('M -38 -172 H 38', undefined, stoneShade, 7), P('M -340 130 V -10 M -290 130 V -10 M -356 -10 H -274 M -356 -38 H -274', undefined, stoneShade, 9), P('M 290 130 V -10 M 340 130 V -10 M 274 -10 H 356 M 274 -38 H 356', undefined, stoneShade, 9)],
  den_hy_lap: [P(rect(-290, 105, 580, 25), marble, marbleShade), P(rect(-268, 85, 536, 20), marble, marbleShade), ...[-231, -165, -99, -33, 33, 99, 165, 231].map((x) => P(rect(x - 17, -60, 34, 145), marble, marbleShade)),
    P(rect(-282, -98, 564, 38), marble, marbleShade), P('M -292 -98 L 0 -182 L 292 -98 Z', marble, marbleShade), P('M -200 -110 L 0 -165 L 200 -110', undefined, marbleShade, 3)],
  dau_truong: [P('M -310 130 V -70 C -310 -160 310 -160 310 -70 V 130 Z', '#d8b98a', stoneShade), P('M -310 -10 H 310 M -310 60 H 310', undefined, stoneShade, 4),
    ...[-250, -170, -90, -10, 70, 150, 230].flatMap((x) => [P(arch(x + 20, 125, 22, 58), '#5a3d24', stoneShade, 3), P(arch(x + 20, 52, 20, 52), '#5a3d24', stoneShade, 3), P(arch(x + 20, -18, 18, 46), '#5a3d24', stoneShade, 3)])],
  thanh_quach: [P(rect(-330, -10, 660, 140), stone, stoneShade), ...[-310, -250, -190, -130, 110, 170, 230, 290].map((x) => P(rect(x, -40, 34, 30), stone, stoneShade)), P(rect(-90, -120, 180, 250), '#cfa978', stoneShade),
    P(arch(0, 130, 44, 110), '#4a3020', stoneShade), ...[-80, -30, 20, 66].map((x) => P(rect(x, -150, 24, 30), '#cfa978', stoneShade)), P('M 0 -150 V -215', undefined, dark, 5), P('M 0 -215 L 70 -198 L 0 -180 Z', red, red, 3)],
  nui: [P('M -420 130 L -220 -100 L -20 130 Z', '#7d6a5a', '#4e4136'), P('M -150 130 L 70 -190 L 300 130 Z', '#8d7867', '#4e4136'), P('M 160 130 L 320 -60 L 440 130 Z', '#6f5e50', '#4e4136'),
    P('M 70 -190 L 25 -125 L 50 -135 L 70 -112 L 92 -138 L 118 -128 Z', cream, '#c9d3dc', 3), P('M -220 -100 L -255 -58 L -232 -66 L -216 -50 L -198 -70 L -184 -62 Z', cream, '#c9d3dc', 3), P('M 320 -60 L 295 -28 L 312 -34 L 326 -20 L 340 -36 Z', cream, '#c9d3dc', 3)],
  rung: [P('M -420 130 C -300 70 -120 100 0 80 S 300 60 420 130 Z', '#6b5a3c', '#4a3d28'), ...[-330, -250, -160, -60, 40, 140, 230, 320].map((x, index) => P(`M ${x - 46} ${100 - (index % 2) * 20} L ${x} ${-60 - (index % 3) * 30} L ${x + 46} ${100 - (index % 2) * 20} Z`, index % 2 ? '#3f6b3a' : '#4f7d44', '#2c4a28', 3)),
    P('M -120 130 L -80 60 L -20 70 L 10 130 Z', '#8c8478', '#5e574d', 3), P('M 150 130 L 190 80 L 250 90 L 270 130 Z', '#8c8478', '#5e574d', 3)],
  ngai_vang: [P('M -120 130 V -60 C -120 -150 120 -150 120 -60 V 130', '#9a5b2a', '#5e3517', 6), P(rect(-165, 30, 330, 42), '#b9733a', '#5e3517'), P('M -150 72 V 130 M 150 72 V 130', undefined, '#5e3517', 10),
    P('M -80 -150 L -80 -196 L -40 -168 L 0 -214 L 40 -168 L 80 -196 L 80 -150 Z', gold, '#9a6418'), P('M -80 -150 H 80', undefined, '#9a6418', 6), P('M 0 -60 m -26 0 a 26 26 0 1 0 52 0 a 26 26 0 1 0 -52 0', gold, '#9a6418', 4)],
  chu_co: [P(rect(-400, -130, 330, 250), '#ecd9a4', '#b89a5c'), P('M -410 -140 V 130 M -60 -140 V 130', undefined, '#a07a3c', 14),
    P('M -360 -60 Q -320 -95 -280 -60 Q -320 -25 -360 -60 Z', undefined, dark, 5), P('M -330 -60 m -9 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0', dark, dark, 2), P('M -230 -40 C -230 -90 -170 -90 -165 -70 L -140 -78 L -160 -60 C -170 -40 -200 -30 -230 -40 Z', undefined, dark, 5),
    P('M -370 30 l 22 -16 l 22 16 l 22 -16 l 22 16 l 22 -16', undefined, '#2f6f9f', 6), P('M -190 30 m -24 0 a 24 24 0 1 0 48 0 a 24 24 0 1 0 -48 0', undefined, red, 6), P('M -132 70 V -10 M -132 -10 C -116 0 -116 20 -132 30', undefined, dark, 5),
    P('M 40 -140 Q 30 -140 30 -130 V 110 Q 30 125 45 125 H 380 Q 395 125 395 110 V -130 Q 395 -140 380 -140 Z', '#b98b5e', '#7a5636'),
    ...[-100, -40, 20, 80].flatMap((y, row) => [70, 130, 190, 250, 310].slice(0, 5 - (row % 2)).map((x) => P(`M ${x + (row % 2) * 30} ${y} l 30 8 l -30 8 Z M ${x + (row % 2) * 30 + 6} ${y + 8} h 26`, '#5c3d22', '#5c3d22', 2)))],
  cuon_giay: [P(rect(-300, -120, 600, 230), '#ecd9a4', '#b89a5c'), P('M -315 -132 V 122 M 315 -132 V 122', undefined, '#a07a3c', 16),
    ...[-70, -20, 30, 80].map((y, row) => P(`M -250 ${y} c 30 -16 50 16 80 0 s 50 -16 80 0 s 50 16 80 0 s 50 -16 80 0 s 50 16 ${row === 3 ? 60 : 160} 0`, undefined, '#5c3d22', 5)),
    P('M 230 -150 L 300 -230 L 312 -220 L 244 -140 Z', cream, '#8a7a5a', 3)],
  sach: [P('M 0 -110 C -80 -140 -200 -140 -300 -110 V 120 C -200 90 -80 90 0 120 Z', marble, marbleShade), P('M 0 -110 C 80 -140 200 -140 300 -110 V 120 C 200 90 80 90 0 120 Z', marble, marbleShade), P('M 0 -110 V 120', undefined, marbleShade, 5),
    ...[-60, -20, 20, 60].flatMap((y) => [P(`M -260 ${y} C -190 ${y - 14} -100 ${y - 14} -40 ${y}`, undefined, '#8a7a5a', 4), P(`M 40 ${y} C 100 ${y - 14} 190 ${y - 14} 260 ${y}`, undefined, '#8a7a5a', 4)])],
  mai_rua: [P('M 0 -170 C 160 -170 200 -40 178 60 C 156 150 -156 150 -178 60 C -200 -40 -160 -170 0 -170 Z', '#e8d2a3', '#a8865a', 6), P('M 0 -170 V 135 M -170 -10 H 170 M -150 -100 L 150 80 M 150 -100 L -150 80', undefined, '#a8865a', 3),
    ...[[-110, -110], [-60, -120], [60, -120], [110, -110], [-130, 30], [-80, 50], [80, 50], [130, 30]].map(([x, y]) => P(`M ${x - 14} ${y} h 28 M ${x} ${y - 16} v 34 M ${x - 12} ${y + 14} l 24 -10`, undefined, '#5c3d22', 4))],
  chu_cai: [P('M -300 120 L -220 -130 L -140 120 M -272 40 H -168', undefined, gold, 22), P('M -60 120 V -130 H 10 C 90 -130 90 -6 10 -6 H -60 M 10 -6 C 100 -6 100 120 10 120 H -60', undefined, gold, 22),
    P('M 310 -80 C 250 -160 120 -130 120 -5 C 120 120 250 150 310 70', undefined, gold, 22)],
  chu_so: [],
  lich: [P('M 0 0 m -200 0 a 200 200 0 1 0 400 0 a 200 200 0 1 0 -400 0', '#1d3a63', gold, 6),
    ...Array.from({ length: 12 }, (_, index) => {
      const a = (index * Math.PI) / 6 - Math.PI / 2
      const b = a + Math.PI / 6
      const [x1, y1, x2, y2] = [180 * Math.cos(a), 180 * Math.sin(a), 180 * Math.cos(b), 180 * Math.sin(b)]
      const [x3, y3, x4, y4] = [95 * Math.cos(b), 95 * Math.sin(b), 95 * Math.cos(a), 95 * Math.sin(a)]
      return P(`M ${x1.toFixed(1)} ${y1.toFixed(1)} A 180 180 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A 95 95 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`, index % 2 ? '#2f6f9f' : '#3f86b8', '#1d3a63', 3)
    })],
  la_ban: [P('M 0 0 m -190 0 a 190 190 0 1 0 380 0 a 190 190 0 1 0 -380 0', '#7a4b22', '#4a2c12', 8), P('M 0 0 m -160 0 a 160 160 0 1 0 320 0 a 160 160 0 1 0 -320 0', '#efe2bf', '#a07a3c', 4),
    ...Array.from({ length: 16 }, (_, index) => { const a = (index * Math.PI) / 8; const r1 = index % 4 ? 140 : 122; return P(`M ${(r1 * Math.sin(a)).toFixed(1)} ${(-r1 * Math.cos(a)).toFixed(1)} L ${(155 * Math.sin(a)).toFixed(1)} ${(-155 * Math.cos(a)).toFixed(1)}`, undefined, '#5c3d22', index % 4 ? 3 : 6) })],
  vo_so: [P('M -70 130 C -150 100 -150 -20 -80 -60 L -60 -120 H 60 L 80 -60 C 150 -20 150 100 70 130 Z', brick, brickShade, 6), P('M -60 -120 C -110 -120 -120 -60 -90 -40 M 60 -120 C 110 -120 120 -60 90 -40', undefined, brickShade, 8),
    P('M -110 10 H 110 M -100 60 H 100', undefined, '#2a1a10', 5)],
  binh_khi: [P('M -230 130 L 120 -190 M 230 130 L -120 -190', undefined, '#7a4b22', 12), P('M 120 -190 L 150 -232 L 104 -214 Z M -120 -190 L -150 -232 L -104 -214 Z', '#b7c0cc', '#56606d', 4),
    P('M 0 -110 C 80 -90 100 -60 100 -60 C 100 40 60 100 0 130 C -60 100 -100 40 -100 -60 C -100 -60 -80 -90 0 -110 Z', '#b9733a', '#5e3517', 6), P('M 0 -60 L 14 -16 L 60 -16 L 24 10 L 38 54 L 0 28 L -38 54 L -24 10 L -60 -16 L -14 -16 Z', gold, '#9a6418', 3)],
}

// Moving details drawn over some landmarks.
function extras(name: VideoLandmark, local: number): ReactNode {
  if (name === 'chu_so') {
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
    return <g>{digits.map((digit, index) => {
      const shown = enter(local, 0.3 + index * 0.35, 0.5)
      const zero = digit === '0'
      const x = -405 + index * 90
      return <g key={digit} opacity={shown} transform={`translate(${x} ${-10 + (1 - shown) * 30})`}>
        {zero && <circle r={62} fill={gold} opacity={0.9} transform={`scale(${1 + 0.06 * Math.sin(local * 3)})`} />}
        <text y={34} textAnchor="middle" fontSize={zero ? 110 : 92} fontWeight={800} fill={zero ? dark : cream}>{digit}</text>
      </g>
    })}</g>
  }
  if (name === 'la_ban') {
    const swing = 55 * Math.exp(-local * 0.45) * Math.sin(local * 3.2)
    return <g opacity={enter(local, 1.2, 0.6)}>
      <text y={-92} textAnchor="middle" fontSize={40} fontWeight={800} fill={red}>N</text>
      <g transform={`rotate(${swing})`}><path d="M 0 -118 L 18 0 L -18 0 Z" fill={red} /><path d="M 0 118 L 18 0 L -18 0 Z" fill="#56606d" /><circle r={12} fill={gold} /></g>
    </g>
  }
  if (name === 'lich') {
    return <g opacity={enter(local, 1.8, 0.6)} transform={`rotate(${local * 8})`}>
      <circle r={82} fill="#1d3a63" />
      <path d="M 0 -60 A 60 60 0 0 1 0 60 Z" fill={gold} />
      <path d="M 0 -60 A 60 60 0 0 0 0 60 A 34 60 0 0 1 0 -60 Z" fill={cream} />
    </g>
  }
  if (name === 'vo_so') {
    return <g>{[0, 1, 2, 3, 4].map((index) => {
      const fall = enter(local, 1.2 + index * 0.6, 0.7)
      const x = -150 + index * 75
      const y = -330 + fall * 230
      return <g key={index} opacity={fall > 0 ? 1 - clamp((fall - 0.85) / 0.15) : 0} transform={`translate(${x * (1 - fall) + (index - 2) * 6 * fall} ${y}) rotate(${index * 40 + local * 30})`}>
        <ellipse rx={30} ry={22} fill={marble} stroke={marbleShade} strokeWidth={3} />
        <path d="M -16 -4 h 32 M -12 6 h 22" stroke={dark} strokeWidth={3} />
      </g>
    })}</g>
  }
  if (name === 'thanh_quach') {
    const flap = Math.sin(local * 4) * 8
    return <path d={`M 0 -215 Q 35 ${-208 + flap} 70 -198 Q 35 ${-188 + flap} 0 -180 Z`} fill={red} opacity={enter(local, 2, 0.4)} />
  }
  if (name === 'cuon_giay') {
    const along = clamp((local - 0.8) / 3)
    return <g opacity={along > 0 && along < 1 ? 1 : 0} transform={`translate(${-250 + along * 500} ${-80 + Math.sin(local * 9) * 8})`}><path d="M 0 0 L 60 -80 L 70 -72 L 8 6 Z" fill={cream} stroke="#8a7a5a" strokeWidth={3} /></g>
  }
  return null
}

/** A landmark centred on (0, 0): its parts are drawn one after another, then it breathes slightly. */
export function Landmark({ name, local }: { name: VideoLandmark; local: number }) {
  const parts = landmarks[name]
  const stagger = parts.length ? Math.min(0.22, 2 / parts.length) : 0
  return <g transform={`translate(0 ${Math.sin(local * 0.9) * 4})`}>
    {parts.map((part, index) => {
      const at = 0.2 + index * stagger
      const draw = enter(local, at, 0.7)
      const fill = enter(local, at + 0.45, 0.5)
      return <path key={index} d={part.d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} fill={part.fill || 'none'} fillOpacity={fill} stroke={part.stroke} strokeWidth={part.w} strokeLinecap="round" strokeLinejoin="round" opacity={draw > 0 ? 1 : 0} />
    })}
    {extras(name, local)}
  </g>
}

/** A felucca with a white sail, sailing up the river of a river scene. */
export function Sailboat({ t }: { t: number }) {
  const x = 700 + t * 40
  const y = 505 + (x - 690) * 0.3
  return <g opacity={ease((t - 0.6) / 0.8)} transform={`translate(${x} ${y}) rotate(${8 + Math.sin(t * 2) * 2})`}>
    <path d="M -130 -10 C -110 20 -60 26 0 26 C 60 26 110 20 130 -14 Z" fill="#7a4b22" stroke="#4a2c12" strokeWidth={4} />
    <path d="M -10 -10 V -170" stroke="#4a2c12" strokeWidth={6} />
    <path d="M -6 -168 C 70 -130 100 -60 92 -18 L -6 -18 Z" fill={cream} stroke="#b8a882" strokeWidth={3} />
    <path d="M -14 -150 C -60 -110 -80 -60 -76 -22 L -14 -22 Z" fill="#efe2bf" stroke="#b8a882" strokeWidth={3} />
  </g>
}

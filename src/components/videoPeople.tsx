import type { ReactNode } from 'react'
import type { VideoCast } from '../lib/journey'
import { isPrehistoryCast, PrehistoryCast } from './videoPrehistory'

// Illustrated Việt cổ figures for the mission videos, drawn after the textbook's description (Bài 14): men in a loincloth
// with hair in a bun, women in skirt and halter top, feather headdresses at festivals, as on Đông Sơn drums.
// Every pose is a pure function of the scene time, like the rest of the video. Figures stand with their feet at (0, 0).

const skin = '#d9a06d'
const skinShade = '#b9804f'
const hair = '#2a1a10'
const bronze = '#e2a845'
const bronzeDark = '#9a6418'
const wood = '#7a4b22'
const iron = '#a9b4c2'
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3)
const wave = (t: number, speed: number, phase = 0) => Math.sin(t * speed + phase)

interface Pose { armBack?: number; armFront?: number; legBack?: number; legFront?: number; lean?: number; bob?: number }
interface PersonProps { x: number; y: number; scale?: number; facing?: 1 | -1; woman?: boolean; feather?: boolean; pose: Pose; back?: ReactNode; front?: ReactNode; shoulder?: ReactNode }

/** Angles are degrees from hanging straight down; negative swings the limb forward (the way the figure faces). */
function limb(angle: number, length: number, width: number, color: string, hold?: ReactNode) {
  return <g transform={`rotate(${angle})`}><rect x={-width / 2} y={-width / 2} width={width} height={length} rx={width / 2} fill={color} />{hold && <g transform={`translate(0 ${length - 8})`}>{hold}</g>}</g>
}

export function Person({ x, y, scale = 1, facing = 1, woman = false, feather = false, pose, back, front, shoulder }: PersonProps) {
  const { armBack = 10, armFront = -10, legBack = 6, legFront = -6, lean = 0, bob = 0 } = pose
  return <g transform={`translate(${x} ${y + bob}) scale(${scale * facing} ${scale})`}>
    <g transform="translate(-8 -92)">{limb(legBack, 96, 17, skinShade)}</g>
    <g transform="translate(8 -92)">{limb(legFront, 96, 17, skin)}</g>
    <g transform={`rotate(${lean} 0 -92)`}>
      <g transform="translate(-6 -160)">{limb(armBack, 80, 15, skinShade, back)}</g>
      <path d="M -22 -170 Q 0 -178 22 -170 L 18 -88 L -18 -88 Z" fill={skin} />
      {woman
        ? <><path d="M -21 -106 H 21 L 31 -18 H -31 Z" fill="#34508c" /><path d="M -26 -60 H 26 M -29 -36 H 29" stroke="#c9d6f0" strokeWidth={4} /><path d="M -15 -168 H 15 L 13 -128 L 0 -116 L -13 -128 Z" fill="#b8432f" /></>
        : <path d="M -20 -104 H 20 L 17 -86 L 6 -62 L -2 -86 L -17 -86 Z" fill="#7a3b1c" />}
      {shoulder}
      <rect x={-6} y={-190} width={12} height={22} fill={skin} />
      <circle cx={3} cy={-206} r={25} fill={skin} />
      <circle cx={13} cy={-209} r={3} fill={hair} />
      {woman
        ? <path d="M -24 -212 C -22 -240 22 -244 28 -214 C 14 -226 -2 -226 -12 -214 L -20 -170 L -30 -172 Z" fill={hair} />
        : <><path d="M -22 -210 C -20 -236 24 -240 28 -214 C 14 -226 -4 -226 -22 -210 Z" fill={hair} /><circle cx={-16} cy={-232} r={11} fill={hair} /></>}
      {feather && <g fill={bronze} stroke={bronzeDark} strokeWidth={3}><path d="M -4 -228 C -20 -300 -70 -318 -86 -300 C -54 -292 -30 -262 -14 -226 Z" /><path d="M 2 -230 C 0 -310 -34 -340 -54 -332 C -30 -316 -14 -276 -6 -230 Z" /></g>}
      <g transform="translate(6 -160)">{limb(armFront, 80, 15, skin, front)}</g>
    </g>
  </g>
}

// Things held in a hand: the hand is at (0, 0) and the arm points along +y.
const hoe = (metal: string) => <g transform="rotate(-90)"><rect x={-5} y={-30} width={10} height={150} rx={5} fill={wood} /><path d="M -6 112 L 34 108 L 40 134 L -6 128 Z" fill={metal} stroke={bronzeDark} strokeWidth={2} /></g>
const spear = <g transform="rotate(180)"><rect x={-4} y={-70} width={8} height={250} fill={wood} /><path d="M -10 178 L 0 212 L 10 178 Z" fill={iron} /></g>
const shield = <g><path d="M 0 -60 C 34 -48 44 -48 46 -46 C 48 10 30 44 0 64 C -30 44 -48 10 -46 -46 C -44 -48 -34 -48 0 -60 Z" fill={bronze} stroke={bronzeDark} strokeWidth={5} /><circle r={14} fill="#fbf3df" /></g>
const oar = <g transform="rotate(160)"><rect x={-4} y={-40} width={8} height={170} fill={wood} /><ellipse cy={140} rx={13} ry={30} fill={wood} /></g>
const drumstick = <rect x={-4} y={-6} width={8} height={70} rx={4} fill={wood} transform="rotate(-70)" />
const seedlings = <g stroke="#5f8f3a" strokeWidth={5} strokeLinecap="round"><path d="M 0 0 l -8 -26 M 0 0 l 6 -28 M 0 0 l 14 -20" /></g>
const pole = <g><rect x={-110} y={-176} width={220} height={8} rx={4} fill={wood} />{[-104, 104].map((x) => <g key={x}><path d={`M ${x} -170 L ${x - 18} -110 M ${x} -170 L ${x + 18} -110`} stroke={wood} strokeWidth={3} /><path d={`M ${x - 26} -112 H ${x + 26} L ${x + 18} -78 H ${x - 18} Z`} fill="#c58b45" stroke={bronzeDark} strokeWidth={3} /></g>)}</g>

/** Hoeing: the tool goes up over the head, then down to the ground in front. */
const hoeing = (t: number, phase: number) => { const up = 0.5 + 0.5 * wave(t, 3.4, phase); return { armFront: -40 - 130 * up, armBack: -30 - 100 * up, lean: 18 - 14 * up } }
const walking = (t: number, speed = 9) => ({ legBack: 24 * wave(t, speed), legFront: -24 * wave(t, speed), armBack: -18 * wave(t, speed), armFront: 18 * wave(t, speed), bob: -3 * Math.abs(wave(t, speed)) })

function Gathering({ t, cx }: { t: number; cx: number }) {
  const people = [-300, -150, 0, 150, 300]
  return <g>{people.map((target, index) => {
    const fromLeft = index < 2 || (index === 2)
    const start = cx + (fromLeft ? -820 : 820) + target * 0.3
    const arrive = ease((t - 0.1 - index * 0.12) / 1.9)
    const x = start + (cx + target - start) * arrive
    const moving = arrive < 1
    const pose = moving ? walking(t + index) : { armFront: -150 + 16 * wave(t, 4, index), armBack: 8, bob: 0 }
    return <Person key={target} x={x} y={850} scale={0.9} facing={x < cx ? 1 : -1} woman={index % 2 === 1} pose={pose} />
  })}</g>
}

function Farming({ t, cx }: { t: number; cx: number }) {
  return <g>
    {[0, 1, 2, 3].map((row) => <path key={row} d={`M ${cx - 330} ${790 + row * 22} Q ${cx} ${780 + row * 22} ${cx + 330} ${790 + row * 22}`} stroke="#5d7a3a" strokeWidth={6} fill="none" opacity={0.7} />)}
    <Person x={cx - 150} y={850} pose={hoeing(t, 0)} front={hoe(bronze)} />
    <Person x={cx + 170} y={850} facing={-1} pose={hoeing(t, Math.PI)} front={hoe(iron)} />
  </g>
}

function Canal({ t, cx }: { t: number; cx: number }) {
  const water = ease(t / 4)
  const carry = cx + 150 + 90 * wave(t, 0.9)
  return <g>
    <path d={`M ${cx - 300} 880 L ${cx - 300} 856 Q ${cx} 846 ${cx + 300} 856 L ${cx + 300} 880 Z`} fill="#3e2f1c" />
    <rect x={cx - 300} y={858} width={600 * water} height={18} rx={9} fill="#4aa3d8" />
    <Person x={cx - 230} y={850} pose={hoeing(t, 0.6)} front={hoe(bronze)} />
    <Person x={carry} y={850} facing={Math.cos(t * 0.9) >= 0 ? 1 : -1} woman pose={{ ...walking(t, 7), armFront: -150, armBack: -150 }} shoulder={pole} />
  </g>
}

function Guards({ t, cx }: { t: number; cx: number }) {
  return <g>{[-150, 0, 150].map((dx, index) => <Person key={dx} x={cx + dx} y={850} feather pose={{ armFront: -10, armBack: -55, bob: 3 * wave(t, 3, index) }} front={spear} back={shield} />)}</g>
}

function Festival({ t, cx }: { t: number; cx: number }) {
  const hit = Math.abs(wave(t, 4.5))
  return <g>
    <g transform={`translate(${cx} 850)`}><path d="M -70 -70 L -58 0 L 58 0 L 70 -70 Z" fill={bronzeDark} /><ellipse cy={-70} rx={74} ry={22} fill={bronze} /><ellipse cy={-70} rx={52} ry={15} fill="none" stroke="#fbf3df" strokeWidth={3} strokeDasharray="6 6" /></g>
    <Person x={cx - 120} y={850} feather pose={{ armFront: -60 - 70 * hit, armBack: -40 - 40 * hit }} front={drumstick} />
    {[-420, -280, 280, 420].map((dx, index) => <Person key={dx} x={cx + dx} y={850} feather woman={index % 2 === 0} facing={dx < 0 ? 1 : -1} pose={{ armFront: -150 + 40 * wave(t, 4, index), armBack: -120 - 40 * wave(t, 4, index), legFront: -10 * wave(t, 4, index), bob: -6 * Math.abs(wave(t, 4, index)) }} />)}
  </g>
}

/** People acting on a strip of ground below the scene's words: one or two little scenes side by side. */
export function CastBand({ cast, t, prehistoric = false }: { cast: VideoCast[]; t: number; prehistoric?: boolean }) {
  const appear = ease(t / 0.6)
  const centers = cast.length > 1 ? [430, 1170] : [800]
  // Green fields for the Việt cổ, dry savanna earth for prehistoric scenes.
  const [near, far] = prehistoric ? ['#6b4a26', '#553a1e'] : ['#244a33', '#1d3d2a']
  return <g opacity={appear}>
    <path d="M 0 700 C 300 650 600 690 800 670 S 1300 640 1600 690 L 1600 900 L 0 900 Z" fill={near} />
    <path d="M 0 760 C 400 730 900 760 1600 740 L 1600 900 L 0 900 Z" fill={far} />
    {cast.map((item, index) => {
      const cx = centers[index]
      const local = t + index * 0.4
      if (isPrehistoryCast(item)) return <PrehistoryCast key={item} item={item} t={local} cx={cx} />
      if (item === 'tu_hop') return <Gathering key={item} t={local} cx={cx} />
      if (item === 'lam_ruong') return <Farming key={item} t={local} cx={cx} />
      if (item === 'dao_muong') return <Canal key={item} t={local} cx={cx} />
      if (item === 'cam_vu_khi') return <Guards key={item} t={local} cx={cx} />
      return <Festival key={item} t={local} cx={cx} />
    })}
  </g>
}

/** People inside the river landscape: a Đông Sơn style boat with rowers, and women planting rice. */
export function RiverCast({ cast, t }: { cast: VideoCast[]; t: number }) {
  const boatX = 700 + t * 42
  const boatY = 505 + (boatX - 690) * 0.3
  const stroke = wave(t, 3)
  return <g opacity={ease((t - 0.6) / 0.8)}>
    {cast.includes('cheo_thuyen') && <g transform={`translate(${boatX} ${boatY}) rotate(8)`}>
      {[-70, 0, 70].map((dx) => <Person key={dx} x={dx} y={-6} scale={0.42} feather pose={{ armFront: -70 - 40 * stroke, armBack: -50 - 40 * stroke, lean: 10 + 8 * stroke }} front={oar} />)}
      <path d="M -170 -40 C -150 -6 -120 10 -60 12 L 80 12 C 130 10 150 -6 170 -44 C 150 -26 120 -14 80 -14 L -60 -14 C -110 -14 -150 -24 -170 -40 Z" fill={bronzeDark} stroke="#5b3a0e" strokeWidth={4} />
      <path d="M -120 -2 H 120" stroke={bronze} strokeWidth={4} strokeDasharray="10 8" />
    </g>}
    {cast.includes('cay_lua') && [[470, 640, 0], [560, 690, 1.3]].map(([x, y, phase]) => {
      const reach = 0.5 + 0.5 * wave(t, 2.6, phase)
      return <g key={x}>
        {[0, 1, 2, 3].map((row) => <g key={row} transform={`translate(${x - 70 - row * 26} ${y + 4})`} opacity={clamp((t - 1 - row * 0.8) / 0.4)}>{seedlings}</g>)}
        <Person x={x} y={y} scale={0.48} woman pose={{ lean: 36, armFront: -20 + 25 * reach, armBack: -10 + 20 * reach }} front={seedlings} />
      </g>
    })}
  </g>
}

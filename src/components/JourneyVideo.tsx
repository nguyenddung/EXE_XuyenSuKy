import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { clockLabel, pagesLabel, sceneAt, videoLength, type MissionVideo, type VideoIcon, type VideoScene } from '../lib/journey'
import { CastBand, RiverCast } from './videoPeople'
import { DiscoveryScene, EvolutionScene, PrehistoryBackdrop, prehistoryIcons, SunEmblem, TimelineScene } from './videoPrehistory'

// Code-drawn animation for a mission. Every frame is a pure function of the time t, so the same scenes can later be
// rendered to MP4 (e.g. Remotion: t = frame / fps) without changing them. Words on screen and the narration come from
// the journey file, where course_builder has checked them against the textbook.

const W = 1600
const H = 900
const ink = '#0f2747'
const cream = '#fbf3df'
const bronze = '#e2a845'
const bronzeDark = '#9a6418'
const clamp = (value: number) => Math.min(1, Math.max(0, value))
/** A dark halo behind light words, so they stay readable where they cross the sun or a bright sky. */
const halo = { stroke: '#120c18', strokeOpacity: 0.55, strokeLinejoin: 'round' as const, paintOrder: 'stroke' }
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3)
const pop = (value: number) => { const x = clamp(value); return 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2) }
/** 0 → 1 over `length` seconds, starting at `at`. */
const enter = (local: number, at: number, length = 0.8) => ease((local - at) / length)

function starPoints(rays: number, outer: number, inner: number) {
  return Array.from({ length: rays * 2 }, (_, index) => {
    const radius = index % 2 ? inner : outer
    const angle = (Math.PI * index) / rays - Math.PI / 2
    return `${(radius * Math.cos(angle)).toFixed(1)},${(radius * Math.sin(angle)).toFixed(1)}`
  }).join(' ')
}

/** The Đông Sơn drum face: a many-rayed star in rings, the series' recurring motif. */
function DrumFace({ radius, color = bronze, detail = cream }: { radius: number; color?: string; detail?: string }) {
  return <g>
    <circle r={radius} fill={color} />
    <circle r={radius * 0.92} fill="none" stroke={detail} strokeWidth={radius * 0.025} strokeDasharray={`${radius * 0.04} ${radius * 0.05}`} />
    <circle r={radius * 0.72} fill="none" stroke={detail} strokeWidth={radius * 0.018} />
    <circle r={radius * 0.6} fill="none" stroke={detail} strokeWidth={radius * 0.012} strokeDasharray={`${radius * 0.1} ${radius * 0.06}`} />
    <polygon points={starPoints(14, radius * 0.48, radius * 0.16)} fill={detail} />
    <circle r={radius * 0.1} fill={color} />
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

const icons: Record<VideoIcon, ReactNode> = {
  ...prehistoryIcons,
  riu_dong: <g><rect x={-9} y={-95} width={18} height={190} rx={8} fill="#7a4b22" transform="rotate(-18)" /><path d="M -2 -62 C 52 -82 96 -40 92 18 C 66 2 34 -2 4 4 Z" fill={bronze} stroke={bronzeDark} strokeWidth={5} /><path d="M 30 -46 C 52 -40 70 -20 74 4" fill="none" stroke={bronzeDark} strokeWidth={4} /></g>,
  luoi_sat: <g><rect x={-80} y={46} width={92} height={20} rx={10} fill="#7a4b22" transform="rotate(-38)" /><path d="M -6 34 C -16 -48 52 -96 96 -48 C 54 -60 18 -36 18 30 Z" fill="#a9b4c2" stroke="#56606d" strokeWidth={5} /></g>,
  lua: <g fill="none" strokeLinecap="round"><path d="M -40 92 C -30 20 -10 -30 40 -70" stroke="#5f8f3a" strokeWidth={8} /><path d="M -34 60 C -70 20 -80 -10 -78 -40" stroke="#5f8f3a" strokeWidth={6} /><path d="M -20 30 C 20 10 50 20 70 40" stroke="#5f8f3a" strokeWidth={6} />{[0, 1, 2, 3, 4, 5].map((index) => <ellipse key={index} cx={-6 + index * 9} cy={-34 - index * 7} rx={9} ry={15} fill={bronze} stroke={bronzeDark} strokeWidth={3} transform={`rotate(${50 + index * 4} ${-6 + index * 9} ${-34 - index * 7})`} />)}</g>,
  nguoi: <g>{[[-62, 10, 0.9], [0, -4, 1.05], [62, 10, 0.9]].map(([x, y, size]) => <g key={x} transform={`translate(${x} ${y}) scale(${size})`}><circle cy={-50} r={22} fill={bronze} /><path d="M -32 70 L -24 -6 C -24 -22 24 -22 24 -6 L 32 70 Z" fill={bronze} /><path d="M -30 -40 C -20 -60 20 -60 30 -40" fill="none" stroke={bronzeDark} strokeWidth={6} /></g>)}</g>,
  thuy_loi: <g><rect x={-95} y={-70} width={80} height={140} rx={10} fill="#7fae55" /><rect x={15} y={-70} width={80} height={140} rx={10} fill="#7fae55" />{[-50, -20, 10, 40].map((y) => <g key={y}><path d={`M -86 ${y} h 60`} stroke="#4f7d34" strokeWidth={4} strokeDasharray="6 8" /><path d={`M 24 ${y} h 60`} stroke="#4f7d34" strokeWidth={4} strokeDasharray="6 8" /></g>)}<rect x={-15} y={-90} width={30} height={180} rx={8} fill="#4aa3d8" /><path d="M -10 -60 q 10 -10 20 0 M -10 -10 q 10 -10 20 0 M -10 40 q 10 -10 20 0" stroke={cream} strokeWidth={4} fill="none" /></g>,
  khien: <g><path d="M -70 -90 L 70 90" stroke="#7a4b22" strokeWidth={10} strokeLinecap="round" /><path d="M -84 -104 L -60 -66 L -96 -78 Z" fill="#a9b4c2" /><path d="M 0 -78 C 40 -60 66 -62 72 -62 C 76 10 50 60 0 88 C -50 60 -76 10 -72 -62 C -66 -62 -40 -60 0 -78 Z" fill={bronze} stroke={bronzeDark} strokeWidth={6} /><polygon points={starPoints(8, 30, 12)} fill={cream} /></g>,
  trong_dong: <g><path d="M -88 -20 L -70 70 L 70 70 L 88 -20 Z" fill={bronzeDark} /><ellipse cy={-20} rx={92} ry={34} fill={bronze} /><polygon points={starPoints(10, 22, 8)} fill={cream} transform="translate(0 -20) scale(1 0.37)" /><ellipse cy={-20} rx={70} ry={25} fill="none" stroke={cream} strokeWidth={3} strokeDasharray="6 6" /></g>,
  nha_san: <g><path d="M -96 -20 C -60 -90 60 -90 96 -20 L 70 -10 L -70 -10 Z" fill={bronze} stroke={bronzeDark} strokeWidth={5} /><rect x={-64} y={-10} width={128} height={46} fill="#c58b45" /><rect x={-16} y={2} width={32} height={34} fill={ink} />{[-56, -20, 20, 56].map((x) => <rect key={x} x={x - 4} y={36} width={8} height={56} fill="#7a4b22" />)}</g>,
}

function Backdrop({ t }: { t: number }) {
  return <g>
    <rect width={W} height={H} fill="url(#jv-sky)" />
    <g transform={`translate(1360 150) rotate(${t * 3})`} opacity={0.14}><DrumFace radius={210} /></g>
    <g transform={`translate(150 820) rotate(${-t * 2})`} opacity={0.08}><DrumFace radius={160} /></g>
  </g>
}

// With people (cast) the words move up and the lower third becomes a strip of ground where the figures act.
function TitleScene({ scene, local, band, prehistoric }: { scene: Extract<VideoScene, { kind: 'tieu_de' }>; local: number; band: boolean; prehistoric: boolean }) {
  const drum = enter(local, 0.1, 1.4)
  const title = enter(local, 0.6)
  const label = enter(local, 1.2)
  const width = (scene.label?.length || 0) * 21 + 90
  const [drumY, drumR, titleY, labelY] = band ? [205, 115, 420, 500] : [320, 170, 610, 690]
  return <g>
    <g transform={`translate(800 ${drumY}) scale(${0.55 + 0.45 * drum}) rotate(${local * 5})`} opacity={drum}>{prehistoric ? <SunEmblem radius={drumR * 0.8} t={local} /> : <DrumFace radius={drumR} />}</g>
    <text x={800} y={titleY + (1 - title) * 30} textAnchor="middle" fontSize={band ? 80 : 88} fontWeight={800} fill={cream} opacity={title} strokeWidth={10} {...halo}>{scene.title}</text>
    {scene.label && <g opacity={label} transform={`translate(800 ${labelY + (1 - label) * 20})`}><rect x={-width / 2} y={-38} width={width} height={68} rx={34} fill={bronze} /><text y={10} textAnchor="middle" fontSize={38} fontWeight={700} fill={ink}>{scene.label}</text></g>}
  </g>
}

function IconScene({ scene, local, band }: { scene: Extract<VideoScene, { kind: 'bieu_tuong' }>; local: number; band: boolean }) {
  const count = scene.items.length
  const spacing = count > 3 ? 360 : 440
  const step = Math.min(1.6, (scene.duration - 1.5) / count)
  const x = (index: number) => 800 + (index - (count - 1) / 2) * spacing
  const [cy, size, reach, labelY, font] = band ? [240, 0.78, 110, 400, 38] : [380, 1, 140, 588, 42]
  return <g>
    {scene.items.slice(1).map((_, index) => {
      const line = enter(local, 0.3 + (index + 1) * step - 0.5, 0.5)
      return <line key={index} x1={x(index) + reach} y1={cy} x2={x(index) + reach + (spacing - 2 * reach) * line} y2={cy} stroke={bronze} strokeWidth={6} strokeDasharray="14 12" />
    })}
    {scene.items.map((item, index) => {
      const shown = clamp((local - 0.3 - index * step) / 0.6)
      const scale = shown ? pop(shown) : 0
      return <g key={item.label} opacity={clamp(shown * 2)}>
        <g transform={`translate(${x(index)} ${cy}) scale(${scale * size})`}><circle r={132} fill="#173c69" stroke={bronze} strokeWidth={7} />{icons[item.icon]}</g>
        {wrap(item.label, 16).map((line, row) => <text key={line} x={x(index)} y={labelY + row * (font + 8)} textAnchor="middle" fontSize={font} fontWeight={700} fill={cream} strokeWidth={8} {...halo}>{line}</text>)}
      </g>
    })}
  </g>
}

const rivers = [
  'M 330 300 C 470 360 520 470 690 500 S 960 560 1120 640 S 1290 700 1380 720',
  'M 470 250 C 600 300 700 330 820 400 S 1050 470 1200 520 S 1320 560 1390 560',
  'M 300 470 C 420 560 520 640 700 700 S 960 780 1100 810 S 1300 840 1380 850',
]
const labelSpots = [[880, 360], [760, 800], [1080, 470], [1150, 770]]
const fields = [[640, 540], [760, 470], [900, 600], [1010, 520], [560, 690], [860, 740], [1080, 700]]

function RiverScene({ scene, local }: { scene: Extract<VideoScene, { kind: 'song_nuoc' }>; local: number }) {
  const land = enter(local, 0, 0.8)
  const step = Math.max(1, (scene.duration - 3) / scene.labels.length)
  return <g opacity={land}>
    <rect x={0} y={200} width={W} height={H - 200} fill="#cfe0a8" />
    <path d={`M 1300 200 C 1260 400 1350 600 1290 ${H} L ${W} ${H} L ${W} 200 Z`} fill="#4aa3d8" />
    {[300, 420, 540, 660, 780].map((y, index) => <path key={y} d={`M ${1360 + (index % 2) * 40} ${y} q 25 -18 50 0 t 50 0`} stroke={cream} strokeWidth={5} fill="none" opacity={0.7} transform={`translate(${Math.sin(local * 1.4 + index) * 12} 0)`} />)}
    <polygon points="0,200 120,90 230,210 330,80 470,220 560,140 680,240 0,330" fill="#6e8f4e" />
    <polygon points="0,260 160,150 300,280 420,170 540,300 0,380" fill="#58783c" />
    {rivers.map((path, index) => <path key={path} d={path} pathLength={1} fill="none" stroke="#3b8fc8" strokeWidth={index === 1 ? 16 : 13} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - enter(local, 0.3 + index * 0.4, 1.8)} />)}
    {fields.map(([fx, fy], index) => <rect key={index} x={fx - 34} y={fy - 20} width={68} height={40} rx={6} fill="#86b45a" stroke="#5e8a3a" strokeWidth={3} opacity={enter(local, 1.6 + index * 0.15, 0.5)} />)}
    {scene.labels.map((label, index) => {
      const shown = enter(local, 2.2 + index * step, 0.6)
      const [lx, ly] = labelSpots[index]
      const width = label.length * 24 + 70
      return <g key={label} opacity={shown} transform={`translate(${lx} ${ly - (1 - shown) * 24})`}><rect x={-width / 2} y={-40} width={width} height={72} rx={36} fill={ink} stroke={bronze} strokeWidth={5} /><text y={10} textAnchor="middle" fontSize={40} fontWeight={800} fill={cream}>{label}</text></g>
    })}
    {scene.cast && <RiverCast cast={scene.cast} t={local} />}
    <text x={40} y={H - 34} fontSize={26} fill={ink} opacity={0.75}>Tranh minh hoạ, không phải bản đồ</text>
  </g>
}

/** One frame of the video at time t. `still` (reduced motion, or a paused player) shows the scene in its finished state. */
export function VideoFrame({ video, t, still = false }: { video: MissionVideo; t: number; still?: boolean }) {
  const { index, scene, local } = sceneAt(video, t)
  const shown = still ? scene.duration : local
  const last = index === video.scenes.length - 1
  const fade = still ? 1 : Math.min(clamp(local / 0.45), last ? 1 : clamp((scene.duration - local) / 0.45))
  const prehistoric = video.style === 'tien_su'
  return <>
    <defs><linearGradient id="jv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f2747" /><stop offset="1" stopColor="#1c4a7d" /></linearGradient></defs>
    {prehistoric ? <PrehistoryBackdrop t={t} /> : <Backdrop t={t} />}
    <g opacity={fade}>
      {scene.kind === 'tieu_de' && <TitleScene scene={scene} local={shown} band={!!scene.cast?.length} prehistoric={prehistoric} />}
      {scene.kind === 'bieu_tuong' && <IconScene scene={scene} local={shown} band={!!scene.cast?.length} />}
      {(scene.kind === 'tieu_de' || scene.kind === 'bieu_tuong') && !!scene.cast?.length && <CastBand cast={scene.cast} t={shown} prehistoric={prehistoric} />}
      {scene.kind === 'song_nuoc' && <RiverScene scene={scene} local={shown} />}
      {scene.kind === 'tien_hoa' && <EvolutionScene scene={scene} local={shown} />}
      {scene.kind === 'moc_thoi_gian' && <TimelineScene scene={scene} local={shown} />}
      {scene.kind === 'phat_hien' && <DiscoveryScene scene={scene} local={shown} />}
    </g>
    <text x={48} y={70} fontSize={28} fontWeight={700} fill={cream} opacity={0.75}>{video.title}</text>
    <text x={W - 48} y={70} textAnchor="end" fontSize={26} fill={cream} opacity={0.75}>{index + 1}/{video.scenes.length}</text>
  </>
}

function useVietnameseVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) return
    const pick = () => setVoice(synth.getVoices().find((item) => item.lang.toLowerCase().replace('_', '-').startsWith('vi')) || null)
    pick()
    synth.addEventListener?.('voiceschanged', pick)
    return () => synth.removeEventListener?.('voiceschanged', pick)
  }, [])
  return voice
}

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function JourneyVideo({ video, onEnded }: { video: MissionVideo; onEnded?: () => void }) {
  const total = videoLength(video)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [narrate, setNarrate] = useState(true)
  const [reduced] = useState(prefersReducedMotion)
  const voice = useVietnameseVoice()
  const clock = useRef({ t: 0, last: 0, frame: 0, held: 0, speaking: false, spoken: -1, utterance: null as SpeechSynthesisUtterance | null, audio: null as HTMLAudioElement | null })
  const recordings = useRef(new Map<string, HTMLAudioElement>())
  const ended = useRef(onEnded)
  ended.current = onEnded
  const { index, scene } = sceneAt(video, t)
  const starts = video.scenes.map((_, at) => video.scenes.slice(0, at).reduce((sum, item) => sum + item.duration, 0))
  // Narration prefers the recorded voice (scripts/build-narration.mjs); scenes without a recording use the browser's Vietnamese voice.
  const recorded = video.scenes.some((item) => item.audio)
  const canNarrate = recorded || !!voice
  const speaking = playing && narrate && canNarrate

  function recording(src: string) {
    let audio = recordings.current.get(src)
    if (!audio) { audio = new Audio(src); audio.preload = 'auto'; recordings.current.set(src, audio) }
    return audio
  }
  function silence() {
    const state = clock.current
    state.utterance = null; state.speaking = false; state.spoken = -1
    if (state.audio) { state.audio.pause(); state.audio = null }
    window.speechSynthesis?.cancel()
  }
  function seek(value: number) {
    silence()
    clock.current.t = Math.min(Math.max(value, 0), total)
    setT(clock.current.t)
  }
  function toggle() {
    if (playing) { silence(); setPlaying(false); return }
    if (clock.current.t >= total) seek(0)
    if (narrate) for (const item of video.scenes) if (item.audio) recording(item.audio)
    setPlaying(true)
  }

  useEffect(() => {
    if (!playing) return
    const state = clock.current
    state.last = performance.now()
    const tick = (now: number) => {
      const step = Math.min(0.25, (now - state.last) / 1000)
      state.last = now
      const current = sceneAt(video, state.t)
      let next = Math.min(total, state.t + step)
      // With narration on, a scene holds its last frame until its sentence has been read out (at most 8 s, in case
      // the browser never reports the end of speech).
      const sceneEnd = current.start + current.scene.duration
      if (state.speaking && next >= sceneEnd) {
        state.held += step
        if (state.held > 8) state.speaking = false
        else next = Math.max(state.t, sceneEnd - 0.001)
      } else state.held = 0
      state.t = next
      setT(next)
      if (next >= total - 0.002 && !state.speaking) { state.t = total; setT(total); setPlaying(false); ended.current?.(); return }
      state.frame = requestAnimationFrame(tick)
    }
    state.frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(state.frame)
  }, [playing, total, video])

  useEffect(() => {
    const state = clock.current
    if (!speaking || state.spoken === index) return
    silence()
    state.spoken = index
    if (scene.audio) {
      const audio = recording(scene.audio)
      const done = () => { if (state.audio === audio) { state.speaking = false; state.audio = null } }
      audio.onended = done
      audio.onerror = done
      audio.currentTime = 0
      state.audio = audio; state.speaking = true
      audio.play().catch(done)
    } else if (voice) {
      const utterance = new SpeechSynthesisUtterance(scene.caption)
      utterance.lang = 'vi-VN'
      utterance.voice = voice
      const done = () => { if (state.utterance === utterance) { state.speaking = false; state.utterance = null } }
      utterance.onend = done
      utterance.onerror = done
      state.utterance = utterance; state.speaking = true
      window.speechSynthesis.speak(utterance)
    }
  }, [speaking, index, scene.caption, scene.audio, voice])

  useEffect(() => () => {
    cancelAnimationFrame(clock.current.frame)
    clock.current.audio?.pause()
    if (clock.current.utterance) window.speechSynthesis?.cancel()
  }, [])

  return <figure className="journey-video">
    <div className="journey-video-stage">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${video.title}, cảnh ${index + 1}/${video.scenes.length}`}><VideoFrame video={video} t={t} still={reduced || !playing} /></svg>
      {!playing && (t === 0 || t >= total) && <button type="button" className="journey-video-big" onClick={toggle}>{t >= total ? <><RotateCcw size={22} /> Xem lại</> : <><Play size={22} /> Xem video · {clockLabel(total)}</>}</button>}
    </div>
    <figcaption className="journey-video-caption" aria-live="polite"><p>{scene.caption}</p><small>{pagesLabel(scene.sources)}</small></figcaption>
    <div className="journey-video-controls">
      <button type="button" onClick={toggle} aria-label={playing ? 'Tạm dừng video' : 'Phát video'}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
      <input type="range" min={0} max={total} step={0.1} value={t} aria-label="Tua video" aria-valuetext={`${clockLabel(t)} trên ${clockLabel(total)}`} onChange={(event) => seek(Number(event.target.value))} />
      <span className="journey-video-time">{clockLabel(t)} / {clockLabel(total)}</span>
      <button type="button" aria-pressed={narrate && canNarrate} disabled={!canNarrate} title={canNarrate ? undefined : 'Máy chưa có giọng đọc tiếng Việt; phụ đề vẫn hiển thị'} aria-label="Thuyết minh" onClick={() => { if (narrate) silence(); setNarrate(!narrate) }}>{narrate && canNarrate ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
    </div>
    <ol className="journey-video-scenes" aria-label="Các cảnh">{video.scenes.map((item, at) => <li key={item.id}><button type="button" aria-current={at === index ? 'step' : undefined} aria-label={`Cảnh ${at + 1}`} onClick={() => seek(starts[at])}>{at + 1}</button></li>)}</ol>
    {!canNarrate && <p className="journey-hint-line">Máy này chưa có giọng đọc tiếng Việt nên video chạy kèm phụ đề, không có tiếng thuyết minh.</p>}
  </figure>
}

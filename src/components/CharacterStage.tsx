import { useId, useState, type CSSProperties } from 'react'
import { Headphones, Mic, Sparkles, Volume2 } from 'lucide-react'
import type { Character } from '../types'
import type { CharacterActivity } from '../lib/animatedCharacters'
import { characterPortraits } from '../data/characterPortraits'

interface Props { character: Character; activity: CharacterActivity; studentSpeaking: boolean }

const activityLabels: Record<CharacterActivity, string> = {
  idle: 'Sẵn sàng trò chuyện',
  listening: 'Đang lắng nghe em',
  thinking: 'Đang tìm trong sách…',
  loading: 'Đang chuẩn bị giọng nói…',
  speaking: 'Đang nói cùng em',
}

/** Painted cutout portrait with feathered joints and individually aligned eyes and lips. */
export function CharacterStage({ character, activity, studentSpeaking }: Props) {
  const id = useId().replace(/:/g, '')
  const [loadedSource, setLoadedSource] = useState('')
  const portrait = characterPortraits[character.id]
  if (!portrait) return null
  const { width, height, head, shoulder, eyes, skin, mouth: lips } = portrait
  const paint = (name: string) => `url(#${id}-${name})`
  const Icon = activity === 'listening' ? Mic : activity === 'speaking' ? Volume2 : activity === 'idle' ? Headphones : Sparkles
  const mouth = activity === 'speaking' ? 'speaking' : activity === 'listening' && studentSpeaking ? 'responding' : 'closed'
  const half = lips.width / 2, depth = lips.height
  const anchor = { '--head-x': `${head.x}px`, '--head-y': `${head.y + head.ry * .7}px`, '--shoulder-x': `${shoulder.x}px`, '--shoulder-y': `${shoulder.y}px` } as CSSProperties

  return <aside className={`character-stage character-stage--painted character-stage--${character.id}`} style={anchor} data-activity={activity} data-mouth={mouth} data-ready={loadedSource === character.image} aria-label={`Nhân vật hoạt hình ${character.name}`}>
    <div className="stage-topline"><span><span className="stage-live-dot" /> GẶP GỠ LỊCH SỬ</span><span>HOẠT HÌNH 2D</span></div>
    <div className="stage-landscape" aria-hidden="true" style={{ backgroundImage: `url("${character.image}")` }} />
    <div className="stage-portrait-wrap">
      <svg className="stage-character" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMin slice" role="img" aria-label={`Minh họa ${character.name}, ${activityLabels[activity].toLocaleLowerCase('vi')}`}>
        <defs>
          <image id={`${id}-art`} className="portrait-source" href={character.image} width={width} height={height} onLoad={() => setLoadedSource(character.image)} />
          <radialGradient id={`${id}-feather`}><stop offset=".75" stopColor="white" /><stop offset="1" stopColor="black" /></radialGradient>
          <mask id={`${id}-head-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}><ellipse cx={head.x} cy={head.y} rx={head.rx} ry={head.ry} fill={paint('feather')} /></mask>
          <mask id={`${id}-shoulder-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}><ellipse cx={shoulder.x} cy={shoulder.y} rx={shoulder.rx} ry={shoulder.ry} fill={paint('feather')} /></mask>
          <linearGradient id={`${id}-skin`} x2="0" y2="1"><stop stopColor={skin[0]} /><stop offset="1" stopColor={skin[1]} /></linearGradient>
          <linearGradient id={`${id}-mouth`} x2="0" y2="1"><stop stopColor="#492d25" /><stop offset="1" stopColor="#804c3d" /></linearGradient>
          <clipPath id={`${id}-closed-lips`}><ellipse cx={lips.x} cy={lips.y + 3} rx={half + 5} ry={depth + 3} /></clipPath>
        </defs>
        <g className="actor-breathe">
          <use href={`#${id}-art`} />
          <g className="actor-forearm"><use href={`#${id}-art`} mask={paint('shoulder-mask')} /></g>
          <g className="actor-head">
            <use href={`#${id}-art`} mask={paint('head-mask')} />
            <g className="actor-eyes" aria-hidden="true">{eyes.map((eye, index) => <g key={index} transform={`translate(${eye.x} ${eye.y}) rotate(${eye.angle})`}>
              <g className="actor-eyelid" style={{ animationDelay: `${index * .025}s` }}>
                <ellipse cx="0" cy="0" rx={eye.rx + 2} ry={eye.ry + 2} fill={paint('skin')} />
                <path d={`M${-eye.rx} 1 Q0 ${eye.ry * .65} ${eye.rx} 1`} fill="none" stroke={skin[0]} strokeWidth="2.2" strokeLinecap="round" />
                <path d={`M${-eye.rx * .85} 1 Q0 ${eye.ry * .5} ${eye.rx * .85} 1`} fill="none" stroke="#76553b" strokeWidth="1.3" strokeLinecap="round" />
              </g>
            </g>)}</g>
            <g className="actor-mouth-closed"><use href={`#${id}-art`} clipPath={paint('closed-lips')} /></g>
            <g transform={`translate(${lips.x} ${lips.y}) rotate(${lips.angle})`}>
              <g className="actor-mouth-open">
                <path d={`M${-half} 0 Q0 -3 ${half} 0 Q${half * .72} ${depth} 0 ${depth} Q${-half * .72} ${depth} ${-half} 0Z`} fill={paint('mouth')} stroke={lips.lip} strokeWidth="1.2" />
                <path d={`M${-half * .77} 1 Q0 -1 ${half * .77} 1 L${half * .67} 3 Q0 4 ${-half * .67} 3Z`} fill="#ede0c8" opacity=".87" />
                <path d={`M${-half * .45} ${depth * .82} Q0 ${depth * .48} ${half * .45} ${depth * .82}`} fill="none" stroke="#b57b67" strokeWidth="2" opacity=".65" />
                <path d={`M${-half * .8} ${depth * .7} Q0 ${depth + 2} ${half * .8} ${depth * .7}`} fill="none" stroke={lips.lip} strokeWidth="1.4" opacity=".8" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
    <div className="stage-caption"><span>{character.period}</span><strong>{character.name}</strong><p>{portrait.subtitle}</p></div>
    <div className="stage-status" role="status"><Icon size={16} aria-hidden="true" /><span>{activityLabels[activity]}</span><span className="stage-sound" aria-hidden="true"><i /><i /><i /><i /><i /></span></div>
    <span className="stage-disclaimer">Nhân vật minh họa · Giọng nói mô phỏng</span>
  </aside>
}

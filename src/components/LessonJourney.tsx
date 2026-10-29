import { useEffect, useState } from 'react'
import { ArrowRight, Clapperboard, Lock, Map as MapIcon, Play, X } from 'lucide-react'
import type { JourneyState } from '../hooks/useJourney'
import { checkLength, checkOpen, clockLabel, correctNeeded, missionOpen, missionStatus, stageOpen, videoLength, type Journey, type Mission } from '../lib/journey'
import type { JourneyRequest } from './JourneyModal'
import { JourneyVideo } from './JourneyVideo'
import '../lesson-journey.css'

// Inside the SGK reader: the videos and missions that the gamified journey built for this same lesson,
// so a learner reads, watches and practises in one place. Missions and the stage check still run in Hành trình.

/** What to open once Hành trình shows the journey: a mission, the stage check, or just the map. */
export type JourneyLaunch = { journeyId: string; request: JourneyRequest | { name: 'map'; stageId: string } }
interface Props { lessonId: string; journeys: JourneyState; onLaunch: (launch: JourneyLaunch) => void }
const statusLabel = { mastered: 'Nắm vững', done: 'Hoàn thành', new: 'Chưa làm' }

/** Lesson ids look like LS6_B05: grade 6, lesson 5. */
export function journeyLessonOf(journeys: JourneyState, lessonId: string) {
  const match = /^LS(\d{1,2})_B(\d{2})$/.exec(lessonId)
  return match ? journeys.forLesson(Number(match[1]), Number(match[2])) : undefined
}

export function LessonJourney({ lessonId, journeys, onLaunch }: Props) {
  const found = journeyLessonOf(journeys, lessonId)
  const [journey, setJourney] = useState<Journey | null>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState<Mission | null>(null)
  const journeyId = found?.summary.id
  useEffect(() => {
    if (!journeyId) return
    const controller = new AbortController()
    setFailed(false)
    journeys.load(journeyId, controller.signal).then((data) => { if (!controller.signal.aborted) setJourney(data) }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [journeyId])
  if (!found) return null
  const ready = journey && journey.id === journeyId ? journey : null
  const stage = ready?.stages.find((item) => item.lesson_number === found.lesson.number && item.status === 'da_bien_soan')

  return <section className="lesson-journey" aria-labelledby="lesson-journey-title">
    <div className="lesson-journey-head">
      <div><span className="section-kicker">HỌC QUA HÀNH TRÌNH · {found.summary.chapter}</span><h3 id="lesson-journey-title">Video &amp; nhiệm vụ của bài</h3></div>
      <span className="lesson-journey-count">{found.lesson.videos > 0 && <><Clapperboard size={15} aria-hidden="true" /> {found.lesson.videos} video · </>}{found.lesson.missions} nhiệm vụ</span>
    </div>
    {!ready || !stage ? <p className="lesson-journey-state" role="status">{failed ? 'Chưa tải được hành trình của bài này.' : 'Đang tải video và nhiệm vụ…'}</p> : <LessonStage journey={ready} stageId={stage.id} journeys={journeys} playing={playing} setPlaying={setPlaying} onLaunch={onLaunch} />}
  </section>
}

function LessonStage({ journey, stageId, journeys, playing, setPlaying, onLaunch }: { journey: Journey; stageId: string; journeys: JourneyState; playing: Mission | null; setPlaying: (mission: Mission | null) => void; onLaunch: (launch: JourneyLaunch) => void }) {
  const stage = journey.stages.find((item) => item.id === stageId)!
  const { progress } = journeys.progressOf(journey.id)
  const opened = stageOpen(progress, journey, stage)
  const passed = !!progress.stages[stage.id]?.passed
  const canCheck = checkOpen(progress, journey, stage)
  const videos = stage.missions.filter((mission) => mission.video)
  const launch = (request: JourneyLaunch['request']) => onLaunch({ journeyId: journey.id, request })

  return <>
    {videos.length > 0 && <div className="lesson-journey-videos">
      {playing?.video ? <div className="lesson-journey-player">
        <div className="lesson-journey-player-head"><strong>{playing.video.title}</strong><button type="button" className="button-outline" onClick={() => setPlaying(null)}><X size={15} /> Đóng video</button></div>
        <JourneyVideo key={playing.id} video={playing.video} />
      </div> : null}
      <ul aria-label="Video bài học">{videos.map((mission) => <li key={mission.id}><button type="button" aria-pressed={playing?.id === mission.id} onClick={() => setPlaying(mission)}><Play size={16} aria-hidden="true" /><span>{mission.video!.title}<small>{clockLabel(videoLength(mission.video!))}{mission.title !== mission.video!.title && ` · ${mission.title}`}</small></span></button></li>)}</ul>
    </div>}
    <ol className="lesson-journey-missions" aria-label="Nhiệm vụ của bài">{stage.missions.map((mission, index) => {
      const status = missionStatus(progress, mission, journey.rules)
      const available = missionOpen(progress, journey, stage, index)
      return <li key={mission.id}><i data-status={status} aria-hidden="true" /><span>{mission.title}<small>{mission.objective.text}</small></span>
        <button type="button" className="button-outline" disabled={!available} onClick={() => launch({ name: 'mission', missionId: mission.id })}>{available ? <>{status === 'new' ? 'Làm nhiệm vụ' : statusLabel[status]} <ArrowRight size={15} /></> : <><Lock size={14} /> Khoá</>}</button></li>
    })}</ol>
    <div className="lesson-journey-foot">
      <p>{passed ? 'Em đã qua chặng này trong Hành trình.' : !opened ? 'Qua chặng trước trong Hành trình để mở nhiệm vụ của bài này. Video thì xem được ngay.' : canCheck ? `Đã xong mọi nhiệm vụ: làm kiểm tra cuối chặng, cần đúng ${correctNeeded(journey, stage)}/${checkLength(stage)} câu.` : 'Làm xong các nhiệm vụ để mở kiểm tra cuối chặng và nhận mảnh Sử Ký.'}</p>
      <div>
        {canCheck && !passed && <button type="button" className="button-primary" onClick={() => launch({ name: 'check', stageId: stage.id })}>Kiểm tra cuối chặng <ArrowRight size={15} /></button>}
        <button type="button" className="button-outline" onClick={() => launch({ name: 'map', stageId: stage.id })}><MapIcon size={15} /> Xem trên bản đồ hành trình</button>
      </div>
    </div>
  </>
}

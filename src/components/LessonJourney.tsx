import { useEffect, useState } from 'react'
import { ArrowRight, Lock, Map as MapIcon, Play, Target, X } from 'lucide-react'
import type { JourneyState } from '../hooks/useJourney'
import { checkLength, checkOpen, clockLabel, correctNeeded, missionOpen, missionStatus, stageOpen, videoLength, type Journey, type Mission, type Stage } from '../lib/journey'
import type { JourneyRequest } from './JourneyModal'
import { JourneyVideo } from './JourneyVideo'
import '../lesson-journey.css'

// What the gamified journey built for an SGK lesson, shown inside the lesson reader: each video sits at the start of
// the section it illustrates, and the missions close the lesson as practice. Missions and checks still run in Hành trình.

/** What to open once Hành trình shows the journey: a mission, the stage check, or just the map. */
export type JourneyLaunch = { journeyId: string; request: JourneyRequest | { name: 'map'; stageId: string } }
const statusLabel = { mastered: 'Nắm vững', done: 'Hoàn thành', new: 'Chưa làm' }

/** Lesson ids look like LS6_B05: grade 6, lesson 5. */
export function journeyLessonOf(journeys: JourneyState, lessonId: string) {
  const match = /^LS(\d{1,2})_B(\d{2})$/.exec(lessonId)
  return match ? journeys.forLesson(Number(match[1]), Number(match[2])) : undefined
}

/** Loads the journey stage of a lesson, if the lesson has one. */
export function useLessonJourney(journeys: JourneyState, lessonId: string) {
  const found = journeyLessonOf(journeys, lessonId)
  const journeyId = found?.summary.id
  const [journey, setJourney] = useState<Journey | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!journeyId) return
    const controller = new AbortController()
    setFailed(false)
    journeys.load(journeyId, controller.signal).then((data) => { if (!controller.signal.aborted) setJourney(data) }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [journeyId])
  const ready = journey && journey.id === journeyId ? journey : null
  const stage = ready?.stages.find((item) => item.lesson_number === found?.lesson.number && item.status === 'da_bien_soan')
  return { found, journey: ready, stage, failed, videos: stage?.missions.filter((mission) => mission.video) || [] }
}

/** A compact video card that opens the player in place, so the text below stays within reach. */
export function LessonVideoCard({ mission, playing, onToggle }: { mission: Mission; playing: boolean; onToggle: () => void }) {
  const video = mission.video!
  if (playing) return <figure className="lesson-video is-playing">
    <figcaption><span className="lesson-video-kicker">Video minh hoạ · {clockLabel(videoLength(video))}</span><strong>{video.title}</strong><button type="button" onClick={onToggle}><X size={16} aria-hidden="true" /> Đóng video</button></figcaption>
    <JourneyVideo key={mission.id} video={video} />
  </figure>
  return <button type="button" className="lesson-video" onClick={onToggle}>
    <span className="lesson-video-play" aria-hidden="true"><Play size={20} fill="currentColor" /></span>
    <span className="lesson-video-copy"><span className="lesson-video-kicker">Video minh hoạ · {clockLabel(videoLength(video))}</span><strong>{video.title}</strong><small>Xem trước khi đọc mục này</small></span>
  </button>
}

/** The lesson's missions and stage check, offered once the learner has read the text. */
export function LessonPractice({ journey, stage, journeys, onLaunch }: { journey: Journey; stage: Stage; journeys: JourneyState; onLaunch: (launch: JourneyLaunch) => void }) {
  const { progress } = journeys.progressOf(journey.id)
  const opened = stageOpen(progress, journey, stage)
  const passed = !!progress.stages[stage.id]?.passed
  const canCheck = checkOpen(progress, journey, stage)
  const launch = (request: JourneyLaunch['request']) => onLaunch({ journeyId: journey.id, request })
  return <section className="lesson-practice" aria-labelledby="lesson-practice-title">
    <div className="lesson-practice-head">
      <span className="lesson-practice-icon" aria-hidden="true"><Target size={20} /></span>
      <div><span className="section-kicker">HÀNH TRÌNH · {journey.chapter}</span><h3 id="lesson-practice-title">Luyện tập sau khi đọc</h3></div>
    </div>
    <ol className="lesson-practice-missions" aria-label="Nhiệm vụ của bài">{stage.missions.map((mission, index) => {
      const status = missionStatus(progress, mission, journey.rules)
      const available = missionOpen(progress, journey, stage, index)
      return <li key={mission.id}><i data-status={status} aria-hidden="true" /><span>{mission.title}<small>{mission.objective.text}</small></span>
        <button type="button" className="button-outline" disabled={!available} onClick={() => launch({ name: 'mission', missionId: mission.id })}>{available ? <>{status === 'new' ? 'Làm nhiệm vụ' : statusLabel[status]} <ArrowRight size={15} aria-hidden="true" /></> : <><Lock size={14} aria-hidden="true" /> Khoá</>}</button></li>
    })}</ol>
    <div className="lesson-practice-foot">
      <p>{passed ? 'Em đã qua chặng này trong Hành trình.' : !opened ? 'Qua chặng trước trong Hành trình để mở nhiệm vụ của bài này.' : canCheck ? `Đã xong mọi nhiệm vụ: làm kiểm tra cuối chặng, cần đúng ${correctNeeded(journey, stage)}/${checkLength(stage)} câu.` : 'Làm xong các nhiệm vụ để mở kiểm tra cuối chặng và nhận mảnh Sử Ký.'}</p>
      <div>
        {canCheck && !passed && <button type="button" className="button-primary" onClick={() => launch({ name: 'check', stageId: stage.id })}>Kiểm tra cuối chặng <ArrowRight size={15} aria-hidden="true" /></button>}
        <button type="button" className="button-outline" onClick={() => launch({ name: 'map', stageId: stage.id })}><MapIcon size={15} aria-hidden="true" /> Xem trên bản đồ hành trình</button>
      </div>
    </div>
  </section>
}

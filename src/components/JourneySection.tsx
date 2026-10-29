import { useEffect, useState } from 'react'
import { ArrowRight, Award, BookOpen, CalendarClock, Check, Clapperboard, GraduationCap, Lock, Map as MapIcon, RotateCcw } from 'lucide-react'
import type { JourneyState } from '../hooks/useJourney'
import type { JournalKind } from '../hooks/useLearningJournal'
import { historyApi } from '../lib/historyApi'
import { allMissions, CHAPTER_CHECK_QUESTIONS, chapterOpen, chapterQuestions, checkLength, checkOpen, checkQuestions, correctNeeded, dueMissions, emptyProgress, missionOpen, missionStatus, pickVariant, stageOpen, writtenStages } from '../lib/journey'
import type { Character } from '../types'
import { GuideSays, JourneyModal, type JourneyRequest, type JourneyView } from './JourneyModal'
import type { JourneyLaunch } from './LessonJourney'

interface Props {
  state: JourneyState; grade: number; onChat: (character: Character) => void; onNotice: (text: string) => void; onRecord: (id: string, kind: JournalKind) => void
  /** A mission, stage check or stage asked for from the SGK reader; handled once this journey is shown. */
  launch: (JourneyLaunch & { token: number }) | null
  onLaunched: () => void
  onReadLesson: (lessonId: string) => void
}
const statusLabel = { mastered: 'Nắm vững', done: 'Hoàn thành', new: 'Bắt đầu' }

/** One journey per chapter: the learner switches chapter here and sees how many pieces each chapter already gave. */
function ChapterPicker({ state }: { state: JourneyState }) {
  if (state.choices.length < 2) return null
  return <nav className="journey-chapters" aria-label="Chọn chương">{state.choices.map((item) => {
    const number = item.chapter.match(/Chương\s+(\d+)/i)?.[1]
    return <button key={item.id} type="button" aria-pressed={item.id === state.chosenId} onClick={() => state.select(item.id)}><small>{number ? `Chương ${number}` : 'Chương'}</small><strong>{item.title}</strong><span>{item.pieces}/{item.missionCount} mảnh Sử Ký{item.videoCount ? <em><Clapperboard size={12} aria-hidden="true" /> {item.videoCount} video</em> : null}</span></button>
  })}</nav>
}

export function JourneySection({ state, grade, onChat, onNotice, onRecord, launch, onLaunched, onReadLesson }: Props) {
  const [view, setView] = useState<JourneyView | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const { journey, progress, today, update } = state
  // Switching chapter closes whatever mission or check was open for the previous one.
  useEffect(() => { setView(null) }, [journey?.id])
  useEffect(() => {
    if (!launch || journey?.id !== launch.journeyId) return
    onLaunched()
    const { request } = launch
    if (request.name === 'map') window.setTimeout(() => document.getElementById(`journey-stage-${request.stageId}`)?.scrollIntoView({ block: 'center' }), 120)
    else open(request)
  }, [launch?.token, journey?.id])

  if (!journey) return <section id="journey" className="section-space journey-section" aria-labelledby="journey-title"><div className="page-shell"><div className="section-heading"><div><span className="section-kicker">HÀNH TRÌNH GAME HÓA</span><h2 id="journey-title">Hành trình lịch sử</h2></div></div>
    <ChapterPicker state={state} />
    {state.status === 'error' ? <p role="alert" className="journey-state">{state.error} <button className="button-outline" type="button" onClick={state.retry}>Thử lại</button></p> : state.status === 'empty' ? <p className="journey-state">Chưa có hành trình nào được biên soạn.</p> : <p role="status" className="journey-state">Đang tải hành trình…</p>}
  </div></section>

  const ready = { ...state, journey }
  const rules = journey.rules
  const missions = allMissions(journey)
  const videos = missions.filter((mission) => mission.video).length
  const pieces = missions.filter((mission) => progress.pieces[mission.reward.manh_su_ky.id] !== undefined).length
  const due = dueMissions(progress, journey, today)
  const startDay = Math.min(today, ...Object.values(progress.objectives).flatMap((item) => item.firstTry.map((entry) => entry.d)))

  function open(request: JourneyRequest) {
    const token = Date.now()
    if (request.name === 'mission') setView({ ...request, token })
    else if (request.name === 'collection') setView({ name: 'collection', token })
    else if (request.name === 'videos') setView({ name: 'videos', token })
    else if (request.name === 'check') {
      const stage = writtenStages(journey!).find((item) => item.id === request.stageId)
      if (!stage) return
      setView({ name: 'check', stageId: stage.id, questions: update((draft) => checkQuestions(draft, stage)) || [], token })
    } else if (request.name === 'chapter') setView({ name: 'chapter', questions: update((draft) => chapterQuestions(draft, journey!)) || [], token })
    else setView({ name: 'review', queue: update((draft) => dueMissions(draft, journey!, today).map((mission) => ({ missionId: mission.id, question: pickVariant(draft, mission) }))) || [], token })
  }
  async function interview(appId: string) {
    try { onChat(await historyApi<Character>(`characters/${appId}`)) } catch (error) { onNotice((error as Error).message) }
  }

  return <section id="journey" className="section-space journey-section" aria-labelledby="journey-title"><div className="page-shell">
    <div className="section-heading"><div><span className="section-kicker">HÀNH TRÌNH GAME HÓA · LỚP {journey.grade}</span><h2 id="journey-title">{journey.title}</h2><p>{journey.chapter}</p></div><span className="heading-decoration"><MapIcon size={18} /> {writtenStages(journey).length}/{journey.stages.length} chặng đã mở</span></div>
    <ChapterPicker state={state} />
    {!state.forGrade && <p className="journey-note" role="note">Các hành trình hiện có được biên soạn cho Lớp {journey.grade}. Hành trình cho Lớp {grade} đang được chuẩn bị; em vẫn có thể đi thử các hành trình này.</p>}
    <div className="journey-bar">
      <span className="journey-stat"><strong>{progress.xp}</strong> XP hành trình</span>
      <span className="journey-stat"><strong>{pieces}/{missions.length}</strong> mảnh Sử Ký</span>
      <button type="button" className={`journey-chip ${due.length ? 'is-due' : ''}`} onClick={() => open({ name: 'review' })}><CalendarClock size={16} /> Ôn tập{due.length ? ` · ${due.length}` : ''}</button>
      <button type="button" className="journey-chip" onClick={() => open({ name: 'collection' })}><Award size={16} /> Bộ sưu tập</button>
      {videos > 0 && <button type="button" className="journey-chip is-video" onClick={() => open({ name: 'videos' })}><Clapperboard size={16} /> Video bài học · {videos}</button>}
    </div>
    {journey.intro && <GuideSays journey={journey} narration={journey.intro} />}
    <ul className="journey-legend" aria-label="Chú giải"><li><i data-status="new" /> Chưa làm</li><li><i data-status="done" /> Hoàn thành</li><li><i data-status="mastered" /> Nắm vững (được mảnh Sử Ký)</li></ul>
    <ol className="journey-road" aria-label="Bản đồ hành trình">{journey.stages.map((stage) => {
      if (stage.status !== 'da_bien_soan') return <li key={stage.id} className="journey-stage is-soon"><span className="journey-node">{stage.order}</span><div><h3>{stage.title}</h3><small>Bài {stage.lesson_number} · chặng này đang được biên soạn</small></div></li>
      const opened = stageOpen(progress, journey, stage)
      const passed = !!progress.stages[stage.id]?.passed
      const best = progress.stages[stage.id]?.best
      const canCheck = checkOpen(progress, journey, stage)
      return <li key={stage.id} id={`journey-stage-${stage.id}`} className={`journey-stage ${passed ? 'is-passed' : opened ? 'is-open' : 'is-locked'}`}>
        <span className="journey-node">{passed ? <Check size={18} /> : stage.order}</span>
        <div>
          <div className="journey-stage-head"><div><h3>{stage.title}</h3><small>Bài {stage.lesson_number}: {stage.sgk_title} · SGK tr. {stage.pages?.[0]}–{stage.pages?.[1]}</small></div><span className="journey-tag">{passed ? 'Đã qua chặng' : opened ? 'Đang mở' : 'Qua chặng trước để mở'}</span></div>
          <button type="button" className="journey-read-lesson" onClick={() => onReadLesson(`LS${journey.grade}_B${String(stage.lesson_number).padStart(2, '0')}`)}><BookOpen size={14} /> Đọc bài SGK{stage.missions.some((mission) => mission.video) ? ' và xem video' : ''}</button>
          {opened && <><div className="journey-missions">{stage.missions.map((mission, index) => {
            const status = missionStatus(progress, mission, rules)
            const available = missionOpen(progress, journey, stage, index)
            return <button key={mission.id} type="button" className="journey-mission" disabled={!available} onClick={() => open({ name: 'mission', missionId: mission.id })}><i data-status={status} aria-hidden="true" /><span>{mission.title}{mission.video && <Clapperboard className="journey-has-video" size={14} aria-label=" (có video)" />}</span><small>{available ? statusLabel[status] : <><Lock size={12} /> Khoá</>}</small></button>
          })}</div>
          <div className="journey-check"><button type="button" className={canCheck && !passed ? 'button-primary' : 'button-outline'} disabled={!canCheck} onClick={() => open({ name: 'check', stageId: stage.id })}>Kiểm tra cuối chặng <ArrowRight size={16} /></button><small>{best !== undefined ? `Điểm cao nhất ${Math.round(best * 100)}%` : canCheck ? `Cần đúng ${correctNeeded(journey, stage)}/${checkLength(stage)} câu để qua chặng` : 'Hoàn thành mọi nhiệm vụ để mở'}</small></div></>}
        </div>
      </li>
    })}
    {(() => {
      // The chapter test closes the road: it opens once every stage is passed.
      const canTake = chapterOpen(progress, journey)
      const record = progress.chapter
      return <li className={`journey-chapter-check ${record?.passed ? 'is-passed' : canTake ? 'is-open' : 'is-locked'}`}>
        <span className="journey-node">{record?.passed ? <Check size={18} /> : <GraduationCap size={20} />}</span>
        <div>
          <div className="journey-stage-head"><div><h3>Kiểm tra chương</h3><small>{CHAPTER_CHECK_QUESTIONS} câu từ mọi bài của {journey.chapter.split(':')[0]}</small></div><span className="journey-tag">{record?.passed ? 'Đã hoàn thành chương' : canTake ? 'Đang mở' : 'Qua mọi chặng để mở'}</span></div>
          <div className="journey-check"><button type="button" className={canTake && !record?.passed ? 'button-primary' : 'button-outline'} disabled={!canTake} onClick={() => open({ name: 'chapter' })}>Làm bài kiểm tra chương <ArrowRight size={16} /></button><small>{record ? `Điểm cao nhất ${Math.round(record.best * 100)}%` : canTake ? `Cần đúng ${correctNeeded(journey, undefined, CHAPTER_CHECK_QUESTIONS)}/${CHAPTER_CHECK_QUESTIONS} câu để hoàn thành chương` : 'Qua kiểm tra cuối mọi chặng để mở'}</small></div>
        </div>
      </li>
    })()}</ol>
    <details className="journey-tools"><summary>Công cụ học thử</summary>
      <p>Đang ở ngày học thứ {today - startDay + 1}. Nắm vững cần trả lời đúng ngay lần đầu vào {rules.mastery.distinct_days} ngày khác nhau; bấm “Sang ngày hôm sau” để thử ôn tập mà không phải chờ.</p>
      <div className="journey-actions">
        <button type="button" className="button-outline" onClick={() => { const count = update((draft) => { draft.dayOffset += 1; return dueMissions(draft, journey, today + 1).length }); onNotice(count ? `Sang ngày mới: có ${count} nhiệm vụ cần ôn` : 'Sang ngày mới') }}>Sang ngày hôm sau</button>
        <label className="journey-toggle"><input type="checkbox" checked={progress.unlockAll} onChange={(event) => update((draft) => { draft.unlockAll = event.target.checked })} /> Mở khoá mọi chặng (quyền giáo viên)</label>
        <button type="button" className="button-outline" onClick={() => { if (!confirmReset) { setConfirmReset(true); return } update((draft) => Object.assign(draft, emptyProgress())); setConfirmReset(false); onNotice('Đã xoá tiến độ hành trình') }}><RotateCcw size={16} /> {confirmReset ? 'Bấm lần nữa để xoá hết tiến độ' : 'Xoá tiến độ hành trình'}</button>
      </div>
      <p>Tiến độ chỉ lưu trên trình duyệt này.{state.storageError ? ' Trình duyệt đang chặn lưu trữ, tiến độ sẽ mất khi tải lại trang.' : ''}</p>
    </details>
    {view && <JourneyModal state={ready} view={view} open={open} onClose={() => setView(null)} onNotice={onNotice} onRecord={onRecord} onInterview={interview} />}
  </div></section>
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award, BookOpen, Check, Clapperboard, Lightbulb, MessageCircle, Play, RotateCcw, Search, X } from 'lucide-react'
import type { JourneyState } from '../hooks/useJourney'
import type { JournalKind } from '../hooks/useLearningJournal'
import { JourneyVideo } from './JourneyVideo'
import {
  answerComplete, checkOpen, clockLabel, gradeAnswer, videoLength, interviewCharacters, mastery, missionOpen, nextReviewDay, pagesLabel, pickVariant, QUESTIONS_PER_MISSION, recordFirstTry, schedule, stageOfMission, startAnswer, writtenStages, xpFor,
  type Answer, type Grade, type Journey, type Mission, type Narration, type Question, type Reflection, type Stage,
} from '../lib/journey'

export type JourneyRequest = { name: 'mission'; missionId: string } | { name: 'check'; stageId: string } | { name: 'review' } | { name: 'collection' } | { name: 'videos' }
export type JourneyView =
  | { name: 'mission'; missionId: string; token: number }
  | { name: 'check'; stageId: string; questions: { question: Question; missionId: string | null }[]; token: number }
  | { name: 'review'; queue: { missionId: string; question: Question }[]; token: number }
  | { name: 'collection'; token: number }
  | { name: 'videos'; token: number }

interface Shared {
  state: JourneyState & { journey: Journey }
  open: (request: JourneyRequest) => void
  onClose: () => void
  onNotice: (text: string) => void
  onRecord: (id: string, kind: JournalKind) => void
  onInterview: (appCharacterId: string) => void
}

const bloomLabel = { nho: 'Nhớ', hieu: 'Hiểu', van_dung: 'Vận dụng' }
const stepNames = ['Nhiệm vụ', 'Kiến thức', 'Khám phá', 'Thử thách', 'Kết quả']
export const guideName = (journey: Journey) => journey.mascot.name.replace(/\s*\(.*\)\s*$/, '') || 'Người dẫn đường'

export function GuideSays({ journey, narration }: { journey: Journey; narration: Narration }) {
  return <div className="journey-say"><span className="journey-guide" aria-hidden="true">史</span><p><strong>{guideName(journey)} <small>lời dẫn truyện, hư cấu</small></strong>{narration.text}</p></div>
}

/** Answer sheet for the four auto-graded question types; choices are always shown shuffled. */
function QuestionCard({ question, answer, onChange, locked, result }: { question: Question; answer: Answer; onChange: (answer: Answer) => void; locked: boolean; result: Grade | null }) {
  let body: ReactNode = null
  if (question.type === 'trac_nghiem' && answer.type === 'trac_nghiem') {
    body = <div className="journey-choices" role="radiogroup" aria-label="Các phương án">{answer.order.map((index) => {
      const mark = result ? (index === question.answer && result.ok ? 'correct' : index === answer.selected && !result.ok ? 'wrong' : '') : ''
      return <button key={index} type="button" role="radio" aria-checked={answer.selected === index} className={mark} disabled={locked} onClick={() => onChange({ ...answer, selected: index })}>{question.choices[index]}</button>
    })}</div>
  }
  if (question.type === 'sap_xep' && answer.type === 'sap_xep') {
    const move = (from: number, to: number) => { const sequence = [...answer.sequence];[sequence[from], sequence[to]] = [sequence[to], sequence[from]]; onChange({ ...answer, sequence }) }
    body = <><p className="journey-hint-line">Dùng nút ↑ ↓ để đổi chỗ, sự kiện sớm nhất ở trên cùng.</p><ol className="journey-order">{answer.sequence.map((item, position) => <li key={item}><span className="journey-order-number">{position + 1}</span><span>{question.items[item]}</span><span className="journey-order-moves"><button type="button" aria-label={`Đưa lên: ${question.items[item]}`} disabled={locked || position === 0} onClick={() => move(position, position - 1)}><ArrowUp size={16} /></button><button type="button" aria-label={`Đưa xuống: ${question.items[item]}`} disabled={locked || position === answer.sequence.length - 1} onClick={() => move(position, position + 1)}><ArrowDown size={16} /></button></span></li>)}</ol></>
  }
  if (question.type === 'ghep_noi' && answer.type === 'ghep_noi') {
    body = <div className="journey-pairs">{question.pairs.map((pair, index) => <label key={pair[0]}><span>{pair[0]}</span><select aria-label={pair[0]} value={answer.match[index]} disabled={locked} onChange={(event) => onChange({ ...answer, match: answer.match.map((value, at) => at === index ? Number(event.target.value) : value) })}><option value={-1}>Chọn…</option>{answer.rights.map((right) => <option key={right} value={right}>{question.pairs[right][1]}</option>)}</select></label>)}</div>
  }
  if (question.type === 'phan_loai' && answer.type === 'phan_loai') {
    body = <div className="journey-sort">{answer.items.map((item, index) => <div key={item.text} role="group" aria-label={item.text}><span>{item.text}</span><div>{answer.groups.map((group, groupIndex) => <button key={group} type="button" aria-pressed={answer.pick[index] === groupIndex} disabled={locked} onClick={() => onChange({ ...answer, pick: answer.pick.map((value, at) => at === index ? groupIndex : value) })}>{group}</button>)}</div></div>)}</div>
  }
  return <div className="journey-question"><p className="journey-prompt">{question.prompt}</p>{body}</div>
}

function Feedback({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <div className={`journey-feedback ${ok ? 'is-correct' : 'is-wrong'}`} role="status">{children}</div>
}

function MissionView({ state, open, onNotice, onRecord, onInterview, mission, stage }: Shared & { mission: Mission; stage: Stage }) {
  const { journey, progress, update, today } = state
  const rules = journey.rules
  const [step, setStep] = useState(0)
  const [card, setCard] = useState(0)
  const [watching, setWatching] = useState(!!mission.video)
  const [watched, setWatched] = useState(false)
  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [used, setUsed] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(0)
  const [result, setResult] = useState<(Grade & { gain?: number; swap?: boolean }) | null>(null)
  const [correct, setCorrect] = useState(0)
  const [earned, setEarned] = useState(0)
  const [bonus, setBonus] = useState(0)

  function nextQuestion(exclude = used) {
    const picked = update((draft) => pickVariant(draft, mission, exclude))
    if (!picked) return
    setQuestion(picked); setAnswer(startAnswer(picked)); setUsed([...exclude, picked.id]); setResult(null)
  }
  function go(to: number) {
    setStep(to)
    if (to === 3 && !question) nextQuestion()
  }
  function announce(unlocked: { piece?: string; badge?: string } | undefined) {
    if (unlocked?.piece) onNotice(`Đã nắm vững! Nhận ${unlocked.piece}`)
    if (unlocked?.badge) window.setTimeout(() => onNotice(`Mở khoá ${unlocked.badge}`), 3400)
  }
  function check() {
    if (!question || !answer) return
    const graded = gradeAnswer(question, answer)
    if (graded.ok) {
      const gain = xpFor(rules, attempts, hint > 0)
      const unlocked = update((draft) => { draft.xp += gain; return attempts === 0 && hint === 0 ? recordFirstTry(draft, journey, mission, question.id, today) : undefined })
      announce(unlocked)
      setCorrect(correct + 1); setEarned(earned + gain); setResult({ ...graded, gain })
    } else {
      const tries = attempts + 1
      setAttempts(tries); setHint(Math.min(3, tries))
      setResult({ ...graded, swap: tries === 2 && mission.challenge_pool.length > used.length })
    }
  }
  function afterCorrect() {
    if (correct < QUESTIONS_PER_MISSION) { setAttempts(0); setHint(0); nextQuestion(); return }
    const first = !progress.missions[mission.id]
    const gain = first ? rules.xp.mission_complete : 0
    update((draft) => {
      draft.missions[mission.id] = true
      draft.xp += gain
      if ((draft.objectives[mission.objective.id]?.box ?? null) === null) schedule(draft, mission, true, today, rules)
    })
    onRecord(`journey:${mission.id}`, 'quiz')
    setBonus(gain); setStep(4)
  }

  const index = stage.missions.indexOf(mission)
  const next = stage.missions[index + 1]
  const locked = !!result && (result.ok || !!result.swap)
  let body: ReactNode
  if (step === 0) body = <>{mission.intro && <GuideSays journey={journey} narration={mission.intro} />}<section className="journey-panel"><span className="journey-eyebrow">Mục tiêu{mission.objective.bloom ? ` · ${bloomLabel[mission.objective.bloom]}` : ''}</span><p className="journey-lead">{mission.objective.text}</p><div className="journey-actions"><button className="button-primary" type="button" onClick={() => go(1)}>Nhận nhiệm vụ <ArrowRight size={16} /></button></div></section></>
  else if (step === 1 && mission.video && watching) body = <section className="journey-panel"><span className="journey-eyebrow">Video · {clockLabel(videoLength(mission.video))}</span><h3>{mission.video.title}</h3><JourneyVideo video={mission.video} onEnded={() => setWatched(true)} /><div className="journey-actions"><button className={watched ? 'button-primary' : 'button-outline'} type="button" onClick={() => setWatching(false)}>{watched ? 'Xem thẻ kiến thức' : 'Bỏ qua, xem thẻ kiến thức'} <ArrowRight size={16} /></button></div></section>
  else if (step === 1) {
    const item = mission.cards[card]
    body = <section className="journey-panel"><span className="journey-eyebrow">Thẻ kiến thức {card + 1}/{mission.cards.length}</span><p className="journey-lead">{item.text}</p><span className="journey-source">{pagesLabel(item.sources)}</span><div className="journey-actions">{card === 0 && mission.video && <button className="button-outline" type="button" onClick={() => setWatching(true)}><Play size={16} /> Xem lại video</button>}{card > 0 && <button className="button-outline" type="button" onClick={() => setCard(card - 1)}>Thẻ trước</button>}{card < mission.cards.length - 1 ? <button className="button-primary" type="button" onClick={() => setCard(card + 1)}>Thẻ tiếp <ArrowRight size={16} /></button> : <button className="button-primary" type="button" onClick={() => go(2)}>Đi khám phá <ArrowRight size={16} /></button>}</div></section>
  } else if (step === 2) body = <>{mission.explore.map((activity, at) => {
    const key = `${mission.id}:${at}`
    if (activity.type === 'phong_van') {
      const person = interviewCharacters[activity.character] || { appId: null, name: activity.character }
      return <section className="journey-panel" key={key}><span className="journey-eyebrow">Phỏng vấn nhân vật</span><h3>{person.name}</h3><p>{activity.prompt}</p><p className="journey-hint-line">Gợi ý câu hỏi:</p><ul className="journey-suggestions">{activity.suggested_questions.map((text) => <li key={text}>{text}</li>)}</ul>{person.appId ? <button className="button-outline" type="button" onClick={() => onInterview(person.appId!)}><MessageCircle size={16} /> Trò chuyện với {person.name}</button> : <p className="journey-hint-line">Nhân vật {person.name} chưa có trong phòng trò chuyện. Hãy ghi lại câu hỏi để hỏi thầy cô.</p>}</section>
    }
    const found = !!progress.clues[key]
    return <section className="journey-panel" key={key}>{activity.type === 'tu_lieu' ? <><span className="journey-eyebrow">Tư liệu</span><blockquote>{activity.text}</blockquote>{activity.citation && <span className="journey-source">{activity.citation}</span>}</> : <><span className="journey-eyebrow">Dòng thời gian</span><ol className="journey-timeline">{activity.events.map((event) => <li key={event.time + event.label}><strong>{event.time}</strong><span>{event.label}</span></li>)}</ol></>}<p className="journey-prompt">{activity.prompt}</p>{found ? <p className="journey-clue"><strong>Manh mối:</strong> {activity.clue}</p> : <button className="button-outline" type="button" onClick={() => update((draft) => { draft.clues[key] = true })}><Search size={16} /> Tìm manh mối</button>}</section>
  })}<div className="journey-actions"><button className="button-primary" type="button" onClick={() => go(3)}>Vào thử thách <ArrowRight size={16} /></button></div></>
  else if (step === 3 && question && answer) {
    const hintCard = mission.cards.find((item) => item.id === question.hints.card)
    body = <section className="journey-panel"><span className="journey-eyebrow">Thử thách {Math.min(correct + 1, QUESTIONS_PER_MISSION)}/{QUESTIONS_PER_MISSION} · không mất lượt, sai thì có gợi ý</span>
      <QuestionCard question={question} answer={answer} onChange={setAnswer} locked={locked} result={result} />
      {result?.ok && <Feedback ok><strong>Chính xác! +{result.gain} XP</strong><span>{question.explanation}</span><small>{pagesLabel(question.sources)}</small></Feedback>}
      {result && !result.ok && <Feedback ok={false}><strong>Chưa đúng.</strong>{result.why && <span>{result.why}</span>}{question.type !== 'trac_nghiem' && <span>{result.right}/{result.total} mục đã đúng chỗ.</span>}<span>{result.swap ? 'Đọc lại thẻ kiến thức ở gợi ý 2, rồi thử một câu tương đương.' : 'Đọc gợi ý bên dưới rồi thử lại.'}</span></Feedback>}
      {hint > 0 && <div className="journey-hints"><p><Lightbulb size={15} /> <strong>Gợi ý 1</strong> {question.hints.nudge}</p>{hint >= 2 && hintCard && <p><BookOpen size={15} /> <strong>Gợi ý 2 · xem lại thẻ kiến thức</strong> {hintCard.text}</p>}{hint >= 3 && <p><Lightbulb size={15} /> <strong>Gợi ý 3</strong> {question.hints.narrow}</p>}</div>}
      <div className="journey-actions">{result?.ok ? <button className="button-primary" type="button" onClick={afterCorrect}>{correct >= QUESTIONS_PER_MISSION ? 'Xem kết quả' : 'Câu tiếp theo'} <ArrowRight size={16} /></button> : result?.swap ? <button className="button-primary" type="button" onClick={() => nextQuestion()}><RotateCcw size={16} /> Thử câu tương đương</button> : <button className="button-primary" type="button" disabled={!answerComplete(answer)} onClick={() => { setResult(null); check() }}>Kiểm tra</button>}</div>
    </section>
  } else {
    const level = mastery(progress, mission, rules)
    const piece = mission.reward.manh_su_ky
    const owned = progress.pieces[piece.id] !== undefined
    const due = progress.objectives[mission.objective.id]?.due
    const percent = Math.round(100 * (Math.min(level.variants, level.need) + Math.min(level.days, level.needDays)) / (level.need + level.needDays))
    body = <section className="journey-panel"><span className="journey-eyebrow">Hoàn thành nhiệm vụ</span><p className="journey-big">+{earned + bonus} XP</p>{bonus > 0 && <p className="journey-hint-line">Gồm {bonus} XP thưởng hoàn thành nhiệm vụ.</p>}
      <h3>Mức nắm vững</h3><p className="journey-hint-line">Đúng ngay lần đầu ở {level.variants}/{level.need} câu khác nhau, trong {level.days}/{level.needDays} ngày khác nhau.</p><div className="journey-meter" role="progressbar" aria-label="Mức nắm vững" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div>
      <div className={`journey-piece ${owned ? 'is-owned' : ''}`}><Award size={20} /><span><strong>{piece.title}</strong><small>{owned ? 'Em đã nắm vững mục tiêu này và nhận được mảnh Sử Ký.' : `Mảnh Sử Ký trao khi em nắm vững. Nhiệm vụ sẽ quay lại trong Ôn tập${typeof due === 'number' ? ` sau ${Math.max(0, due - today)} ngày` : ''}.`}</small></span></div>
      <div className="journey-actions"><button className="button-outline" type="button" onClick={() => open({ name: 'collection' })}>Bộ sưu tập</button>{next && missionOpen(progress, journey, stage, index + 1) && <button className="button-primary" type="button" onClick={() => open({ name: 'mission', missionId: next.id })}>Nhiệm vụ tiếp: {next.title} <ArrowRight size={16} /></button>}{!next && checkOpen(progress, journey, stage) && <button className="button-primary" type="button" onClick={() => open({ name: 'check', stageId: stage.id })}>Kiểm tra cuối chặng <ArrowRight size={16} /></button>}</div></section>
  }
  return <><p className="journey-modal-kicker">{stage.title}</p><h2 id="journey-modal-title" tabIndex={-1}>{mission.title}</h2><ol className="journey-steps" aria-label="Các bước của nhiệm vụ">{stepNames.map((name, at) => <li key={name} className={at <= step ? 'is-done' : ''} aria-current={at === step ? 'step' : undefined}>{name}</li>)}</ol>{body}</>
}

function ReflectionCard({ reflection }: { reflection: Reflection }) {
  const [text, setText] = useState('')
  const [shown, setShown] = useState(false)
  return <section className="journey-panel"><span className="journey-eyebrow">Suy ngẫm · tự đối chiếu, không chấm điểm</span><p className="journey-prompt">{reflection.prompt}</p><label className="journey-reflection"><span>Bài làm của em</span><textarea value={text} maxLength={2000} rows={4} onChange={(event) => setText(event.target.value)} /></label>{shown ? <><div className="journey-rubric"><strong>Bài của em đã có những ý này chưa?</strong>{reflection.rubric.map((item) => <label key={item}><input type="checkbox" /> <span>{item}</span></label>)}</div><p className="journey-clue"><strong>Bài mẫu:</strong> {reflection.sample_answer}</p></> : <button className="button-outline" type="button" onClick={() => setShown(true)}>So với bài mẫu</button>}</section>
}

function CheckView({ state, open, onNotice, onRecord, stage, questions }: Shared & { stage: Stage; questions: { question: Question; missionId: string | null }[] }) {
  const { journey, update, today } = state
  const rules = journey.rules
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<Answer>(() => startAnswer(questions[0].question))
  const [result, setResult] = useState<Grade | null>(null)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<'quiz' | 'result' | 'reflect'>('quiz')
  const [gain, setGain] = useState(0)
  const current = questions[index]

  function check() {
    const graded = gradeAnswer(current.question, answer)
    setResult(graded)
    if (!graded.ok) return
    setScore(score + 1)
    const mission = current.missionId ? journey.stages.flatMap((item) => item.missions).find((item) => item.id === current.missionId) : undefined
    if (mission) {
      const unlocked = update((draft) => recordFirstTry(draft, journey, mission, current.question.id, today))
      if (unlocked?.piece) onNotice(`Đã nắm vững! Nhận ${unlocked.piece}`)
      if (unlocked?.badge) window.setTimeout(() => onNotice(`Mở khoá ${unlocked.badge}`), 3400)
    }
  }
  function next() {
    if (index + 1 < questions.length) { setIndex(index + 1); setAnswer(startAnswer(questions[index + 1].question)); setResult(null); return }
    const ratio = score / questions.length
    const reward = update((draft) => {
      const record = draft.stages[stage.id] ||= { passed: false, best: 0 }
      record.best = Math.max(record.best, ratio)
      if (ratio < rules.stage_check.pass_ratio || record.passed) return 0
      record.passed = true
      draft.xp += rules.xp.stage_check_pass
      return rules.xp.stage_check_pass
    }) || 0
    onRecord(`journey:${stage.id}:check`, 'quiz')
    setGain(reward); setPhase('result')
  }

  const reflections = stage.stage_check?.reflection || []
  let body: ReactNode
  if (phase === 'quiz') body = <section className="journey-panel"><span className="journey-eyebrow">Câu {index + 1}/{questions.length} · mỗi câu trả lời một lần, không có gợi ý</span><QuestionCard question={current.question} answer={answer} onChange={setAnswer} locked={!!result} result={result} />{result && <Feedback ok={result.ok}><strong>{result.ok ? 'Đúng.' : 'Chưa đúng.'}</strong>{result.why && <span>{result.why}</span>}<span>{current.question.explanation}</span>{!result.ok && <small>{pagesLabel(current.question.sources)}</small>}</Feedback>}<div className="journey-actions">{result ? <button className="button-primary" type="button" onClick={next}>{index + 1 < questions.length ? 'Câu tiếp' : 'Xem điểm'} <ArrowRight size={16} /></button> : <button className="button-primary" type="button" disabled={!answerComplete(answer)} onClick={check}>Kiểm tra</button>}</div></section>
  else if (phase === 'result') {
    const ratio = score / questions.length
    const passed = ratio >= rules.stage_check.pass_ratio
    body = <section className="journey-panel"><span className="journey-eyebrow">Kết quả</span><p className="journey-big">{score}/{questions.length}</p><p className="journey-hint-line">{Math.round(ratio * 100)}% · cần {Math.round(rules.stage_check.pass_ratio * 100)}% để qua chặng</p><p role="status">{passed ? `Em đã qua chặng${gain ? ` và nhận ${gain} XP` : ''}. Chặng tiếp theo đã mở.` : 'Chưa đủ điểm qua chặng. Em có thể làm lại ngay; mỗi lần làm sẽ gặp câu hỏi khác.'}</p><div className="journey-actions">{!passed && <button className="button-primary" type="button" onClick={() => open({ name: 'check', stageId: stage.id })}><RotateCcw size={16} /> Làm lại (đề mới)</button>}{reflections.length > 0 && <button className={passed ? 'button-primary' : 'button-outline'} type="button" onClick={() => setPhase('reflect')}>Câu hỏi suy ngẫm</button>}</div></section>
  } else body = <>{reflections.map((reflection) => <ReflectionCard key={reflection.id} reflection={reflection} />)}</>
  return <><p className="journey-modal-kicker">Kiểm tra cuối chặng</p><h2 id="journey-modal-title" tabIndex={-1}>{stage.title}</h2>{body}</>
}

function ReviewView({ state, onNotice, onRecord, queue }: Shared & { queue: { missionId: string; question: Question }[] }) {
  const { journey, progress, update, today } = state
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(() => queue[0] ? startAnswer(queue[0].question) : null)
  const [result, setResult] = useState<Grade | null>(null)
  const [score, setScore] = useState(0)
  const missions = journey.stages.flatMap((stage) => stage.missions)

  if (!queue.length) {
    const upcoming = nextReviewDay(progress, journey)
    return <><p className="journey-modal-kicker">Ôn tập</p><h2 id="journey-modal-title" tabIndex={-1}>Hôm nay chưa có gì cần ôn</h2><section className="journey-panel"><p>{upcoming !== null ? `Lượt ôn tiếp theo sau ${Math.max(1, upcoming - today)} ngày.` : 'Hoàn thành một nhiệm vụ để bắt đầu lịch ôn tập.'}</p><p className="journey-hint-line">Ôn đúng lịch giúp em nắm vững: đúng ngay lần đầu vào ngày khác sẽ mở mảnh Sử Ký.</p></section></>
  }
  if (index >= queue.length || !answer) return <><p className="journey-modal-kicker">Ôn tập</p><h2 id="journey-modal-title" tabIndex={-1}>Ôn tập xong</h2><section className="journey-panel"><p className="journey-big">{score}/{queue.length}</p><p className="journey-hint-line">Câu đúng ngay lần đầu. Câu đúng sẽ quay lại sau lâu hơn ({journey.rules.review.intervals_days.join(', ')} ngày); câu sai sẽ quay lại vào ngày mai.</p></section></>
  const item = queue[index]
  const mission = missions.find((entry) => entry.id === item.missionId)!
  const hintCard = mission.cards.find((card) => card.id === item.question.hints.card)
  function check() {
    const graded = gradeAnswer(item.question, answer!)
    setResult(graded)
    if (graded.ok) setScore(score + 1)
    const unlocked = update((draft) => {
      schedule(draft, mission, graded.ok, today, journey.rules)
      if (!graded.ok) return undefined
      draft.xp += journey.rules.xp.first_try
      return recordFirstTry(draft, journey, mission, item.question.id, today)
    })
    onRecord(`journey:${mission.id}`, 'review')
    if (unlocked?.piece) onNotice(`Đã nắm vững! Nhận ${unlocked.piece}`)
    if (unlocked?.badge) window.setTimeout(() => onNotice(`Mở khoá ${unlocked.badge}`), 3400)
  }
  function next() { setIndex(index + 1); setResult(null); setAnswer(queue[index + 1] ? startAnswer(queue[index + 1].question) : null) }
  return <><p className="journey-modal-kicker">Ôn tập {index + 1}/{queue.length}</p><h2 id="journey-modal-title" tabIndex={-1}>{mission.title}</h2><section className="journey-panel"><QuestionCard question={item.question} answer={answer} onChange={setAnswer} locked={!!result} result={result} />{result && <Feedback ok={result.ok}><strong>{result.ok ? `Đúng! +${journey.rules.xp.first_try} XP` : 'Chưa đúng.'}</strong>{result.why && <span>{result.why}</span>}<span>{item.question.explanation}</span>{!result.ok && hintCard && <span><strong>Xem lại:</strong> {hintCard.text}</span>}</Feedback>}<div className="journey-actions">{result ? <button className="button-primary" type="button" onClick={next}>Tiếp <ArrowRight size={16} /></button> : <button className="button-primary" type="button" disabled={!answerComplete(answer)} onClick={check}>Kiểm tra</button>}</div></section></>
}

function CollectionView({ state }: Shared) {
  const { journey, progress } = state
  return <><p className="journey-modal-kicker">{journey.title}</p><h2 id="journey-modal-title" tabIndex={-1}>Bộ sưu tập</h2><p className="journey-hint-line">Mỗi mảnh Sử Ký chỉ trao khi em nắm vững một mục tiêu, không phải khi vừa làm xong nhiệm vụ.</p>{writtenStages(journey).map((stage) => {
    const badge = stage.collection?.badge
    const hasBadge = badge && progress.badges[badge.id] !== undefined
    return <section className="journey-panel" key={stage.id}><span className="journey-eyebrow">{stage.collection?.title || stage.title}</span><div className="journey-pieces">{stage.missions.map((mission) => { const owned = progress.pieces[mission.reward.manh_su_ky.id] !== undefined; return <div key={mission.id} className={`journey-piece ${owned ? 'is-owned' : ''}`} aria-label={`${mission.reward.manh_su_ky.title}: ${owned ? 'đã nhận' : 'chưa nhận'}`}>{owned ? <Check size={18} /> : <Award size={18} />}<span><strong>{mission.reward.manh_su_ky.title}</strong></span></div> })}</div>{badge && <div className={`journey-badge ${hasBadge ? 'is-owned' : ''}`}><Award size={26} /><span><strong>{badge.title}</strong><small>{hasBadge ? 'Đã nhận' : 'Nắm vững mọi nhiệm vụ trong chặng để nhận'}</small></span></div>}</section>
  })}</>
}

/** Every video of the chapter in one place, watchable whatever the mission locks; XP and Sử Ký pieces still come from the missions. */
function VideosView({ state }: Shared) {
  const { journey } = state
  const [playing, setPlaying] = useState<Mission | null>(null)
  useEffect(() => { document.querySelector<HTMLElement>('#journey-modal-title')?.focus() }, [playing])
  if (playing?.video) return <><p className="journey-modal-kicker">Video bài học</p><h2 id="journey-modal-title" tabIndex={-1}>{playing.video.title}</h2><section className="journey-panel"><span className="journey-eyebrow">Video · {clockLabel(videoLength(playing.video))}</span><JourneyVideo key={playing.id} video={playing.video} /><div className="journey-actions"><button className="button-outline" type="button" onClick={() => setPlaying(null)}><ArrowLeft size={16} /> Danh sách video</button></div></section></>
  return <><p className="journey-modal-kicker">{journey.title}</p><h2 id="journey-modal-title" tabIndex={-1}>Video bài học</h2><p className="journey-hint-line">Xem lại video của bất kỳ bài nào. Làm nhiệm vụ để nhận XP và mảnh Sử Ký.</p>{writtenStages(journey).filter((stage) => stage.missions.some((mission) => mission.video)).map((stage) => <section className="journey-panel" key={stage.id}><span className="journey-eyebrow">Bài {stage.lesson_number}: {stage.sgk_title}</span><ul className="journey-video-list">{stage.missions.map((mission) => mission.video && <li key={mission.id}><button type="button" onClick={() => setPlaying(mission)}><Clapperboard size={18} aria-hidden="true" /><span>{mission.video.title}</span><small>{clockLabel(videoLength(mission.video))}</small></button></li>)}</ul></section>)}</>
}

export function JourneyModal(props: Shared & { view: JourneyView }) {
  const { view, onClose, state } = props
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element?.showModal()
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  // Each new screen starts at the top with its title focused, so keyboard and screen-reader users know where they are.
  useEffect(() => { dialog.current?.scrollTo(0, 0); dialog.current?.querySelector<HTMLElement>('#journey-modal-title')?.focus() }, [view.token])

  let content: ReactNode = null
  if (view.name === 'mission') {
    const stage = stageOfMission(state.journey, view.missionId)
    const mission = stage?.missions.find((item) => item.id === view.missionId)
    if (stage && mission) content = <MissionView key={view.token} {...props} stage={stage} mission={mission} />
  } else if (view.name === 'check') {
    const stage = writtenStages(state.journey).find((item) => item.id === view.stageId)
    if (stage && view.questions.length) content = <CheckView key={view.token} {...props} stage={stage} questions={view.questions} />
  } else if (view.name === 'review') content = <ReviewView key={view.token} {...props} queue={view.queue} />
  else if (view.name === 'videos') content = <VideosView key={view.token} {...props} />
  else content = <CollectionView key={view.token} {...props} />

  return <dialog ref={dialog} className="journey-modal" aria-labelledby="journey-modal-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <button className="journey-close" type="button" aria-label="Đóng hành trình" onClick={onClose}><X size={20} /></button>
    <div className="journey-modal-body">{content}</div>
  </dialog>
}

// Gamified journeys from course_builder: chapter = journey, lesson = stage, learning objective = mission.
// Every rule number (XP, mastery, review intervals, pass ratio) comes from journey.rules; nothing is hard-coded here
// except how many correct answers a mission asks for. Functions that take a progress object mutate that draft.

export interface SourceRef { chunk_id: string; lesson_number: number; pages: [number, number] }
export interface Hints { nudge: string; card: string; narrow: string }
interface QuestionBase { id: string; prompt: string; explanation: string; hints: Hints; sources: SourceRef[] }
export type Question = QuestionBase & (
  | { type: 'trac_nghiem'; choices: string[]; answer: number; why_wrong?: Record<string, string> }
  | { type: 'sap_xep'; items: string[] }
  | { type: 'ghep_noi'; pairs: [string, string][] }
  | { type: 'phan_loai'; groups: Record<string, string[]> }
)
export interface Reflection { id: string; type: 'giai_thich'; prompt: string; rubric: string[]; sample_answer: string }
export interface Card { id: string; text: string; sources: SourceRef[] }
export type Explore =
  | { type: 'tu_lieu'; text: string; citation?: string; prompt: string; clue: string; sources: SourceRef[] }
  | { type: 'dong_thoi_gian'; prompt: string; clue: string; events: { time: string; label: string; sources: SourceRef[] }[] }
  | { type: 'phong_van'; character: string; prompt: string; suggested_questions: string[] }
/** Mascot narration is fiction by design (hu_cau); the UI labels it as such. */
export interface Narration { speaker: string; hu_cau: true; text: string }
export type VideoIcon = 'riu_dong' | 'luoi_sat' | 'lua' | 'nguoi' | 'thuy_loi' | 'khien' | 'trong_dong' | 'nha_san' | 'hai_chan' | 'ban_tay' | 'bo_nao' | 'tieng_noi'
  | 'hang_dong' | 'leu' | 'san_bat' | 'hai_luom' | 'tranh_vach' | 'trang_suc' | 'gom' | 'det_vai' | 'chan_nuoi' | 'tuong' | 'mo_tang' | 'lua_chay' | 'dong_do' | 'dong_thau' | 'cuoc' | 'cay' | 'gia_dinh' | 'cua_cai' | 'giau_ngheo'
/** Stages of human evolution drawn by the tien_hoa and moc_thoi_gian templates. */
export type HumanForm = 'vuon_nguoi' | 'nguoi_toi_co' | 'nguoi_tinh_khon'
export type VideoFind = 'hoa_thach' | 'rang' | 'so' | 'riu_tay' | 'cong_cu_da' | 'riu_mai' | 'manh_gom' | 'vo_oc' | 'dan_da' | 'vong_tay' | 'mat_nguoi' | 'xi_dong' | 'mui_ten' | 'luoi_cau' | 'riu_xeo' | 'giao' | 'chuoi_dat' | 'hat'
/** Illustrated people acting in a scene (river scenes: cheo_thuyen, cay_lua; others: the rest). */
export type VideoCast = 'tu_hop' | 'lam_ruong' | 'dao_muong' | 'cam_vu_khi' | 'danh_trong' | 'cheo_thuyen' | 'cay_lua' | 'ghe_da' | 'di_bo' | 'san_bat' | 'hai_luom' | 'lam_gom' | 'luyen_kim'
/** One animated scene: a template the app draws, on-screen words and a narration line, all checked against its quotes. */
export type VideoScene = { id: string; duration: number; caption: string; sources: SourceRef[]; /** Pre-recorded narration, present only while it matches the caption. */ audio?: string; cast?: VideoCast[] } & (
  | { kind: 'tieu_de'; title: string; label?: string }
  | { kind: 'bieu_tuong'; items: { icon: VideoIcon; label: string }[] }
  | { kind: 'song_nuoc'; labels: string[] }
  | { kind: 'tien_hoa'; forms: HumanForm[]; label?: string }
  | { kind: 'moc_thoi_gian'; events: { time: string; label: string; form?: HumanForm }[] }
  | { kind: 'phat_hien'; finds: { find: VideoFind; label: string }[] }
)
/** style: dong_son (bronze-drum backdrop, default) or tien_su (dusk sky and sun, for prehistoric lessons). */
export interface MissionVideo { id: string; title: string; style?: 'dong_son' | 'tien_su'; scenes: VideoScene[] }
export interface Mission {
  id: string
  title: string
  objective: { id: string; text: string; bloom?: 'nho' | 'hieu' | 'van_dung' }
  intro?: Narration
  /** Short animation shown before the knowledge cards. */
  video?: MissionVideo
  cards: Card[]
  explore: Explore[]
  challenge_pool: Question[]
  reward: { manh_su_ky: { id: string; title: string } }
}
export interface Stage {
  id: string
  lesson_number: number
  title: string
  sgk_title?: string
  pages?: [number, number]
  status: 'da_bien_soan' | 'chua_bien_soan'
  order: number
  intro?: Narration
  missions: Mission[]
  /** pass_ratio overrides the journey rule for this stage, e.g. a gentler introductory stage. */
  stage_check?: { draw_per_objective: number; extra: Question[]; reflection: Reflection[]; pass_ratio?: number }
  collection?: { title: string; badge?: { id: string; title: string } }
}
export interface JourneyRules {
  xp: { first_try: number; after_retry: number[]; max_with_hint: number; mission_complete: number; stage_check_pass: number }
  mastery: { first_try_correct_variants: number; distinct_days: number }
  review: { intervals_days: number[]; reset_on_wrong: boolean; max_items_per_session: number }
  challenge: { min_variants_per_objective: number; shuffle_choices: boolean }
  stage_check: { pass_ratio: number }
}
export interface Journey { id: string; title: string; grade: number; book: string; chapter: string; mascot: { id: string; name: string }; intro?: Narration; rules: JourneyRules; stages: Stage[] }
export interface JourneySummary { id: string; title: string; grade: number; book: string; chapter: string; stageCount: number; writtenStageCount: number; missionCount: number; videoCount: number }

/** Correct answers a learner gives before a mission is complete (the prototype's QUESTIONS_PER_MISSION). */
export const QUESTIONS_PER_MISSION = 2

// ---------------------------------------------------------------- progress (stored in this browser only)

export interface ObjectiveProgress { firstTry: { q: string; d: number }[]; box: number | null; due: number | null; lastQ: string | null }
export interface JourneyProgress {
  v: 1
  xp: number
  /** Days added by the "next day" demo tool, so mastery and review can be tried without waiting. */
  dayOffset: number
  /** Teacher-style override that opens every stage and mission. */
  unlockAll: boolean
  missions: Record<string, true>
  objectives: Record<string, ObjectiveProgress>
  stages: Record<string, { passed: boolean; best: number }>
  pieces: Record<string, number>
  badges: Record<string, number>
  clues: Record<string, true>
}
export const journeyStorageKey = 'xuyen-su-ky-journey-v1'

export function emptyProgress(): JourneyProgress {
  return { v: 1, xp: 0, dayOffset: 0, unlockAll: false, missions: {}, objectives: {}, stages: {}, pieces: {}, badges: {}, clues: {} }
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const count = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 1e7 ? value : 0
const day = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && Math.abs(value) < 1e6 ? value : null
const flags = (value: unknown) => isRecord(value) ? Object.fromEntries(Object.keys(value).filter((key) => value[key] === true).map((key) => [key, true as const])) : {}
const days = (value: unknown) => isRecord(value) ? Object.fromEntries(Object.entries(value).flatMap(([key, item]) => day(item) === null ? [] : [[key, item as number]])) : {}

/** Reads saved progress defensively: anything malformed is dropped rather than trusted. */
export function parseProgress(raw: unknown): JourneyProgress {
  if (!isRecord(raw) || raw.v !== 1) return emptyProgress()
  const objectives = isRecord(raw.objectives) ? Object.fromEntries(Object.entries(raw.objectives).flatMap(([id, item]) => {
    if (!isRecord(item)) return []
    const firstTry = Array.isArray(item.firstTry) ? item.firstTry.filter((entry): entry is { q: string; d: number } => isRecord(entry) && typeof entry.q === 'string' && day(entry.d) !== null).slice(-50) : []
    const box = typeof item.box === 'number' && Number.isInteger(item.box) && item.box >= 0 && item.box < 20 ? item.box : null
    return [[id, { firstTry, box, due: box === null ? null : day(item.due), lastQ: typeof item.lastQ === 'string' ? item.lastQ : null }]]
  })) : {}
  const stages = isRecord(raw.stages) ? Object.fromEntries(Object.entries(raw.stages).flatMap(([id, item]) => isRecord(item) && typeof item.best === 'number' && item.best >= 0 && item.best <= 1 ? [[id, { passed: item.passed === true, best: item.best }]] : [])) : {}
  return { v: 1, xp: count(raw.xp), dayOffset: Math.min(count(raw.dayOffset), 3650), unlockAll: raw.unlockAll === true, missions: flags(raw.missions), objectives, stages, pieces: days(raw.pieces), badges: days(raw.badges), clues: flags(raw.clues) }
}

/** Calendar day (YYYY-MM-DD, Vietnam time) as a whole day number, so review intervals are plain additions. */
export const dayNumber = (dayKey: string) => Math.round(Date.parse(`${dayKey}T00:00:00Z`) / 864e5)

// ---------------------------------------------------------------- journey structure

export const writtenStages = (journey: Journey) => journey.stages.filter((stage) => stage.status === 'da_bien_soan')
export const allMissions = (journey: Journey) => writtenStages(journey).flatMap((stage) => stage.missions)
export const stageOfMission = (journey: Journey, missionId: string) => writtenStages(journey).find((stage) => stage.missions.some((mission) => mission.id === missionId))

/** A stage opens after the previous written stage is passed; once a learner has started it, it stays open
 *  (so publishing an earlier lesson later never locks work already done). */
export function stageOpen(progress: JourneyProgress, journey: Journey, stage: Stage) {
  const written = writtenStages(journey)
  const index = written.indexOf(stage)
  if (index < 0) return false
  return progress.unlockAll || index === 0 || !!progress.stages[written[index - 1].id]?.passed
    || !!progress.stages[stage.id] || stage.missions.some((mission) => progress.missions[mission.id])
}
export const missionOpen = (progress: JourneyProgress, journey: Journey, stage: Stage, index: number) =>
  stageOpen(progress, journey, stage) && (progress.unlockAll || index === 0 || !!progress.missions[stage.missions[index - 1].id])
export const checkOpen = (progress: JourneyProgress, journey: Journey, stage: Stage) =>
  stageOpen(progress, journey, stage) && (progress.unlockAll || stage.missions.every((mission) => progress.missions[mission.id]))

// ---------------------------------------------------------------- mastery, rewards and spaced review

function objective(progress: JourneyProgress, mission: Mission) {
  return progress.objectives[mission.objective.id] ||= { firstTry: [], box: null, due: null, lastQ: null }
}

/** Mastery = first-try correct on enough different equivalent questions, on enough different days. */
export function mastery(progress: JourneyProgress, mission: Mission, rules: JourneyRules) {
  const tries = progress.objectives[mission.objective.id]?.firstTry || []
  const variants = new Set(tries.map((entry) => entry.q)).size
  const daysSeen = new Set(tries.map((entry) => entry.d)).size
  const need = rules.mastery.first_try_correct_variants
  const needDays = rules.mastery.distinct_days
  return { variants, days: daysSeen, need, needDays, mastered: variants >= need && daysSeen >= needDays }
}

export type MissionStatus = 'mastered' | 'done' | 'new'
export const missionStatus = (progress: JourneyProgress, mission: Mission, rules: JourneyRules): MissionStatus =>
  mastery(progress, mission, rules).mastered ? 'mastered' : progress.missions[mission.id] ? 'done' : 'new'

/** Records a first-try correct answer; returns the piece and badge this unlocked, if any. Pieces and badges reward mastery only. */
export function recordFirstTry(progress: JourneyProgress, journey: Journey, mission: Mission, questionId: string, today: number) {
  objective(progress, mission).firstTry.push({ q: questionId, d: today })
  const unlocked: { piece?: string; badge?: string } = {}
  const piece = mission.reward.manh_su_ky
  if (mastery(progress, mission, journey.rules).mastered && progress.pieces[piece.id] === undefined) {
    progress.pieces[piece.id] = today
    unlocked.piece = piece.title
    const stage = stageOfMission(journey, mission.id)
    const badge = stage?.collection?.badge
    if (stage && badge && progress.badges[badge.id] === undefined && stage.missions.every((item) => mastery(progress, item, journey.rules).mastered)) {
      progress.badges[badge.id] = today
      unlocked.badge = badge.title
    }
  }
  return unlocked
}

/** Leitner-style schedule: a correct review moves to the next interval, a wrong one goes back to the first. */
export function schedule(progress: JourneyProgress, mission: Mission, correct: boolean, today: number, rules: JourneyRules) {
  const state = objective(progress, mission)
  const intervals = rules.review.intervals_days
  if (state.box === null || (!correct && rules.review.reset_on_wrong)) state.box = 0
  else if (correct) state.box = Math.min(state.box + 1, intervals.length - 1)
  state.due = today + intervals[state.box]
}

export function dueMissions(progress: JourneyProgress, journey: Journey, today: number) {
  return allMissions(journey)
    .filter((mission) => { const due = progress.objectives[mission.objective.id]?.due; return due !== null && due !== undefined && due <= today })
    .sort((a, b) => progress.objectives[a.objective.id].due! - progress.objectives[b.objective.id].due!)
    .slice(0, journey.rules.review.max_items_per_session)
}

export function nextReviewDay(progress: JourneyProgress, journey: Journey) {
  const dues = allMissions(journey).map((mission) => progress.objectives[mission.objective.id]?.due).filter((due): due is number => typeof due === 'number')
  return dues.length ? Math.min(...dues) : null
}

/** Picks an equivalent question: never the one just seen, preferring ones not yet answered right on the first try. */
export function pickVariant(progress: JourneyProgress, mission: Mission, exclude: string[] = [], random = Math.random) {
  const state = objective(progress, mission)
  const seen = new Set(state.firstTry.map((entry) => entry.q))
  const unused = mission.challenge_pool.filter((question) => !exclude.includes(question.id))
  const pool = unused.length ? unused : mission.challenge_pool
  const notLast = pool.filter((question) => question.id !== state.lastQ)
  const fresh = notLast.filter((question) => !seen.has(question.id))
  const from = fresh.length ? fresh : notLast.length ? notLast : pool
  const question = from[Math.floor(random() * from.length)]
  state.lastQ = question.id
  return question
}

/** XP for one correct answer: full on the first try, less after retries, capped once a hint was opened. */
export function xpFor(rules: JourneyRules, attempts: number, hinted: boolean) {
  const base = attempts === 0 ? rules.xp.first_try : rules.xp.after_retry[Math.min(attempts, rules.xp.after_retry.length) - 1]
  return hinted ? Math.min(base, rules.xp.max_with_hint) : base
}

/** End-of-stage check: fresh variants for every objective plus the stage-wide questions. */
export const passRatio = (journey: Journey, stage: Stage) => stage.stage_check?.pass_ratio ?? journey.rules.stage_check.pass_ratio
/** Questions in a stage check: the drawn variants per mission plus the fixed extra questions. */
export const checkLength = (stage: Stage) => stage.missions.reduce((count, mission) => count + Math.min(Math.max(1, stage.stage_check?.draw_per_objective || 1), mission.challenge_pool.length), 0) + (stage.stage_check?.extra.length || 0)
/** Correct answers needed to pass; the small epsilon keeps 0.6 × 5 at 3 despite floating point. */
export const correctNeeded = (journey: Journey, stage: Stage, total = checkLength(stage)) => Math.ceil(passRatio(journey, stage) * total - 1e-9)

export function checkQuestions(progress: JourneyProgress, stage: Stage, random = Math.random) {
  const draw = Math.max(1, stage.stage_check?.draw_per_objective || 1)
  const drawn = stage.missions.flatMap((mission) => {
    const picked: string[] = []
    return Array.from({ length: Math.min(draw, mission.challenge_pool.length) }, () => {
      const question = pickVariant(progress, mission, picked, random)
      picked.push(question.id)
      return { question, missionId: mission.id as string | null }
    })
  })
  return [...drawn, ...(stage.stage_check?.extra || []).map((question) => ({ question, missionId: null as string | null }))]
}

export const videoLength = (video: MissionVideo) => Math.round(video.scenes.reduce((sum, scene) => sum + scene.duration, 0) * 10) / 10

/** Which scene plays at time t (seconds), and how far into it; t past the end stays on the last frame. */
export function sceneAt(video: MissionVideo, t: number) {
  let start = 0
  for (const [index, scene] of video.scenes.entries()) {
    if (t < start + scene.duration || index === video.scenes.length - 1) return { index, scene, start, local: Math.min(Math.max(t - start, 0), scene.duration) }
    start += scene.duration
  }
  throw new Error('video has no scenes')
}

export const clockLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export const pagesLabel = (sources: SourceRef[] | undefined) => {
  const pages = new Set<number>()
  for (const source of sources || []) for (let page = source.pages[0]; page <= source.pages[1]; page++) pages.add(page)
  return pages.size ? `SGK tr. ${[...pages].sort((a, b) => a - b).join(', ')}` : ''
}

// ---------------------------------------------------------------- answering one question

export function shuffled<T>(items: readonly T[], random = Math.random) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]]
  }
  return copy
}

export type Answer =
  | { type: 'trac_nghiem'; order: number[]; selected: number | null }
  | { type: 'sap_xep'; sequence: number[] }
  | { type: 'ghep_noi'; rights: number[]; match: number[] }
  | { type: 'phan_loai'; groups: string[]; items: { text: string; group: number }[]; pick: number[] }

/** A fresh, shuffled answer sheet; the file always lists the correct order, the learner never sees it. */
export function startAnswer(question: Question, random = Math.random): Answer {
  if (question.type === 'trac_nghiem') return { type: 'trac_nghiem', order: shuffled(question.choices.map((_, index) => index), random), selected: null }
  if (question.type === 'sap_xep') {
    const identity = question.items.map((_, index) => index)
    let sequence = shuffled(identity, random)
    for (let attempt = 0; attempt < 10 && sequence.every((value, index) => value === index); attempt++) sequence = shuffled(identity, random)
    if (sequence.every((value, index) => value === index)) sequence = [...identity.slice(1), 0]
    return { type: 'sap_xep', sequence }
  }
  if (question.type === 'ghep_noi') return { type: 'ghep_noi', rights: shuffled(question.pairs.map((_, index) => index), random), match: question.pairs.map(() => -1) }
  const groups = Object.keys(question.groups)
  const items = shuffled(groups.flatMap((name, group) => question.groups[name].map((text) => ({ text, group }))), random)
  return { type: 'phan_loai', groups, items, pick: items.map(() => -1) }
}

export function answerComplete(answer: Answer) {
  if (answer.type === 'trac_nghiem') return answer.selected !== null
  if (answer.type === 'ghep_noi') return answer.match.every((value) => value >= 0)
  if (answer.type === 'phan_loai') return answer.pick.every((value) => value >= 0)
  return true
}

export interface Grade { ok: boolean; right: number; total: number; why?: string }
export function gradeAnswer(question: Question, answer: Answer): Grade {
  if (question.type === 'trac_nghiem' && answer.type === 'trac_nghiem') {
    const ok = answer.selected === question.answer
    return { ok, right: ok ? 1 : 0, total: 1, why: ok || answer.selected === null ? undefined : question.why_wrong?.[String(answer.selected)] }
  }
  let right = 0
  let total = 0
  if (answer.type === 'sap_xep') { total = answer.sequence.length; right = answer.sequence.filter((value, index) => value === index).length }
  if (answer.type === 'ghep_noi') { total = answer.match.length; right = answer.match.filter((value, index) => value === index).length }
  if (answer.type === 'phan_loai') { total = answer.items.length; right = answer.items.filter((item, index) => answer.pick[index] === item.group).length }
  return { ok: total > 0 && right === total, right, total }
}

/** Journey characters (NhanVatLichSu ids) that already have a chat persona in this app. */
export const interviewCharacters: Record<string, { appId: string | null; name: string }> = {
  trung_trac: { appId: 'hai-ba-trung', name: 'Trưng Trắc' },
  trung_nhi: { appId: 'hai-ba-trung', name: 'Trưng Nhị' },
  ly_nam_de: { appId: null, name: 'Lý Nam Đế' },
  ngo_quyen: { appId: 'ngo-quyen', name: 'Ngô Quyền' },
  tran_hung_dao: { appId: 'tran-hung-dao', name: 'Trần Hưng Đạo' },
  ho_chi_minh: { appId: 'ho-chi-minh', name: 'Hồ Chí Minh' },
}

import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Gamified journeys built by course_builder (one chapter = one journey, one lesson = one stage, one objective = one mission).
// Every card, question and source must point at a real textbook chunk; a journey that does not validate is never served.
export const defaultJourneyPath = fileURLToPath(new URL('../data/journeys/', import.meta.url))
/** Pre-recorded narration (scripts/build-narration.mjs): data/journeys/narration/<journey>.json → files in public/audio/journeys/. */
export const narrationPath = resolve(defaultJourneyPath, 'narration')
export const captionHash = (text) => createHash('sha256').update(text.normalize('NFC').trim()).digest('hex')
export const questionTypes = ['trac_nghiem', 'sap_xep', 'ghep_noi', 'phan_loai']
const exploreTypes = ['tu_lieu', 'dong_thoi_gian', 'phong_van']
const hintLevels = ['nudge', 'card', 'narrow']
// Same lists as course_builder/rules.py: every scene uses an animation template the app knows how to draw.
export const videoSceneKinds = ['tieu_de', 'bieu_tuong', 'song_nuoc', 'tien_hoa', 'moc_thoi_gian', 'phat_hien']
export const videoIcons = ['riu_dong', 'luoi_sat', 'lua', 'nguoi', 'thuy_loi', 'khien', 'trong_dong', 'nha_san', 'hai_chan', 'ban_tay', 'bo_nao', 'tieng_noi',
  'hang_dong', 'leu', 'san_bat', 'hai_luom', 'tranh_vach', 'trang_suc', 'gom', 'det_vai', 'chan_nuoi', 'tuong', 'mo_tang', 'lua_chay', 'dong_do', 'dong_thau', 'cuoc', 'cay', 'gia_dinh', 'cua_cai', 'giau_ngheo']
export const videoForms = ['vuon_nguoi', 'nguoi_toi_co', 'nguoi_tinh_khon']
export const videoFinds = ['hoa_thach', 'rang', 'so', 'riu_tay', 'cong_cu_da', 'riu_mai', 'manh_gom', 'vo_oc', 'dan_da', 'vong_tay', 'mat_nguoi', 'xi_dong', 'mui_ten', 'luoi_cau', 'riu_xeo', 'giao', 'chuoi_dat', 'hat']
export const videoStyles = ['dong_son', 'tien_su']
// Illustrated people (no words on screen): river scenes draw boats and planters, the others a band of figures below.
export const videoRiverCast = ['cheo_thuyen', 'cay_lua']
export const videoBandCast = ['tu_hop', 'lam_ruong', 'dao_muong', 'cam_vu_khi', 'danh_trong', 'ghe_da', 'di_bo', 'san_bat', 'hai_luom', 'lam_gom', 'luyen_kim']

export class JourneyError extends Error {}

// Same matching rule as course_builder/sources.py: NFC, lower case, punctuation removed, whitespace collapsed.
export const quoteKey = (text) => text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}_]+/gu, ' ').trim()

const isText = (value) => typeof value === 'string' && value.trim().length > 0
const isCount = (value) => Number.isInteger(value) && value >= 0

function validateRules(rules, fail) {
  const xp = rules?.xp
  if (!xp || ![xp.first_try, xp.max_with_hint, xp.mission_complete, xp.stage_check_pass].every(isCount) || !Array.isArray(xp.after_retry) || !xp.after_retry.length || !xp.after_retry.every(isCount)) fail('rules.xp is incomplete')
  if (!isCount(rules.mastery?.first_try_correct_variants) || !isCount(rules.mastery?.distinct_days)) fail('rules.mastery is incomplete')
  const intervals = rules.review?.intervals_days
  if (!Array.isArray(intervals) || !intervals.length || !intervals.every((day) => Number.isInteger(day) && day > 0) || !isCount(rules.review.max_items_per_session) || rules.review.max_items_per_session < 1) fail('rules.review is incomplete')
  if (!isCount(rules.challenge?.min_variants_per_objective) || rules.challenge.min_variants_per_objective < 1) fail('rules.challenge is incomplete')
  if (typeof rules.stage_check?.pass_ratio !== 'number' || rules.stage_check.pass_ratio <= 0 || rules.stage_check.pass_ratio > 1) fail('rules.stage_check.pass_ratio must be in (0, 1]')
}

function validateQuestion(question, where, cardIds, fail) {
  if (!isText(question?.id) || !isText(question.prompt) || !isText(question.explanation)) fail(`${where}: question needs id, prompt and explanation`)
  const at = `${where} ${question.id}`
  if (!questionTypes.includes(question.type)) fail(`${at}: unsupported type ${question.type}`)
  if (question.type === 'trac_nghiem' && (!Array.isArray(question.choices) || question.choices.length < 3 || !question.choices.every(isText) || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.choices.length)) fail(`${at}: trac_nghiem needs >= 3 choices and a valid answer index`)
  if (question.type === 'sap_xep' && (!Array.isArray(question.items) || question.items.length < 2 || !question.items.every(isText) || new Set(question.items).size !== question.items.length)) fail(`${at}: sap_xep needs >= 2 distinct items`)
  if (question.type === 'ghep_noi' && (!Array.isArray(question.pairs) || question.pairs.length < 3 || !question.pairs.every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every(isText)) || new Set(question.pairs.map((pair) => pair[1])).size !== question.pairs.length)) fail(`${at}: ghep_noi needs >= 3 pairs with distinct right sides`)
  if (question.type === 'phan_loai') {
    const groups = Object.entries(question.groups || {})
    if (groups.length < 2 || groups.some(([name, items]) => !isText(name) || !Array.isArray(items) || !items.length || !items.every(isText)) || groups.flatMap(([, items]) => items).length < 4) fail(`${at}: phan_loai needs >= 2 groups and >= 4 items`)
  }
  if (!question.hints || !hintLevels.every((level) => isText(question.hints[level]))) fail(`${at}: every hint level (${hintLevels.join(', ')}) is required`)
  if (!cardIds.has(question.hints.card)) fail(`${at}: hint card ${question.hints.card} does not exist`)
}

/** Validates one journey against the textbook dataset; throws JourneyError with the first problem found. */
export function validateJourney(journey, dataset) {
  const fail = (message) => { throw new JourneyError(`${journey?.id || 'journey'}: ${message}`) }
  if (!/^[a-z0-9_]+$/.test(journey?.id || '') || !isText(journey.title) || !isText(journey.chapter) || ![6, 7, 8, 9, 10, 11, 12].includes(journey.grade)) fail('id, title, chapter and grade are required')
  if (!isText(journey.mascot?.name)) fail('mascot.name is required')
  validateRules(journey.rules, fail)
  if (!Array.isArray(journey.stages) || !journey.stages.length) fail('stages must not be empty')
  const ids = new Set()
  const unique = (id) => { if (!isText(id) || ids.has(id)) fail(`missing or duplicate id ${id}`); ids.add(id) }
  const sourceLists = []
  const collect = (item, where) => {
    if (!Array.isArray(item?.sources) || !item.sources.length) fail(`${where}: sources are required`)
    sourceLists.push([item.sources, where])
  }
  if (journey.intro && journey.intro.hu_cau !== true) fail('intro by the mascot must be marked hu_cau')
  for (const stage of journey.stages) {
    unique(stage?.id)
    if (!isText(stage.title) || !Number.isInteger(stage.lesson_number) || !Number.isInteger(stage.order)) fail(`${stage.id}: title, lesson_number and order are required`)
    if (stage.status === 'chua_bien_soan') { if (stage.missions?.length) fail(`${stage.id}: an unwritten stage has no missions`); continue }
    if (stage.status !== 'da_bien_soan') fail(`${stage.id}: unknown status ${stage.status}`)
    if (!Array.isArray(stage.pages) || stage.pages.length !== 2 || !Array.isArray(stage.missions) || !stage.missions.length) fail(`${stage.id}: pages and missions are required`)
    if (stage.intro && stage.intro.hu_cau !== true) fail(`${stage.id}: intro by the mascot must be marked hu_cau`)
    const stageCards = new Set()
    for (const mission of stage.missions) {
      unique(mission?.id)
      if (!isText(mission.title) || !isText(mission.objective?.id) || !isText(mission.objective.text)) fail(`${mission.id}: title and objective are required`)
      unique(mission.objective.id)
      if (mission.intro && mission.intro.hu_cau !== true) fail(`${mission.id}: intro by the mascot must be marked hu_cau`)
      if (!isText(mission.reward?.manh_su_ky?.id) || !isText(mission.reward.manh_su_ky.title)) fail(`${mission.id}: reward.manh_su_ky is required`)
      if (mission.video !== undefined) {
        const video = mission.video
        if (!isText(video?.title) || !Array.isArray(video.scenes) || !video.scenes.length) fail(`${mission.id}: video needs a title and scenes`)
        if (video.style !== undefined && !videoStyles.includes(video.style)) fail(`${mission.id}: unknown video style ${video.style}`)
        let seconds = 0
        for (const scene of video.scenes) {
          unique(scene?.id)
          const at = `${scene.id}`
          if (!videoSceneKinds.includes(scene.kind) || !isText(scene.caption) || typeof scene.duration !== 'number' || scene.duration < 4 || scene.duration > 20) fail(`${at}: scene needs a known kind, a caption and 4–20 seconds`)
          if (scene.kind === 'tieu_de' && !isText(scene.title)) fail(`${at}: tieu_de needs a title`)
          if (scene.kind === 'bieu_tuong' && (!Array.isArray(scene.items) || scene.items.length < 2 || scene.items.length > 4 || !scene.items.every((item) => videoIcons.includes(item?.icon) && isText(item.label)))) fail(`${at}: bieu_tuong needs 2–4 items with known icons`)
          if (scene.kind === 'song_nuoc' && (!Array.isArray(scene.labels) || !scene.labels.length || scene.labels.length > 4 || !scene.labels.every(isText))) fail(`${at}: song_nuoc needs 1–4 labels`)
          if (scene.kind === 'tien_hoa' && (!Array.isArray(scene.forms) || !scene.forms.length || scene.forms.length > 3 || scene.forms.some((form, index) => videoForms.indexOf(form) < 0 || (index > 0 && videoForms.indexOf(form) <= videoForms.indexOf(scene.forms[index - 1]))))) fail(`${at}: tien_hoa needs 1–3 forms in evolutionary order`)
          if (scene.kind === 'moc_thoi_gian' && (!Array.isArray(scene.events) || scene.events.length < 2 || scene.events.length > 5 || !scene.events.every((event) => isText(event?.time) && isText(event.label) && (event.form === undefined || videoForms.includes(event.form))))) fail(`${at}: moc_thoi_gian needs 2–5 events with time and label`)
          if (scene.kind === 'phat_hien' && (!Array.isArray(scene.finds) || !scene.finds.length || scene.finds.length > 3 || !scene.finds.every((item) => videoFinds.includes(item?.find) && isText(item.label)))) fail(`${at}: phat_hien needs 1–3 known finds with labels`)
          const cast = scene.cast ?? []
          const allowed = scene.kind === 'song_nuoc' ? videoRiverCast : ['tieu_de', 'bieu_tuong'].includes(scene.kind) ? videoBandCast : []
          if (!Array.isArray(cast) || cast.length > 2 || new Set(cast).size !== cast.length || !cast.every((item) => allowed.includes(item))) fail(`${at}: cast needs 0–2 different scenes from ${allowed.join(', ')}`)
          seconds += scene.duration
          collect(scene, at)
        }
        if (seconds > 120) fail(`${mission.id}: video is longer than 120 seconds`)
      }
      if (!Array.isArray(mission.cards) || !mission.cards.length) fail(`${mission.id}: cards are required`)
      const cardIds = new Set()
      for (const card of mission.cards) {
        unique(card?.id)
        if (!isText(card.text)) fail(`${card.id}: text is required`)
        collect(card, card.id)
        cardIds.add(card.id); stageCards.add(card.id)
      }
      if (!Array.isArray(mission.explore)) fail(`${mission.id}: explore must be a list`)
      for (const [index, activity] of mission.explore.entries()) {
        const where = `${mission.id}.explore[${index}]`
        if (!exploreTypes.includes(activity?.type) || !isText(activity.prompt)) fail(`${where}: type and prompt are required`)
        if (activity.type === 'tu_lieu') { if (!isText(activity.text) || !isText(activity.clue)) fail(`${where}: text and clue are required`); collect(activity, where) }
        if (activity.type === 'dong_thoi_gian') {
          if (!Array.isArray(activity.events) || activity.events.length < 2 || !isText(activity.clue)) fail(`${where}: events and clue are required`)
          activity.events.forEach((event, number) => { if (!isText(event?.time) || !isText(event.label)) fail(`${where}: event ${number} needs time and label`); collect(event, `${where}.events[${number}]`) })
        }
        if (activity.type === 'phong_van' && (!isText(activity.character) || !Array.isArray(activity.suggested_questions))) fail(`${where}: character and suggested_questions are required`)
      }
      if (!Array.isArray(mission.challenge_pool) || mission.challenge_pool.length < journey.rules.challenge.min_variants_per_objective) fail(`${mission.id}: challenge_pool needs >= ${journey.rules.challenge.min_variants_per_objective} equivalent questions`)
      for (const question of mission.challenge_pool) { unique(question?.id); validateQuestion(question, mission.id, cardIds, fail); collect(question, question.id) }
    }
    const check = stage.stage_check
    if (!check || !Array.isArray(check.extra) || !Array.isArray(check.reflection)) fail(`${stage.id}: stage_check needs extra and reflection lists`)
    for (const question of check.extra) { unique(question?.id); validateQuestion(question, `${stage.id}.stage_check`, stageCards, fail); collect(question, question.id) }
    for (const question of check.reflection) {
      unique(question?.id)
      if (question.type !== 'giai_thich' || !isText(question.prompt) || !Array.isArray(question.rubric) || !question.rubric.length || !question.rubric.every(isText) || !isText(question.sample_answer)) fail(`${question.id}: reflection needs prompt, rubric and sample_answer`)
      collect(question, question.id)
    }
    if (stage.collection && (!isText(stage.collection.title) || (stage.collection.badge && (!isText(stage.collection.badge.id) || !isText(stage.collection.badge.title))))) fail(`${stage.id}: collection is incomplete`)
  }
  if (!journey.stages.some((stage) => stage.status === 'da_bien_soan')) fail('at least one stage must be written')
  // No-fabrication guarantee: each quote must still be in the cited chunk of this grade, even after a dataset update.
  for (const [sources, where] of sourceLists) {
    for (const source of sources) {
      const chunk = dataset.chunksById.get(source?.chunk_id)
      if (!chunk || chunk.grade !== journey.grade) fail(`${where}: chunk ${source?.chunk_id} is not in the grade ${journey.grade} dataset`)
      if (!isText(source.quote) || !quoteKey(chunk.text).includes(quoteKey(source.quote))) fail(`${where}: quote is not in chunk ${chunk.chunk_id}: «${String(source.quote).slice(0, 60)}»`)
      if (!Array.isArray(source.pages) || source.pages[0] !== chunk.page_start || source.pages[1] !== chunk.page_end) fail(`${where}: pages do not match chunk ${chunk.chunk_id}`)
    }
  }
  return journey
}

// The learner only needs page references; quotes stay on the server for review and validation.
function publicCopy(value) {
  if (Array.isArray(value)) return value.map(publicCopy)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'source_quote' && key !== 'quote' && key !== 'build').map(([key, item]) => [key, key === 'sources' ? item.map(({ chunk_id: chunkId, lesson_number: lessonNumber, pages }) => ({ chunk_id: chunkId, lesson_number: lessonNumber, pages })) : publicCopy(item)]))
}

/** Silence after a recorded sentence before the next scene starts. */
export const NARRATION_GAP_SECONDS = 0.6

// A recording is attached only while it still matches the caption, so audio and subtitles never disagree.
// The scene then lasts as long as its sentence plus a short gap, instead of the authored estimate.
function attachNarration(journey, narration) {
  for (const stage of journey.stages) for (const mission of stage.missions || []) for (const scene of mission.video?.scenes || []) {
    const entry = narration?.scenes?.[scene.id]
    if (entry?.sha256 !== captionHash(scene.caption) || !/^\/audio\/journeys\/[a-z0-9_]+\/[a-z0-9_.]+\.mp3$/.test(entry.file)) continue
    scene.audio = entry.file
    if (typeof entry.seconds === 'number' && entry.seconds > 0 && entry.seconds < 60) scene.duration = Math.max(4, Math.round((entry.seconds + NARRATION_GAP_SECONDS) * 10) / 10)
  }
  return journey
}

async function readNarration(root, filename) {
  try { return JSON.parse(await readFile(resolve(root, 'narration', filename), 'utf8')) } catch (error) {
    if (error.code === 'ENOENT') return null
    throw new JourneyError(`narration/${filename}: invalid JSON`)
  }
}

export function journeySummary(journey) {
  const written = journey.stages.filter((stage) => stage.status === 'da_bien_soan')
  return { id: journey.id, title: journey.title, grade: journey.grade, book: journey.book, chapter: journey.chapter, stageCount: journey.stages.length, writtenStageCount: written.length, missionCount: written.reduce((count, stage) => count + stage.missions.length, 0) }
}

export async function loadJourneys(dataset, root = process.env.JOURNEY_PATH || defaultJourneyPath) {
  const filenames = (await readdir(root)).filter((name) => name.endsWith('.json')).sort()
  const journeys = new Map()
  for (const filename of filenames) {
    let journey
    try { journey = JSON.parse(await readFile(resolve(root, filename), 'utf8')) } catch { throw new JourneyError(`${filename}: invalid JSON`) }
    if (`${journey.id}.json` !== filename) throw new JourneyError(`${filename}: id must match the file name`)
    validateJourney(journey, dataset)
    journeys.set(journey.id, { summary: journeySummary(journey), public: attachNarration(publicCopy(journey), await readNarration(root, filename)) })
  }
  return journeys
}

const cache = new WeakMap()
export function getJourneys(dataset) {
  if (!cache.has(dataset)) cache.set(dataset, loadJourneys(dataset).catch((error) => { cache.delete(dataset); throw error }))
  return cache.get(dataset)
}

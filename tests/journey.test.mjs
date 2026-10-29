import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadDataset } from '../server/dataset.mjs'
import { handleApi } from '../server/handler.mjs'
import { defaultJourneyPath, JourneyError, validateJourney } from '../server/journeys.mjs'
import {
  answerComplete, checkLength, checkOpen, checkQuestions, clockLabel, correctNeeded, dueMissions, emptyProgress, gradeAnswer, mastery, missionOpen, parseProgress, pickVariant, recordFirstTry, schedule, sceneAt, stageOpen, startAnswer, videoLength, writtenStages, xpFor,
} from '../src/lib/journey.ts'

let dataset, source, server, base
before(async () => {
  dataset = await loadDataset()
  source = JSON.parse(await readFile(resolve(defaultJourneyPath, 'lop6_chuong5.json'), 'utf8'))
  server = createServer((req, res) => handleApi(req, res, async () => dataset))
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  base = `http://127.0.0.1:${server.address().port}/api/`
})
after(async () => { await new Promise((done) => server.close(done)) })
const get = async (path) => { const response = await fetch(`${base}${path}`); return { response, body: await response.json() } }
const copy = () => structuredClone(source)
const sequence = (...values) => { let index = 0; return () => values[index++ % values.length] }

test('the journey API lists journeys by grade and serves page references without textbook quotes', async () => {
  const list = await get('journeys')
  assert.equal(list.response.status, 200)
  assert.deepEqual(list.body.items.map((item) => item.id), ['lop6_chuong1', 'lop6_chuong2', 'lop6_chuong3', 'lop6_chuong4', 'lop6_chuong5'])
  assert.deepEqual({ ...list.body.items[4], title: undefined, book: undefined, chapter: undefined }, { id: 'lop6_chuong5', grade: 6, stageCount: 7, writtenStageCount: 3, missionCount: 13, videoCount: 1, lessons: [{ number: 14, missions: 4, videos: 1 }, { number: 16, missions: 5, videos: 0 }, { number: 18, missions: 4, videos: 0 }], title: undefined, book: undefined, chapter: undefined })
  assert.equal((await get('journeys?grade=7')).body.total, 0)
  const detail = await get('journeys/lop6_chuong5')
  assert.equal(detail.response.status, 200)
  const text = JSON.stringify(detail.body)
  assert.ok(!text.includes('"quote"') && !text.includes('source_quote') && !text.includes('"build"'))
  assert.deepEqual(detail.body.stages[2].missions[0].cards[0].sources[0], { chunk_id: 'LS6_B16_C004', lesson_number: 16, pages: [72, 72] })
  assert.deepEqual(detail.body.rules.review.intervals_days, [1, 3, 7, 14])
  assert.equal((await get('journeys/khong_co')).response.status, 404)
  assert.equal((await get('journeys/lop6_chuong5/extra')).response.status, 404)
})

test('validation rejects fabricated quotes, thin question pools, missing hint cards and unlabelled fiction', () => {
  assert.doesNotThrow(() => validateJourney(copy(), dataset))
  const reject = (change, pattern) => { const journey = copy(); change(journey); assert.throws(() => validateJourney(journey, dataset), (error) => error instanceof JourneyError && pattern.test(error.message)) }
  const mission = (journey) => journey.stages.find((stage) => stage.id === 'b16').missions[0]
  reject((journey) => { mission(journey).cards[0].sources[0].quote = 'Mùa xuân năm 41, Hai Bà Trưng dựng cờ khởi nghĩa' }, /quote is not in chunk/)
  reject((journey) => { mission(journey).cards[0].sources[0].chunk_id = 'LS7_B01_C001' }, /not in the grade 6 dataset/)
  reject((journey) => { mission(journey).cards[0].sources[0].pages = [70, 70] }, /pages do not match/)
  reject((journey) => { mission(journey).challenge_pool.splice(2) }, /challenge_pool needs >= 3/)
  reject((journey) => { mission(journey).challenge_pool[0].hints.card = 'b16_m9.c1' }, /hint card .* does not exist/)
  reject((journey) => { delete mission(journey).challenge_pool[0].hints.narrow }, /every hint level/)
  reject((journey) => { mission(journey).challenge_pool[0].answer = 9 }, /valid answer index/)
  reject((journey) => { mission(journey).intro.hu_cau = false }, /hu_cau/)
  reject((journey) => { delete mission(journey).reward }, /manh_su_ky/)
  reject((journey) => { mission(journey).challenge_pool[1].id = mission(journey).challenge_pool[0].id }, /duplicate id/)
  const video = (journey) => journey.stages[0].missions[0].video
  reject((journey) => { video(journey).scenes[0].kind = 'phim_ai' }, /known kind/)
  reject((journey) => { video(journey).scenes[1].items[0].icon = 'rong' }, /known icons/)
  reject((journey) => { video(journey).scenes[0].duration = 90 }, /4–20 seconds/)
  reject((journey) => { video(journey).scenes[3].sources[0].quote = 'Địa bàn của nước Văn Lang trải dài khắp cả nước' }, /quote is not in chunk/)
})

test('XP follows the journey rules: full on the first try, less after retries, capped after a hint', () => {
  const { rules } = source
  assert.deepEqual([xpFor(rules, 0, false), xpFor(rules, 1, false), xpFor(rules, 2, false), xpFor(rules, 5, false)], [10, 5, 2, 2])
  assert.equal(xpFor(rules, 0, true), 5)
  assert.equal(xpFor(rules, 1, true), 5)
  assert.equal(xpFor(rules, 2, true), 2)
})

test('a Sử Ký piece needs two different first-try questions on two different days; the badge needs every mission', () => {
  const journey = copy()
  const stage = journey.stages.find((item) => item.id === 'b18')
  const [first, ...rest] = stage.missions
  const progress = emptyProgress()
  assert.deepEqual(recordFirstTry(progress, journey, first, first.challenge_pool[0].id, 100), {})
  assert.deepEqual(recordFirstTry(progress, journey, first, first.challenge_pool[1].id, 100), {}, 'same day is not mastery')
  assert.deepEqual(recordFirstTry(progress, journey, first, first.challenge_pool[0].id, 101), { piece: first.reward.manh_su_ky.title })
  assert.equal(mastery(progress, first, journey.rules).mastered, true)
  assert.deepEqual(recordFirstTry(progress, journey, first, first.challenge_pool[2].id, 102), {}, 'a piece is awarded once')
  rest.slice(0, -1).forEach((mission) => { recordFirstTry(progress, journey, mission, mission.challenge_pool[0].id, 100); recordFirstTry(progress, journey, mission, mission.challenge_pool[1].id, 101) })
  const last = rest.at(-1)
  recordFirstTry(progress, journey, last, last.challenge_pool[0].id, 100)
  assert.deepEqual(recordFirstTry(progress, journey, last, last.challenge_pool[1].id, 103), { piece: last.reward.manh_su_ky.title, badge: stage.collection.badge.title })
})

test('spaced review moves through 1, 3, 7, 14 days, goes back to 1 after a mistake and serves at most 5 due items', () => {
  const journey = copy()
  const missions = writtenStages(journey).flatMap((stage) => stage.missions)
  const progress = emptyProgress()
  const [mission] = missions
  const dues = []
  schedule(progress, mission, true, 0, journey.rules); dues.push(progress.objectives[mission.objective.id].due)
  for (const day of [1, 4, 11, 25]) { schedule(progress, mission, true, day, journey.rules); dues.push(progress.objectives[mission.objective.id].due) }
  assert.deepEqual(dues, [1, 4, 11, 25, 39])
  schedule(progress, mission, false, 39, journey.rules)
  assert.equal(progress.objectives[mission.objective.id].due, 40)
  const many = emptyProgress()
  missions.forEach((item, index) => schedule(many, item, true, missions.length - index, journey.rules))
  const due = dueMissions(many, journey, 100)
  assert.equal(due.length, 5)
  assert.deepEqual(due.map((item) => item.id), missions.slice(-5).reverse().map((item) => item.id), 'oldest due first')
  assert.equal(dueMissions(many, journey, 1).length, 0)
})

test('equivalent questions never repeat the last one and prefer questions not yet answered right', () => {
  const journey = copy()
  const mission = writtenStages(journey)[0].missions[0]
  const [a, b, c, d] = mission.challenge_pool.map((question) => question.id)
  const progress = emptyProgress()
  recordFirstTry(progress, journey, mission, a, 1)
  assert.equal(pickVariant(progress, mission, [], () => 0).id, b)
  assert.equal(pickVariant(progress, mission, [b], () => 0).id, c)
  assert.equal(pickVariant(progress, mission, [b, c], () => 0).id, d)
  assert.notEqual(pickVariant(progress, mission, [a, b, c, d], () => 0).id, d, 'after the whole pool the last question is still skipped')
  const stage = writtenStages(journey)[0]
  const drawn = checkQuestions(emptyProgress(), stage, () => 0)
  assert.equal(drawn.length, stage.missions.length + stage.stage_check.extra.length)
  assert.deepEqual(drawn.slice(0, stage.missions.length).map((item) => item.missionId), stage.missions.map((item) => item.id))
})

test('answer sheets are shuffled, never start solved, and grade every question type', () => {
  const journey = copy()
  const questions = writtenStages(journey).flatMap((stage) => [...stage.missions.flatMap((mission) => mission.challenge_pool), ...stage.stage_check.extra])
  for (const type of ['trac_nghiem', 'sap_xep', 'ghep_noi', 'phan_loai']) assert.ok(questions.some((question) => question.type === type), type)
  for (const question of questions) {
    const answer = startAnswer(question, sequence(0.99, 0.01, 0.5))
    if (question.type === 'sap_xep') assert.ok(answer.sequence.some((value, index) => value !== index), `${question.id} starts unsolved`)
    if (question.type !== 'sap_xep') assert.equal(answerComplete(answer), false)
    const solved = question.type === 'trac_nghiem' ? { ...answer, selected: question.answer }
      : question.type === 'sap_xep' ? { ...answer, sequence: question.items.map((_, index) => index) }
      : question.type === 'ghep_noi' ? { ...answer, match: question.pairs.map((_, index) => index) }
      : { ...answer, pick: answer.items.map((item) => item.group) }
    assert.equal(answerComplete(solved), true)
    assert.equal(gradeAnswer(question, solved).ok, true, question.id)
    if (question.type === 'trac_nghiem') {
      const wrong = question.choices.findIndex((_, index) => index !== question.answer)
      const graded = gradeAnswer(question, { ...answer, selected: wrong })
      assert.equal(graded.ok, false)
      assert.equal(graded.why, question.why_wrong?.[String(wrong)])
    } else assert.equal(gradeAnswer(question, question.type === 'sap_xep' ? answer : solved.type === 'ghep_noi' ? { ...solved, match: [...solved.match.slice(1), solved.match[0]] } : { ...solved, pick: solved.pick.map((group) => (group + 1) % answer.groups.length) }).ok, false, `${question.id} wrong answer`)
  }
})

test('stages and missions open in order, the stage check needs every mission, and the teacher switch opens all', () => {
  const journey = copy()
  const [first, second] = writtenStages(journey)
  const progress = emptyProgress()
  assert.equal(stageOpen(progress, journey, first), true)
  assert.equal(stageOpen(progress, journey, second), false)
  assert.equal(stageOpen(progress, journey, journey.stages.find((stage) => stage.status === 'chua_bien_soan')), false, 'unwritten stages never open')
  assert.equal(missionOpen(progress, journey, first, 0), true)
  assert.equal(missionOpen(progress, journey, first, 1), false)
  first.missions.forEach((mission) => { progress.missions[mission.id] = true })
  assert.equal(checkOpen(progress, journey, first), true)
  progress.stages[first.id] = { passed: true, best: 0.9 }
  assert.equal(stageOpen(progress, journey, second), true)
  const fresh = emptyProgress()
  fresh.unlockAll = true
  assert.equal(missionOpen(fresh, journey, second, 3) && checkOpen(fresh, journey, second), true)
})

test('saved progress is parsed defensively', () => {
  assert.deepEqual(parseProgress(null), emptyProgress())
  assert.deepEqual(parseProgress({ v: 2, xp: 50 }), emptyProgress())
  const parsed = parseProgress({ v: 1, xp: -4, dayOffset: 2, unlockAll: 'yes', missions: { a: true, b: 'true' }, objectives: { o: { firstTry: [{ q: 'x', d: 3 }, { q: 1, d: 3 }, 'bad'], box: 1, due: 9, lastQ: 'x' }, broken: 5 }, stages: { s: { passed: true, best: 2 }, t: { passed: true, best: 0.8 } }, pieces: { p: 4, q: 'now' }, clues: { c: true } })
  assert.equal(parsed.xp, 0)
  assert.equal(parsed.dayOffset, 2)
  assert.equal(parsed.unlockAll, false)
  assert.deepEqual(parsed.missions, { a: true })
  assert.deepEqual(parsed.objectives, { o: { firstTry: [{ q: 'x', d: 3 }], box: 1, due: 9, lastQ: 'x' } })
  assert.deepEqual(parsed.stages, { t: { passed: true, best: 0.8 } })
  assert.deepEqual(parsed.pieces, { p: 4 })
  assert.deepEqual(parsed.clues, { c: true })
})

test('Bài 14 opens the journey with a sourced video, and a stage the learner already started stays open', () => {
  const journey = copy()
  const [first, second] = writtenStages(journey)
  assert.equal(first.id, 'b14')
  assert.equal(first.missions.length, 4)
  const video = first.missions[0].video
  assert.equal(video.title, 'Nhà nước Văn Lang ra đời')
  assert.equal(videoLength(video), 51)
  assert.ok(video.scenes.every((scene) => scene.sources.length && scene.sources.every((source) => source.chunk_id.startsWith('LS6_B14_'))))
  assert.deepEqual([0, 6.9, 7, 50, 51, 80].map((t) => sceneAt(video, t).index), [0, 0, 1, 4, 4, 4])
  assert.equal(sceneAt(video, 8).local, 1)
  assert.equal(sceneAt(video, 80).local, video.scenes[4].duration, 'past the end stays on the last frame')
  assert.equal(clockLabel(51), '0:51')
  const progress = emptyProgress()
  assert.equal(stageOpen(progress, journey, second), false)
  progress.missions[second.missions[0].id] = true
  assert.equal(stageOpen(progress, journey, second), true, 'progress made before Bài 14 was published is not locked away')
})

test('recorded narration is attached only to scenes whose caption still matches the recording', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { captionHash, loadJourneys } = await import('../server/journeys.mjs')
  const root = await mkdtemp(resolve(tmpdir(), 'journeys-'))
  try {
    const journey = copy()
    const [s1, s2, s3] = journey.stages[0].missions[0].video.scenes
    await writeFile(resolve(root, 'lop6_chuong5.json'), JSON.stringify(journey))
    await mkdir(resolve(root, 'narration'))
    const entry = (scene, text = scene.caption) => ({ file: `/audio/journeys/lop6_chuong5/${scene.id}.mp3`, sha256: captionHash(text) })
    await writeFile(resolve(root, 'narration', 'lop6_chuong5.json'), JSON.stringify({ scenes: { [s1.id]: entry(s1), [s2.id]: entry(s2, 'lời cũ đã sửa'), [s3.id]: { ...entry(s3), file: 'https://example.com/x.mp3' } } }))
    const scenes = (await loadJourneys(dataset, root)).get('lop6_chuong5').public.stages[0].missions[0].video.scenes
    assert.equal(scenes[0].audio, `/audio/journeys/lop6_chuong5/${s1.id}.mp3`)
    assert.equal(scenes[1].audio, undefined, 'a changed caption must not play the old recording')
    assert.equal(scenes[2].audio, undefined, 'only local audio files are served')
    await writeFile(resolve(root, 'narration', 'lop6_chuong5.json'), '{broken')
    await assert.rejects(loadJourneys(dataset, root), /narration\/lop6_chuong5.json: invalid JSON/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('narrated scenes last as long as their recording plus a short gap, and the recordings are measured correctly', async () => {
  const { mp3Seconds } = await import('../scripts/mp3-duration.mjs')
  const { readFile: read } = await import('node:fs/promises')
  const manifest = JSON.parse(await read(new URL('../data/journeys/narration/lop6_chuong5.json', import.meta.url), 'utf8'))
  for (const [id, entry] of Object.entries(manifest.scenes)) {
    const audio = await read(new URL(`../public${entry.file}`, import.meta.url))
    assert.equal(entry.bytes, audio.length, id)
    assert.equal(mp3Seconds(audio), entry.seconds, id)
    assert.ok(Math.abs(entry.seconds - audio.length * 8 / 64000) < 0.1, `${id} is a 64 kbps MP3`)
  }
  const { body } = await get('journeys/lop6_chuong5')
  const video = body.stages[0].missions[0].video
  for (const scene of video.scenes) {
    const recorded = manifest.scenes[scene.id].seconds
    assert.equal(scene.duration, Math.max(4, Math.round((recorded + 0.6) * 10) / 10), scene.id)
    assert.ok(scene.duration - recorded <= 0.7, `${scene.id} waits at most a short gap after the sentence`)
  }
  assert.deepEqual(video.scenes.map((scene) => scene.cast), [['tu_hop'], ['lam_ruong'], ['dao_muong', 'cam_vu_khi'], ['cheo_thuyen', 'cay_lua'], ['danh_trong']])
  assert.equal(mp3Seconds(Buffer.from('not audio')), 0)
})

test('video people must come from the known animations, at most two per scene, river scenes only boats and planting', () => {
  const reject = (change, pattern) => { const journey = copy(); change(journey.stages[0].missions[0].video.scenes); assert.throws(() => validateJourney(journey, dataset), pattern) }
  reject((scenes) => { scenes[0].cast = ['bay_len_troi'] }, /cast needs/)
  reject((scenes) => { scenes[0].cast = ['tu_hop', 'lam_ruong', 'danh_trong'] }, /cast needs/)
  reject((scenes) => { scenes[0].cast = ['cheo_thuyen'] }, /cast needs/)
  reject((scenes) => { scenes[3].cast = ['tu_hop'] }, /cast needs/)
  assert.doesNotThrow(() => validateJourney(copy(), dataset))
})

test('the grade 6 chapters 1-4 are fully written, sourced from their own lessons, and Chương 3 shows its corrected title', async () => {
  const expected = { lop6_chuong1: [[1, 2, 3], 7], lop6_chuong2: [[4, 5, 6], 8], lop6_chuong3: [[7, 8, 9, 10], 14], lop6_chuong4: [[11, 12, 13], 7] }
  for (const [id, [lessons, missions]] of Object.entries(expected)) {
    const { body } = await get(`journeys/${id}`)
    assert.deepEqual(body.stages.map((stage) => stage.lesson_number), lessons, id)
    assert.ok(body.stages.every((stage) => stage.status === 'da_bien_soan'), `${id} has no unwritten stage`)
    const all = body.stages.flatMap((stage) => stage.missions)
    assert.equal(all.length, missions, id)
    for (const mission of all) {
      assert.ok(mission.challenge_pool.length >= 3, mission.id)
      const stage = body.stages.find((item) => item.missions.includes(mission))
      assert.ok(mission.cards.every((card) => card.sources.every((source) => source.lesson_number === stage.lesson_number)), `${mission.id} cards cite their own lesson`)
    }
  }
  assert.equal((await get('journeys/lop6_chuong3')).body.chapter, 'Chương 3: XÃ HỘI CỔ ĐẠI')
})

test('the Bài 4 video uses the prehistory templates, validated like the others, and lasts about two minutes', async () => {
  const chapter2 = JSON.parse(await readFile(resolve(defaultJourneyPath, 'lop6_chuong2.json'), 'utf8'))
  const prehistory = (change, pattern) => { const journey = structuredClone(chapter2); change(journey.stages.find((stage) => stage.id === 'b4').missions[0].video); assert.throws(() => validateJourney(journey, dataset), pattern) }
  assert.doesNotThrow(() => validateJourney(structuredClone(chapter2), dataset))
  prehistory((video) => { video.scenes.find((scene) => scene.kind === 'tien_hoa' && scene.forms.length === 2).forms.reverse() }, /evolutionary order/)
  prehistory((video) => { video.scenes.find((scene) => scene.kind === 'phat_hien').finds[0].find = 'kho_bau' }, /known finds/)
  prehistory((video) => { video.scenes.find((scene) => scene.kind === 'moc_thoi_gian').events.splice(1) }, /2–5 events/)
  prehistory((video) => { video.scenes.find((scene) => scene.kind === 'tien_hoa').cast = ['ghe_da'] }, /cast needs/)
  prehistory((video) => { video.style = 'hien_dai' }, /unknown video style/)
  const { body } = await get('journeys/lop6_chuong2')
  const video = body.stages[0].missions[0].video
  assert.equal(video.style, 'tien_su')
  assert.equal(video.scenes.length, 13)
  assert.ok(video.scenes.every((scene) => scene.audio && scene.sources.every((source) => source.lesson_number === 4)))
  assert.ok(videoLength(video) >= 100 && videoLength(video) <= 125, `about two minutes, got ${videoLength(video)} s`)
})

test('every Chương 2 mission has a narrated video of about two minutes, quoting Bài 4-6', async () => {
  const { body } = await get('journeys/lop6_chuong2')
  const missions = body.stages.flatMap((stage) => stage.missions)
  assert.deepEqual(missions.map((mission) => mission.video?.id), missions.map((mission) => `${mission.id}.video`))
  for (const mission of missions) {
    const { video } = mission
    assert.ok(video.scenes.length >= 13, `${mission.id} tells its story in many scenes`)
    assert.ok(video.scenes.every((scene) => scene.audio === `/audio/journeys/lop6_chuong2/${scene.id}.mp3`), `${mission.id} is fully narrated`)
    assert.ok(video.scenes.every((scene) => scene.sources.every((source) => [4, 5, 6].includes(source.lesson_number))), `${mission.id} quotes this chapter`)
    assert.ok(videoLength(video) >= 110 && videoLength(video) <= 125, `${mission.id} lasts about two minutes, got ${videoLength(video)} s`)
  }
  assert.equal(missions.find((mission) => mission.id === 'b6_m3').video.style, 'dong_son')
  // The new primitive-society and metal-age drawings are validated like the older ones.
  const chapter2 = JSON.parse(await readFile(resolve(defaultJourneyPath, 'lop6_chuong2.json'), 'utf8'))
  const scenesOf = (journey, id) => journey.stages.flatMap((stage) => stage.missions).find((mission) => mission.id === id).video.scenes
  const reject = (id, change, pattern) => { const journey = structuredClone(chapter2); change(scenesOf(journey, id)); assert.throws(() => validateJourney(journey, dataset), pattern) }
  reject('b6_m3', (scenes) => { scenes.find((scene) => scene.kind === 'song_nuoc').labels.push('Sông Cửu Long') }, /1–4 labels/)
  reject('b5_m3', (scenes) => { scenes.find((scene) => scene.kind === 'phat_hien').finds[0].find = 'vang' }, /known finds/)
  reject('b5_m1', (scenes) => { scenes.find((scene) => scene.kind === 'bieu_tuong').items[0].icon = 'lua_trai' }, /known icons/)
  reject('b6_m1', (scenes) => { scenes[0].cast = ['luyen_kim', 'bay_len_troi'] }, /cast needs/)
})

test('a stage may set its own pass ratio; Bài 1 passes with 2 of its 3 check questions while other stages keep the journey rule', async () => {
  const journey = copy()
  const stage = writtenStages(journey)[0]
  const total = checkLength(stage)
  assert.equal(checkQuestions(emptyProgress(), stage).length, total)
  assert.equal(correctNeeded(journey, stage), Math.ceil(journey.rules.stage_check.pass_ratio * total - 1e-9))
  stage.stage_check.pass_ratio = 0.6
  assert.equal(correctNeeded(journey, stage, 5), 3, '0.6 × 5 stays 3 despite floating point')
  validateJourney(journey, dataset)
  for (const bad of [0, 1.5, '0.6']) {
    stage.stage_check.pass_ratio = bad
    assert.throws(() => validateJourney(journey, dataset), /stage_check.pass_ratio must be in \(0, 1\]/)
  }
  const { body: chapter1 } = await get('journeys/lop6_chuong1')
  const [lesson1, lesson2] = chapter1.stages
  assert.deepEqual([checkLength(lesson1), correctNeeded(chapter1, lesson1)], [3, 2])
  assert.equal(lesson2.stage_check.pass_ratio, undefined)
  assert.equal(correctNeeded(chapter1, lesson2), Math.ceil(0.8 * checkLength(lesson2) - 1e-9))
})

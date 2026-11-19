// Films the product demo: drives the site with Playwright, captures JPEG frames through the DevTools screencast and
// writes scene marks. Each scene lasts at least as long as its narration (durations.json). Setup between scenes is
// not filmed. Usage: SITE=https://… OUT=demo-out node scripts/demo-video/record.mjs
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const SITE = process.env.SITE || 'http://127.0.0.1:5199'
const OUT = process.env.OUT || 'demo-out'
const narration = JSON.parse(readFileSync(new URL('./narration.json', import.meta.url), 'utf8'))
const durations = JSON.parse(readFileSync(`${OUT}/durations.json`, 'utf8'))
mkdirSync(`${OUT}/frames`, { recursive: true })

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
const page = await context.newPage()
page.on('dialog', (dialog) => dialog.accept())
page.setDefaultTimeout(30000)

// A visible cursor and click ripple: a headless screencast shows no pointer.
await context.addInitScript(() => {
  const install = () => {
    if (document.getElementById('demo-cursor')) return
    const style = document.createElement('style')
    style.textContent = `#demo-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);transition:transform .02s}
#demo-cursor svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
.demo-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid rgba(37,99,235,.85);z-index:2147483646;pointer-events:none;animation:demo-ripple .5s ease-out forwards}
@keyframes demo-ripple{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}`
    document.head.appendChild(style)
    const cursor = document.createElement('div')
    cursor.id = 'demo-cursor'
    cursor.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 13.8 L10.6 20.5 L13.4 19.2 L10.3 12.6 L16.5 12.4 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    document.body.appendChild(cursor)
    const saved = JSON.parse(sessionStorage.getItem('demo-cursor') || '[640,360]')
    cursor.style.left = saved[0] + 'px'; cursor.style.top = saved[1] + 'px'
    addEventListener('mousemove', (event) => { cursor.style.left = event.clientX + 'px'; cursor.style.top = event.clientY + 'px'; sessionStorage.setItem('demo-cursor', JSON.stringify([event.clientX, event.clientY])) }, true)
    addEventListener('mousedown', (event) => {
      const ripple = document.createElement('div'); ripple.className = 'demo-ripple'
      ripple.style.left = event.clientX + 'px'; ripple.style.top = event.clientY + 'px'
      document.body.appendChild(ripple); setTimeout(() => ripple.remove(), 600)
    }, true)
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install()
})

// Character voice. ElevenLabs is out of credits, so in the voice scene the speech endpoint is answered with a
// substitute Vietnamese neural voice (edge-tts, labelled "giọng minh hoạ" in the film). Each clip and the moment the
// app starts playing it are recorded so the assembly can put the sound under the picture.
const voiceClips = []
const audioPlays = []
let voiceScene = null
mkdirSync(`${OUT}/voice`, { recursive: true })
await page.exposeFunction('demoAudioPlay', () => { audioPlays.push(Date.now() / 1000) })
const micStarts = []
await page.exposeFunction('demoMicStart', () => { micStarts.push(Date.now() / 1000) })
// The student's spoken question: headless Chromium has no speech recognition, so a stand-in recognizer types the
// scripted question word by word while the student's recorded voice is laid under the picture.
await context.addInitScript(() => {
  class DemoRecognition {
    start() {
      const text = (window.__demoSpeechQueue || []).shift() || ''
      const ms = window.__demoSpeechMs || 2500
      const words = text.split(' ')
      window.demoMicStart?.()
      setTimeout(() => this.onspeechstart?.(), 250)
      words.forEach((_, index) => setTimeout(() => this.onresult?.({ results: [[{ transcript: words.slice(0, index + 1).join(' ') }]] }), 300 + ms * (index + 1) / words.length))
      this.timer = setTimeout(() => { this.onspeechend?.(); this.onend?.() }, ms + 700)
    }
    stop() { clearTimeout(this.timer); this.onend?.() }
    abort() { clearTimeout(this.timer) }
  }
  window.SpeechRecognition = DemoRecognition
  window.webkitSpeechRecognition = DemoRecognition
})
await context.addInitScript(() => {
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (...args) { if (this.src?.startsWith('blob:')) window.demoAudioPlay?.(); return play.apply(this, args) }
})
await page.route('**/api/characters/*/speech', async (route) => {
  if (!voiceScene) return route.continue()
  const text = JSON.parse(route.request().postData() || '{}').text || ''
  const file = `${OUT}/voice/${voiceClips.length + 1}.mp3`
  const made = process.env.DEMO_FAKE_VOICE
    ? spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=6', file], { encoding: 'utf8' })
    : spawnSync('edge-tts', ['--voice', 'vi-VN-NamMinhNeural', '--text', text, '--write-media', file], { encoding: 'utf8' })
  if (made.status !== 0) { console.error('[voice] edge-tts failed', made.stderr); return route.continue() }
  // The narration of the scene finishes before the character speaks.
  const ready = voiceScene.start + voiceScene.narration + 0.4
  if (Date.now() / 1000 < ready) await new Promise((resolve) => setTimeout(resolve, (ready - Date.now() / 1000) * 1000))
  voiceClips.push({ file, requested: Date.now() / 1000 })
  await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: readFileSync(file) })
})

// Screencast: every painted frame with its timestamp.
const frames = []
const cdp = await context.newCDPSession(page)
let frameNo = 0
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = `${OUT}/frames/${String(frameNo++).padStart(6, '0')}.jpg`
  writeFileSync(file, Buffer.from(data, 'base64'))
  frames.push({ t: metadata.timestamp, file })
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 })

const wait = (ms) => page.waitForTimeout(ms)
let mouse = { x: 640, y: 360 }
async function moveTo(locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) throw new Error('no box')
  const x = box.x + box.width / 2, y = box.y + Math.min(box.height / 2, 24)
  const steps = Math.max(8, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 18))
  await page.mouse.move(x, y, { steps }); mouse = { x, y }
  await wait(180)
}
async function click(locator) { await moveTo(locator); await page.mouse.down(); await page.mouse.up(); await wait(450) }
async function type(locator, text) { await click(locator); await locator.pressSequentially(text, { delay: 45 }) }
async function smoothScroll(y, ms = 1200) {
  await page.evaluate(([y]) => window.scrollTo({ top: y, behavior: 'smooth' }), [y]); await wait(ms)
}
async function scrollBy(dy, steps = 10, pause = 60) { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await wait(pause) } await wait(300) }
async function drag(from, to) {
  await moveTo(from)
  await page.mouse.down()
  const target = await to.boundingBox()
  const y = target.y + 6
  const steps = 22
  for (let i = 1; i <= steps; i++) { await page.mouse.move(mouse.x, mouse.y + (y - mouse.y) * i / steps); await wait(18) }
  mouse = { x: mouse.x, y }
  await page.mouse.up(); await wait(450)
}

const marks = []
const failures = []
async function scene(id, run) {
  const item = narration.find((entry) => entry.id === id)
  const start = Date.now() / 1000
  try { await run() } catch (error) { failures.push(`${id}: ${error.message.split('\n')[0]}`); console.error(`[${id}]`, error.message.split('\n')[0]) }
  const need = (durations[id] || 3) + 0.6
  const spent = Date.now() / 1000 - start
  if (spent < need) await wait((need - spent) * 1000)
  marks.push({ id, title: item?.title || id, start, end: Date.now() / 1000 })
  console.log(`scene ${id}: ${(Date.now() / 1000 - start).toFixed(1)} s (narration ${durations[id]?.toFixed(1)} s)`)
}
async function setup(run) { try { await run() } catch (error) { failures.push(`setup: ${error.message.split('\n')[0]}`); console.error('[setup]', error.message.split('\n')[0]) } }

const role = (name) => page.locator('.login-role label').filter({ hasText: name })
async function signIn(roleName) {
  await page.goto(`${SITE}/dang-nhap`); await wait(800)
  await click(role(roleName))
  await click(page.getByRole('button', { name: 'Điền tài khoản mẫu' }))
  await click(page.locator('.login-form button[type=submit]'))
}
async function signOut() {
  const staff = page.getByRole('button', { name: /^Tài khoản: / })
  if (await staff.count()) { await staff.first().click(); await page.getByRole('button', { name: 'Đăng xuất' }).first().click() } else {
    await page.getByRole('button', { name: 'Tài khoản' }).first().click(); await page.getByRole('link', { name: 'Đăng xuất' }).first().click()
  }
  await page.waitForURL(/\/$/)
}

// Answers a journey question correctly from the journey file, with visible clicks and drags.
let journey
const allQuestions = () => journey.stages.flatMap((stage) => [...stage.missions.flatMap((mission) => mission.challenge_pool), ...(stage.stage_check?.extra || [])])
const modal = () => page.locator('dialog.journey-modal')
async function answerShown() {
  const prompt = (await modal().locator('.journey-prompt').first().textContent()).trim()
  const question = allQuestions().find((item) => item.prompt === prompt)
  if (!question) throw new Error(`unknown question ${prompt}`)
  const sheet = modal()
  if (question.type === 'trac_nghiem') await click(sheet.getByRole('radio', { name: question.choices[question.answer], exact: true }))
  if (question.type === 'sap_xep') {
    for (const [target, item] of question.items.entries()) {
      const current = (await sheet.locator('.journey-order li > span:nth-child(2)').allTextContents()).indexOf(item)
      if (current > target) await drag(sheet.locator('.journey-order li').nth(current).locator('.sortable-handle'), sheet.locator('.journey-order li').nth(target))
    }
  }
  if (question.type === 'ghep_noi') for (const [left, right] of question.pairs) { const select = sheet.getByLabel(left, { exact: true }); await moveTo(select); await select.selectOption({ label: right }); await wait(250) }
  if (question.type === 'phan_loai') for (const [group, items] of Object.entries(question.groups)) for (const item of items) await click(sheet.getByRole('group', { name: item, exact: true }).getByRole('button', { name: group, exact: true }))
  await click(sheet.getByRole('button', { name: 'Kiểm tra', exact: true }))
}

// ---------------------------------------------------------------- the film
await page.goto(SITE + '/'); await wait(2500)
journey = await (await page.request.get(`${SITE}/api/journeys/lop6_chuong5`)).json()

await scene('s1', async () => {
  await wait(1800)
  await scrollBy(700, 14, 90); await wait(1200)
  await scrollBy(900, 14, 90); await wait(1500)
  await scrollBy(900, 14, 90); await wait(1500)
  await smoothScroll(0, 1500)
})

let code = ''
await scene('s2', async () => {
  await signIn('Giáo viên')
  await page.waitForURL(/\/giao-vien$/); await wait(1200)
  await type(page.getByLabel('Tên lớp'), '6A1')
  const grade = page.getByLabel('Khối'); await moveTo(grade); await grade.selectOption('6'); await wait(300)
  await click(page.getByRole('button', { name: 'Tạo lớp' }))
  await page.locator('.staff-notice').waitFor(); await wait(800)
  const lesson = page.getByLabel(/Bài học SGK lớp 6/); await moveTo(lesson); await lesson.selectOption('LS6_B14'); await wait(500)
  await click(page.getByRole('button', { name: 'Giao bài' })); await wait(800)
  code = (await page.locator('.staff-code-button span').first().textContent()).trim()
  await moveTo(page.locator('.staff-code-button').first()); await wait(1500)
  await click(page.getByRole('listitem').filter({ hasText: 'Lớp 7A1' }))
  await moveTo(page.locator('#students')); await wait(1200)
  await moveTo(page.getByRole('button', { name: 'Xuất CSV' })); await wait(800)
})

await setup(async () => { await signOut(); await page.goto(`${SITE}/dang-nhap`); await wait(1000) })

await scene('s3', async () => {
  await click(page.getByRole('button', { name: 'Điền tài khoản mẫu' }))
  await click(page.locator('.login-form button[type=submit]'))
  await click(page.locator('.grade-onboarding').getByRole('button', { name: 'Lớp 6' }))
  await click(page.locator('.grade-onboarding .button-primary'))
  await page.waitForURL(/\/home/); await wait(1500)
  await type(page.locator('#join-code'), code)
  await click(page.getByRole('button', { name: 'Tham gia lớp', exact: true }))
  await moveTo(page.locator('.student-class-panel')); await wait(1500)
  await smoothScroll(0, 800)
  await click(page.getByRole('button', { name: /^Thông báo/ })); await wait(2500)
})

await scene('s3b', async () => {
  await page.keyboard.press('Escape'); await wait(400)
  const plan = page.locator('#study-plan-title')
  if (await plan.isVisible().catch(() => false)) { await moveTo(plan); await wait(1500) } else console.log('[s3b] plan hidden')
  const lessons = page.locator('.dashboard-lesson-grid > *:visible')
  const count = await lessons.count()
  console.log('[s3b] lessons', count)
  for (let index = 0; index < Math.min(3, count); index++) { await moveTo(lessons.nth(index)); await wait(900) }
  await smoothScroll(0, 900)
  await type(page.locator('.dashboard-search input'), 'van lang')
  await page.keyboard.press('Enter')
  await page.getByRole('region', { name: 'Kết quả tìm kiếm' }).waitFor(); await wait(1200)
  await moveTo(page.getByRole('region', { name: 'Kết quả tìm kiếm' })); await wait(2500)
})

await scene('s4', async () => {
  await page.keyboard.press('Escape'); await wait(300)
  const close = page.getByRole('button', { name: 'Đóng kết quả tìm kiếm' })
  if (await close.isVisible().catch(() => false)) { await close.click(); await wait(300) }
  await click(page.getByRole('button', { name: /Mở bài được giao: Nhà nước Văn Lang/ }))
  await page.locator('#dataset-reader-title').waitFor(); await wait(1500)
  await scrollBy(500, 10, 80); await wait(1200)
  await scrollBy(600, 10, 80); await wait(1000)
  const note = page.locator('#dataset-note')
  if (await note.count()) await type(note, 'Văn Lang là nhà nước đầu tiên của người Việt, kinh đô ở Phong Châu.')
  await wait(800)
})

await setup(async () => { await page.keyboard.press('Escape'); await page.goto(`${SITE}/home#journey`); await page.reload(); await wait(1800) })

await scene('s5', async () => {
  const chapter = page.getByRole('navigation', { name: 'Chọn chương' }).getByRole('button', { name: /Hành trình giữ nước/ })
  await click(chapter); await wait(1200)
  await click(page.locator('#journey').getByRole('button', { name: /Nhà nước Văn Lang ra đời/ }))
  await wait(1200)
  await click(modal().getByRole('button', { name: 'Nhận nhiệm vụ' }))
  await click(modal().getByRole('button', { name: /Xem video/ }))
  await wait(7000)
  // Jump to the last scene of the video and let it finish.
  const scenes = modal().getByRole('button', { name: /^Cảnh \d+$/ })
  await click(scenes.last()); await wait(400)
  const play = modal().getByRole('button', { name: 'Phát video' })
  if (await play.count()) await click(play)
  await modal().getByRole('button', { name: 'Xem thẻ kiến thức' }).waitFor({ timeout: 40000 })
  await click(modal().getByRole('button', { name: 'Xem thẻ kiến thức' }))
  await wait(1500)
  for (let card = 1; card < 4; card++) { await click(modal().getByRole('button', { name: 'Thẻ tiếp' })); await wait(700) }
  await click(modal().getByRole('button', { name: 'Đi khám phá' }))
  await click(modal().getByRole('button', { name: 'Tìm manh mối' })); await wait(1000)
  await click(modal().getByRole('button', { name: 'Vào thử thách' })); await wait(800)
  await answerShown(); await wait(1500)
  await click(modal().getByRole('button', { name: 'Câu tiếp theo' })); await wait(600)
  await answerShown(); await wait(1500)
})

await setup(async () => {
  await page.keyboard.press('Escape')
  await page.evaluate(() => {
    const key = 'xuyen-su-ky-journey-v1'
    const all = JSON.parse(localStorage.getItem(key) || '{}')
    all.lop6_chuong5 = { ...(all.lop6_chuong5 || { v: 1, xp: 0, dayOffset: 0, missions: {}, objectives: {}, stages: {}, pieces: {}, badges: {}, clues: {} }), unlockAll: true }
    localStorage.setItem(key, JSON.stringify(all))
  })
  await page.reload(); await wait(1500)
  await page.getByRole('navigation', { name: 'Chọn chương' }).getByRole('button', { name: /Hành trình giữ nước/ }).click(); await wait(800)
  await page.locator('#journey .journey-stage').first().scrollIntoViewIfNeeded()
})

// The stage check itself is answered off camera (scene 5 already shows the challenges); filming starts at its result.
await setup(async () => {
  await page.locator('#journey .journey-stage').first().getByRole('button', { name: /Kiểm tra cuối chặng/ }).click()
  await wait(600)
  for (let index = 0; index < 10; index++) {
    await answerShown()
    const next = modal().getByRole('button', { name: /^(Câu tiếp|Xem điểm)$/ })
    const label = (await next.textContent()).trim()
    await next.click(); await wait(200)
    if (label === 'Xem điểm') break
  }
  await wait(800)
})

await scene('s6', async () => {
  await wait(1500)
  await click(modal().getByRole('button', { name: 'Câu hỏi suy ngẫm' })); await wait(1200)
  await type(modal().locator('.journey-reflection textarea').first(), 'Vì người Việt biết ơn các Vua Hùng đã có công dựng nước Văn Lang. Uống nước nhớ nguồn.')
  await click(modal().getByRole('button', { name: 'So với bài mẫu' }).first())
  await moveTo(modal().locator('.journey-rubric').first()); await wait(1500)
  await moveTo(modal().locator('.journey-clue').first()); await wait(1200)
})

await setup(async () => { await page.keyboard.press('Escape'); await page.goto(`${SITE}/home#characters`); await wait(1500) })

const card = (name) => page.locator('.character-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
await scene('s7', async () => {
  await click(card('Hai Bà Trưng').getByRole('button', { name: 'Nhắn tin', exact: true }))
  await page.getByRole('dialog').waitFor(); await wait(800)
  await type(page.locator('#chat-input'), 'Vì sao hai bà khởi nghĩa?')
  await page.keyboard.press('Enter')
  await page.locator('.chat-answer').last().waitFor()
  await page.waitForFunction(() => !document.querySelector('.chat-loading, .chat-typing, [aria-busy="true"]'), null, { timeout: 45000 }).catch(() => {})
  await wait(1500)
  await moveTo(page.locator('.chat-answer').last()); await wait(2500)
  const sources = page.locator('.chat-sources').last()
  if (await sources.count()) { await moveTo(sources); await wait(2500) }
})

// Two questions asked by voice in the "Nói chuyện" mode and answered aloud, each in full before the next.
const studentClips = []
function studentVoice(text) {
  const file = `${OUT}/voice/student-${studentClips.length + 1}.mp3`
  const made = process.env.DEMO_FAKE_VOICE
    ? spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=2.5', file])
    : spawnSync('edge-tts', ['--voice', 'vi-VN-HoaiMyNeural', '--pitch=+25Hz', '--rate=+6%', '--text', text, '--write-media', file])
  if (made.status !== 0) throw new Error('student voice failed')
  const seconds = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim())
  studentClips.push({ file, seconds })
  return { file, ms: Math.round(seconds * 1000) }
}
async function askBySpeaking(question) {
  const clip = studentVoice(question)
  await page.evaluate(([text, ms]) => { window.__demoSpeechQueue = [text]; window.__demoSpeechMs = ms }, [question, clip.ms])
  const before = audioPlays.length
  await click(page.getByRole('button', { name: 'Nói câu hỏi' }))
  await wait(clip.ms + 1300)
  await click(page.getByRole('button', { name: 'Gửi câu hỏi' }))
  const started = Date.now()
  while (audioPlays.length <= before && Date.now() - started < 60000) await wait(300)
  if (audioPlays.length <= before) { console.error('[voice] no playback for', question); return }
  await wait(1500)
  while (await page.getByRole('button', { name: 'Dừng đọc' }).count() && Date.now() - started < 120000) await wait(300)
  await wait(900)
}

await scene('s8a', async () => {
  voiceScene = { start: Date.now() / 1000, narration: durations.s8a || 6 }
  await page.keyboard.press('Escape'); await wait(500)
  await click(card('Trần Hưng Đạo').getByRole('button', { name: 'Nhắn tin', exact: true }))
  await page.getByRole('dialog').waitFor(); await wait(600)
  await click(page.getByRole('dialog').getByRole('button', { name: 'Nói chuyện', exact: true }))
  await wait(900)
  const perQuestion = page.getByRole('button', { name: 'Hỏi từng câu bằng mic' })
  if (await perQuestion.count()) await click(perQuestion.first())
  await wait(700)
  const autoRead = page.getByLabel('Tự đọc câu trả lời')
  if (await autoRead.count() && !(await autoRead.isChecked())) await click(autoRead)
  // Narration first, then the student speaks.
  const ready = voiceScene.start + voiceScene.narration + 0.3
  if (Date.now() / 1000 < ready) await wait((ready - Date.now() / 1000) * 1000)
  await askBySpeaking('Hịch tướng sĩ nói về điều gì?')
  await askBySpeaking('Vì sao quân dân nhà Trần thắng được giặc mạnh?')
  voiceScene = null
})

await scene('s8', async () => {
  const autoRead = page.getByLabel('Tự đọc câu trả lời')
  if (await autoRead.isChecked().catch(() => false)) await autoRead.uncheck()
  await click(page.getByRole('dialog').getByRole('button', { name: 'Nhắn tin', exact: true })); await wait(800)
  await type(page.locator('#chat-input'), 'Ông có biết Bác Hồ là ai không?')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Trò chuyện với Hồ Chí Minh' }).waitFor({ timeout: 45000 })
  await wait(1000)
  await moveTo(page.getByRole('button', { name: 'Trò chuyện với Hồ Chí Minh' })); await wait(1500)
})

await setup(async () => { await page.keyboard.press('Escape'); await page.goto(`${SITE}/`); await wait(1200); await page.locator('.game-card-bottom button').first().scrollIntoViewIfNeeded(); await wait(600) })

const milestones = ['Hai Bà Trưng khởi nghĩa', 'Ngô Quyền chiến thắng trên sông Bạch Đằng', 'Lý Công Uẩn dời đô về Thăng Long', 'Nhà Trần chiến thắng Bạch Đằng', 'Quang Trung đại phá quân Thanh']
await scene('s9', async () => {
  await click(page.locator('.game-card-bottom button').first())
  await page.getByRole('dialog').waitFor(); await wait(800)
  const rows = page.locator('.timeline-puzzle li')
  for (const [target, label] of milestones.entries()) {
    const current = (await rows.allTextContents()).findIndex((text) => text.includes(label))
    if (current > target) await drag(rows.nth(current).locator('.sortable-handle'), rows.nth(target))
  }
  await click(page.getByRole('button', { name: 'Kiểm tra dòng sử' })); await wait(2000)
})

await setup(async () => { await page.keyboard.press('Escape'); await page.goto(`${SITE}/home`); await wait(800); await signOut() })

await scene('s10', async () => {
  await signIn('Quản trị viên')
  await page.waitForURL(/\/admin$/); await wait(1500)
  await moveTo(page.locator('#requests')); await wait(800)
  await click(page.locator('#requests').getByRole('button', { name: /^Duyệt / }).first()); await wait(1200)
  await moveTo(page.locator('#users')); await wait(1200)
  await moveTo(page.locator('#audit')); await wait(1500)
})

await setup(async () => { await page.goto(`${SITE}/`); await wait(1500) })
await scene('s11', async () => { await wait(1000); await page.mouse.move(1180, 680, { steps: 10 }) })

await cdp.send('Page.stopScreencast')
await browser.close()
const clips = [
  ...voiceClips.map((clip, index) => ({ file: clip.file, at: audioPlays[index] })).filter((clip) => clip.at),
  ...studentClips.map((clip, index) => ({ file: clip.file, at: micStarts[index] ? micStarts[index] + 0.3 : null })).filter((clip) => clip.at),
]
writeFileSync(`${OUT}/marks.json`, JSON.stringify({ marks, frames, failures, clips, voiceClips, audioPlays, micStarts }, null, 1))
console.log(failures.length ? `FAILURES:\n${failures.join('\n')}` : 'all scenes ok')

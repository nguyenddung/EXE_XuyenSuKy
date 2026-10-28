import { expect, test, type Locator, type Page } from '@playwright/test'

const journeyKey = 'xuyen-su-ky-journey-v1'
type Question = { id: string; type: string; prompt: string; choices?: string[]; answer?: number; items?: string[]; pairs?: [string, string][]; groups?: Record<string, string[]> }
type Journey = { stages: { id: string; status: string; missions: { id: string; title: string; challenge_pool: Question[] }[]; stage_check?: { extra: Question[] } }[] }

let journey: Journey
const questions = () => journey.stages.flatMap((stage) => [...stage.missions.flatMap((mission) => mission.challenge_pool), ...(stage.stage_check?.extra || [])])
const modal = (page: Page) => page.locator('dialog.journey-modal')

async function shownQuestion(page: Page) {
  const prompt = (await modal(page).locator('.journey-prompt').first().textContent())!.trim()
  const question = questions().find((item) => item.prompt === prompt)
  if (!question) throw new Error(`Unknown question: ${prompt}`)
  return question
}

/** Fills the answer sheet correctly using the journey file, whatever order the choices were shuffled into. */
async function answer(page: Page, question: Question) {
  const sheet = modal(page)
  if (question.type === 'trac_nghiem') await sheet.getByRole('radio', { name: question.choices![question.answer!], exact: true }).click()
  if (question.type === 'sap_xep') {
    for (const [target, item] of question.items!.entries()) {
      const current = (await sheet.locator('.journey-order li > span:nth-child(2)').allTextContents()).indexOf(item)
      for (let step = current; step > target; step--) await sheet.getByRole('button', { name: `Đưa lên: ${item}`, exact: true }).click()
    }
  }
  if (question.type === 'ghep_noi') for (const [left, right] of question.pairs!) await sheet.getByLabel(left, { exact: true }).selectOption({ label: right })
  if (question.type === 'phan_loai') for (const [group, items] of Object.entries(question.groups!)) for (const item of items) await sheet.getByRole('group', { name: item, exact: true }).getByRole('button', { name: group, exact: true }).click()
  await sheet.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
}

async function answerWrong(page: Page, question: Question) {
  const sheet = modal(page)
  if (question.type === 'trac_nghiem') await sheet.getByRole('radio', { name: question.choices!.find((_, index) => index !== question.answer)!, exact: true }).click()
  else if (question.type === 'ghep_noi') for (const [index, [left]] of question.pairs!.entries()) await sheet.getByLabel(left, { exact: true }).selectOption({ label: question.pairs![(index + 1) % question.pairs!.length][1] })
  else if (question.type === 'phan_loai') { const names = Object.keys(question.groups!); for (const [group, items] of Object.entries(question.groups!)) for (const item of items) await sheet.getByRole('group', { name: item, exact: true }).getByRole('button', { name: names[(names.indexOf(group) + 1) % names.length], exact: true }).click() }
  await sheet.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
}

/** Opens the Chương 5 journey (Văn Lang to Bạch Đằng), choosing it in the chapter picker when another chapter is shown. */
async function openJourney(page: Page) {
  await page.goto('/home#journey')
  const chapter5 = page.getByRole('navigation', { name: 'Chọn chương' }).getByRole('button', { name: /Hành trình giữ nước/ })
  await chapter5.click()
  await expect(chapter5).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Hành trình giữ nước: từ Văn Lang đến Bạch Đằng' })).toBeVisible()
  return page.locator('#journey')
}
const missionButton = (section: Locator, title: string) => section.getByRole('button', { name: new RegExp(title) })

test.beforeAll(async ({ request }) => { journey = await (await request.get('/api/journeys/lop6_chuong5')).json() })
test.beforeEach(async ({ page }) => {
  // Seeded randomness keeps the picked variants stable between runs; the helpers still read whatever is shown.
  await page.addInitScript(() => { let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 } })
})

test('a mission teaches first, supports mistakes with hints and an equivalent question, and rewards effort with XP', async ({ page }) => {
  const section = await openJourney(page)
  await expect(section.locator('.journey-stage.is-soon')).toHaveCount(4)
  await expect(section.locator('.journey-stage.is-locked')).toHaveCount(2)
  await expect(section.locator('.journey-stage.is-locked').first()).toContainText('Năm ngọn lửa khởi nghĩa')
  await expect(missionButton(section, 'Bộ máy nhà nước Văn Lang')).toBeDisabled()
  await expect(section.getByRole('button', { name: /Kiểm tra cuối chặng/ }).first()).toBeDisabled()

  await missionButton(section, 'Nhà nước Văn Lang ra đời').click()
  await expect(page.locator('#journey-modal-title')).toBeFocused()
  await expect(modal(page)).toContainText('lời dẫn truyện, hư cấu')
  await modal(page).getByRole('button', { name: 'Nhận nhiệm vụ' }).click()

  // The video comes before the cards: captions carry the textbook page; seeking and scene buttons move the story.
  // With recorded narration each scene lasts as long as its sentence plus a short gap (33 s instead of the authored 51 s).
  await expect(modal(page).locator('.journey-eyebrow').first()).toHaveText('Video · 0:33')
  await expect(modal(page).locator('.journey-video-caption')).toContainText('Vào khoảng thế kỉ VII trước Công nguyên')
  await expect(modal(page).locator('.journey-video-caption small')).toHaveText('SGK tr. 62')
  await modal(page).getByRole('button', { name: /Xem video · 0:33/ }).click()
  await expect(modal(page).getByRole('button', { name: 'Tạm dừng video' })).toBeVisible()
  await expect.poll(() => modal(page).getByRole('slider', { name: 'Tua video' }).inputValue().then(Number)).toBeGreaterThan(0.5)
  await modal(page).getByRole('button', { name: 'Tạm dừng video' }).click()
  await modal(page).getByRole('button', { name: 'Cảnh 4' }).click()
  await expect(modal(page).getByRole('button', { name: 'Cảnh 4' })).toHaveAttribute('aria-current', 'step')
  await expect(modal(page).locator('.journey-video-caption')).toContainText('lưu vực các dòng sông lớn ở Bắc Bộ và Bắc Trung Bộ')
  await expect(modal(page).locator('svg[role="img"]')).toHaveAttribute('aria-label', 'Nhà nước Văn Lang ra đời, cảnh 4/5')
  // With narration the last scene waits for its recorded sentence; without it the video ends on time.
  await modal(page).getByRole('button', { name: 'Thuyết minh' }).click()
  const length = Number(await modal(page).getByRole('slider', { name: 'Tua video' }).getAttribute('max'))
  expect(length).toBeCloseTo(33.4, 1)
  await modal(page).getByRole('slider', { name: 'Tua video' }).fill((length - 0.5).toFixed(1))
  await expect(modal(page).locator('.journey-video-caption')).toContainText('mở ra thời kì dựng nước đầu tiên')
  await modal(page).getByRole('button', { name: 'Phát video' }).click()
  await expect(modal(page).getByRole('button', { name: 'Xem lại' })).toBeVisible()
  await modal(page).getByRole('button', { name: 'Xem thẻ kiến thức' }).click()

  await expect(modal(page)).toContainText('Thẻ kiến thức 1/4')
  await expect(modal(page)).toContainText('SGK tr. 62')
  await expect(modal(page).getByRole('button', { name: 'Xem lại video' })).toBeVisible()
  for (let card = 1; card < 4; card++) await modal(page).getByRole('button', { name: 'Thẻ tiếp' }).click()
  await modal(page).getByRole('button', { name: 'Đi khám phá' }).click()
  await modal(page).getByRole('button', { name: 'Tìm manh mối' }).click()
  await expect(modal(page).locator('.journey-clue')).toContainText('Vua Hùng')
  await modal(page).getByRole('button', { name: 'Vào thử thách' }).click()

  // Two mistakes: hint 1, then hint 2 with the knowledge card and a switch to an equivalent question.
  const first = await shownQuestion(page)
  await answerWrong(page, first)
  await expect(modal(page).locator('.journey-feedback')).toContainText('Chưa đúng.')
  await expect(modal(page).locator('.journey-hints')).toContainText('Gợi ý 1')
  await answerWrong(page, first)
  await expect(modal(page).locator('.journey-hints')).toContainText('Gợi ý 2 · xem lại thẻ kiến thức')
  await modal(page).getByRole('button', { name: 'Thử câu tương đương' }).click()
  const swapped = await shownQuestion(page)
  expect(swapped.id).not.toBe(first.id)
  await answer(page, swapped)
  await expect(modal(page).locator('.journey-feedback')).toContainText('Chính xác! +2 XP')
  await modal(page).getByRole('button', { name: 'Câu tiếp theo' }).click()
  await answer(page, await shownQuestion(page))
  await expect(modal(page).locator('.journey-feedback')).toContainText('Chính xác! +10 XP')
  await modal(page).getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(modal(page).locator('.journey-big')).toHaveText('+32 XP')
  await expect(modal(page)).toContainText('Đúng ngay lần đầu ở 1/2 câu khác nhau, trong 1/2 ngày khác nhau.')
  await expect(modal(page).locator('.journey-piece')).not.toHaveClass(/is-owned/)
  await expect(modal(page).getByRole('button', { name: /Nhiệm vụ tiếp: Bộ máy nhà nước Văn Lang/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal(page)).toHaveCount(0)

  await expect(missionButton(section, 'Nhà nước Văn Lang ra đời')).toContainText('Hoàn thành')
  await expect(missionButton(section, 'Bộ máy nhà nước Văn Lang')).toBeEnabled()
  await expect(section.locator('.journey-bar')).toContainText('32 XP hành trình')
  await expect(page.locator('.dashboard-progress-stats')).toContainText('32')
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).lop6_chuong5, journeyKey)
  expect(saved.missions).toEqual({ b14_m1: true })
  expect(saved.objectives['b14_m1.o'].due).toBe(saved.objectives['b14_m1.o'].firstTry[0].d + 1)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xuyen-su-ky-journal-v1')!).events.map((event: { id: string }) => event.id))).toContain('journey:b14_m1')
})

test('review on another day grants mastery and the Sử Ký piece; the stage check opens the next stage', async ({ page }) => {
  const day = 20000
  await page.addInitScript(([key, today]) => localStorage.getItem(key) || localStorage.setItem(key, JSON.stringify({ lop6_chuong5: { v: 1, xp: 32, dayOffset: 0, unlockAll: false, missions: { b16_m1: true }, objectives: { 'b16_m1.o': { firstTry: [{ q: 'b16_m1.q2', d: today as number }], box: 0, due: (today as number) + 1, lastQ: 'b16_m1.q2' } }, stages: {}, pieces: {}, badges: {}, clues: {} } })), [journeyKey, day] as const)
  await page.clock.install({ time: new Date('2024-10-04T03:00:00Z') }) // day number 20000 in Vietnam time
  const section = await openJourney(page)
  await expect(section.getByRole('button', { name: 'Ôn tập', exact: true })).toBeVisible()

  await section.locator('.journey-tools summary').click()
  await section.getByRole('button', { name: 'Sang ngày hôm sau' }).click()
  await expect(page.locator('.toast')).toContainText('có 1 nhiệm vụ cần ôn')
  await section.getByRole('button', { name: 'Ôn tập · 1' }).click()
  const review = await shownQuestion(page)
  expect(review.id).not.toBe('b16_m1.q2')
  await answer(page, review)
  await expect(modal(page).locator('.journey-feedback')).toContainText('Đúng! +10 XP')
  await expect(page.locator('.toast')).toContainText('Đã nắm vững! Nhận Mảnh Sử Ký: Hai Bà Trưng')
  await modal(page).getByRole('button', { name: 'Tiếp' }).click()
  await expect(modal(page)).toContainText('Ôn tập xong')
  await page.keyboard.press('Escape')
  await expect(missionButton(section, 'Hai Bà Trưng dựng cờ khởi nghĩa')).toContainText('Nắm vững')
  await expect(section.locator('.journey-bar')).toContainText('1/13 mảnh Sử Ký')
  await section.getByRole('button', { name: 'Bộ sưu tập' }).click()
  await expect(modal(page).getByLabel('Mảnh Sử Ký: Hai Bà Trưng: đã nhận')).toBeVisible()
  await expect(modal(page).getByLabel('Mảnh Sử Ký: Bà Triệu: chưa nhận')).toBeVisible()
  await page.keyboard.press('Escape')

  // The teacher switch opens the stage check; a perfect score passes the stage and unlocks the next one.
  await section.getByLabel('Mở khoá mọi chặng (quyền giáo viên)').check()
  await section.locator('.journey-stage').nth(2).getByRole('button', { name: /Kiểm tra cuối chặng/ }).click()
  await expect(modal(page)).toContainText('mỗi câu trả lời một lần, không có gợi ý')
  const total = Number((await modal(page).locator('.journey-eyebrow').first().textContent())!.match(/\/(\d+)/)![1])
  for (let index = 0; index < total; index++) {
    await answer(page, await shownQuestion(page))
    await expect(modal(page).locator('.journey-feedback')).toContainText('Đúng.')
    await modal(page).getByRole('button', { name: index + 1 < total ? 'Câu tiếp' : 'Xem điểm' }).click()
  }
  await expect(modal(page).locator('.journey-big')).toHaveText(`${total}/${total}`)
  await expect(modal(page)).toContainText('Em đã qua chặng và nhận 50 XP')
  await modal(page).getByRole('button', { name: 'Câu hỏi suy ngẫm' }).click()
  await modal(page).getByLabel('Bài làm của em').fill('Nhân dân ta liên tục khởi nghĩa.')
  await modal(page).getByRole('button', { name: 'So với bài mẫu' }).click()
  await expect(modal(page).locator('.journey-rubric')).toBeVisible()
  await page.keyboard.press('Escape')
  await section.getByLabel('Mở khoá mọi chặng (quyền giáo viên)').uncheck()
  await expect(section.locator('.journey-stage').nth(2)).toHaveClass(/is-passed/)
  await expect(section.locator('.journey-stage').nth(4)).toHaveClass(/is-open/)
  await page.reload()
  await expect(page.locator('#journey .journey-stage').nth(4)).toHaveClass(/is-open/)
})

test('interview opens the character chat, other grades see a note, and the dialog fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const section = await openJourney(page)
  await expect(section.getByRole('note')).toContainText('Hành trình cho Lớp 7 đang được chuẩn bị')
  await section.locator('.journey-tools summary').click()
  await section.getByLabel('Mở khoá mọi chặng (quyền giáo viên)').check()
  await missionButton(section, 'Kế hoạch bãi cọc Bạch Đằng').click()
  expect(await modal(page).evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await modal(page).getByRole('button', { name: 'Nhận nhiệm vụ' }).click()
  while (await modal(page).getByRole('button', { name: 'Thẻ tiếp' }).count()) await modal(page).getByRole('button', { name: 'Thẻ tiếp' }).click()
  await modal(page).getByRole('button', { name: 'Đi khám phá' }).click()
  await modal(page).getByRole('button', { name: 'Trò chuyện với Ngô Quyền' }).click()
  await expect(page.locator('dialog.chat-modal')).toBeVisible()
  await expect(page.locator('#chat-title')).toContainText('Ngô Quyền')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog.chat-modal')).toHaveCount(0)
  await expect(modal(page)).toBeVisible()
  await modal(page).getByRole('button', { name: 'Vào thử thách' }).click()
  expect(await modal(page).evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('recorded narration plays scene by scene even without a browser voice', async ({ page }) => {
  // Audio playback is simulated: each clip "ends" shortly after it starts.
  await page.addInitScript(() => {
    const played: string[] = []
    Object.assign(window, { played })
    HTMLMediaElement.prototype.play = function () { played.push(new URL(this.src).pathname); window.setTimeout(() => this.dispatchEvent(new Event('ended')), 30); return Promise.resolve() }
    HTMLMediaElement.prototype.pause = function () {}
  })
  await page.route('**/api/journeys/lop6_chuong5', async (route) => {
    const response = await route.fetch()
    const data = await response.json()
    for (const scene of data.stages[0].missions[0].video.scenes) scene.audio = `/audio/journeys/lop6_chuong5/${scene.id}.mp3`
    await route.fulfill({ response, json: data })
  })
  const section = await openJourney(page)
  await missionButton(section, 'Nhà nước Văn Lang ra đời').click()
  await modal(page).getByRole('button', { name: 'Nhận nhiệm vụ' }).click()
  await expect(modal(page).getByRole('button', { name: 'Thuyết minh' })).toHaveAttribute('aria-pressed', 'true')
  await expect(modal(page).locator('.journey-video')).not.toContainText('chưa có giọng đọc tiếng Việt')
  await modal(page).getByRole('button', { name: 'Cảnh 4' }).click()
  await modal(page).getByRole('button', { name: 'Phát video' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { played: string[] }).played)).toEqual(['/audio/journeys/lop6_chuong5/b14_m1.video.s4.mp3'])
  await expect.poll(() => page.evaluate(() => (window as unknown as { played: string[] }).played.length), { timeout: 15000 }).toBe(2)
  expect(await page.evaluate(() => (window as unknown as { played: string[] }).played[1])).toBe('/audio/journeys/lop6_chuong5/b14_m1.video.s5.mp3')
  await modal(page).getByRole('button', { name: 'Thuyết minh' }).click()
  await expect(modal(page).getByRole('button', { name: 'Thuyết minh' })).toHaveAttribute('aria-pressed', 'false')
})

test('every grade 6 chapter has its own journey; the picker remembers the chapter and keeps progress apart', async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('xuyen-su-ky-demo-v1')?.includes('"grade":6') || localStorage.setItem('xuyen-su-ky-demo-v1', JSON.stringify({ loggedIn: false, guest: true, gradeSelected: true, grade: 6, completedActivities: [], earnedXp: 0 })))
  await page.goto('/home#journey')
  const picker = page.getByRole('navigation', { name: 'Chọn chương' })
  await expect(picker.getByRole('button')).toHaveCount(5)
  await expect(picker.getByRole('button')).toContainText(['Chương 1', 'Chương 2', 'Chương 3', 'Chương 4', 'Chương 5'])
  await expect(picker.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Thám tử thời gian: vì sao phải học lịch sử' })).toBeVisible()
  await expect(page.locator('#journey')).not.toContainText('đang được chuẩn bị')
  await picker.getByRole('button', { name: /Những nền văn minh cổ đại/ }).click()
  await expect(page.getByRole('heading', { name: 'Những nền văn minh cổ đại' })).toBeVisible()
  await expect(page.locator('#journey')).toContainText('Chương 3: XÃ HỘI CỔ ĐẠI')
  await expect(page.locator('#journey')).not.toContainText('CỔ ĐẠI KẾT')
  await expect(page.locator('#journey .journey-stage')).toHaveCount(4)
  // Only the open stage (Bài 7) lists its missions; later stages stay locked until it is passed.
  await expect(page.locator('#journey .journey-mission')).toHaveCount(3)
  await expect(page.locator('#journey .journey-stage.is-locked')).toHaveCount(3)
  await page.locator('#journey .journey-mission').first().click()
  await expect(page.locator('#journey-modal-title')).toHaveText('Tặng phẩm của những dòng sông')
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Những nền văn minh cổ đại' })).toBeVisible()
  await expect(picker.getByRole('button', { name: /Những nền văn minh cổ đại/ })).toHaveAttribute('aria-pressed', 'true')
})

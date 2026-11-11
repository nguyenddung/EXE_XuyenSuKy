import { expect, test, type Page } from '@playwright/test'
import { memberInGrade, memberSession, signInAsMember } from './member'

// Specs start in guest mode (playwright.config.ts): the companion record of a guest is stored under the owner 'guest'.
const guestKey = 'xuyen-su-ky-companion-v1:guest'
const memberKey = `xuyen-su-ky-companion-v1:${encodeURIComponent(memberSession.userId)}`
const launcher = (page: Page) => page.getByRole('button', { name: /^Bạn đồng hành/ })
const panel = (page: Page) => page.locator('#companion-panel')
const settings = (page: Page) => panel(page).getByRole('button', { name: 'Tuỳ chỉnh bạn đồng hành' })
const bubble = (page: Page) => page.locator('.companion-bubble')
const stored = (page: Page, key: string) => page.evaluate((name) => JSON.parse(localStorage.getItem(name) || 'null'), key)
const vietnamDay = (offset = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86_400_000))

test('the companion lives in the learning app only, not on the landing page', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.companion')).toHaveCount(0)
  await page.goto('/home')
  await expect(launcher(page)).toBeVisible()
})

test('a new student names the companion, and the name survives a reload', async ({ page }) => {
  await page.goto('/home')
  await expect(bubble(page)).toContainText('Bạn đặt cho mình một cái tên nhé?')
  await bubble(page).getByRole('button', { name: 'Đặt tên', exact: true }).click()
  const input = panel(page).getByLabel('Đặt tên cho bạn rùa')
  await expect(input).toBeFocused()

  // Empty, too long and symbol names are refused before anything is stored.
  await panel(page).getByRole('button', { name: 'Đặt tên', exact: true }).click()
  await expect(panel(page).getByRole('alert')).toHaveText('Bạn nhập một cái tên nhé.')
  await input.fill('Một cái tên dài quá hai mươi ký tự')
  await page.keyboard.press('Enter')
  await expect(panel(page).getByRole('alert')).toContainText('tối đa 20 ký tự')
  await input.fill('<b>Rùa</b>')
  await page.keyboard.press('Enter')
  await expect(panel(page).getByRole('alert')).toContainText('chữ cái, chữ số')
  expect(await stored(page, guestKey)).toBeNull()

  // Vietnamese letters and spaces are fine; extra spaces are tidied.
  await input.fill('  Rùa   Đỏ  ')
  await page.keyboard.press('Enter')
  await expect(panel(page).getByRole('heading', { name: 'Rùa Đỏ' })).toBeVisible()
  await expect(panel(page)).toContainText('Từ giờ mình là Rùa Đỏ!')
  const record = await stored(page, guestKey)
  expect(record).toMatchObject({ species: 'turtle', name: 'Rùa Đỏ', lastGreetDay: vietnamDay() })
  expect(Object.keys(record).sort()).toEqual(['lastGreetDay', 'name', 'namedAt', 'species'])

  // Escape closes the panel and gives focus back to the launcher, which now carries the name.
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
  await expect(launcher(page)).toBeFocused()
  await expect(launcher(page)).toHaveAccessibleName('Bạn đồng hành Rùa Đỏ')

  // Named today: no invitation and no second greeting after a reload.
  await page.reload()
  await expect(launcher(page)).toHaveAccessibleName('Bạn đồng hành Rùa Đỏ')
  await expect(bubble(page)).toHaveCount(0)
})

test('renaming keeps the old name until a valid new one is saved', async ({ page }) => {
  await page.addInitScript(([key, day]) => localStorage.setItem(key, JSON.stringify({ species: 'turtle', name: 'Bông', namedAt: '2026-11-01T08:00:00.000Z', lastGreetDay: day })), [guestKey, vietnamDay()] as const)
  await page.goto('/home')
  await launcher(page).click()
  await settings(page).click()
  await panel(page).getByRole('button', { name: 'Đổi tên' }).click()
  const input = panel(page).getByLabel('Tên mới cho bạn đồng hành')
  await expect(input).toHaveValue('Bông')
  await input.fill('')
  await panel(page).getByRole('button', { name: 'Lưu tên mới' }).click()
  await expect(panel(page).getByRole('alert')).toBeVisible()
  await panel(page).getByRole('button', { name: 'Huỷ' }).click()
  await expect(panel(page).getByRole('heading', { name: 'Bông' })).toBeVisible()

  await panel(page).getByRole('button', { name: 'Đổi tên' }).click()
  await panel(page).getByRole('group', { name: 'Tên gợi ý' }).getByRole('button', { name: 'Kim Quy' }).click()
  await panel(page).getByRole('button', { name: 'Lưu tên mới' }).click()
  await expect(panel(page).getByRole('heading', { name: 'Kim Quy' })).toBeVisible()
  expect((await stored(page, guestKey)).name).toBe('Kim Quy')
})

test('"Để sau" hides the invitation for this tab only', async ({ page, context }) => {
  await page.goto('/home')
  await bubble(page).getByRole('button', { name: 'Để sau' }).click()
  await expect(bubble(page)).toHaveCount(0)
  await page.reload()
  await expect(bubble(page)).toHaveCount(0)
  // The launcher still opens the naming form.
  await launcher(page).click()
  await expect(panel(page).getByLabel('Đặt tên cho bạn rùa')).toBeVisible()

  const other = await context.newPage()
  await other.goto('/home')
  await expect(other.locator('.companion-bubble')).toContainText('đặt cho mình một cái tên')
})

test('the companion greets once a day with the study goal', async ({ page }) => {
  await page.addInitScript(([key, yesterday, today]) => {
    if (sessionStorage.getItem('test-companion-seeded')) return
    sessionStorage.setItem('test-companion-seeded', '1')
    localStorage.setItem(key, JSON.stringify({ species: 'turtle', name: 'Bông', namedAt: '2026-11-01T08:00:00.000Z', lastGreetDay: yesterday }))
    localStorage.setItem('xuyen-su-ky-journal-v1', JSON.stringify({ goal: 3, events: [{ id: 'LS7_B01', kind: 'read', day: today }] }))
  }, [guestKey, vietnamDay(-1), vietnamDay()] as const)
  await page.goto('/home')
  await expect(bubble(page)).toContainText('Bông đây.')
  await expect(bubble(page)).toContainText('Hôm nay bạn đã làm 1/3 hoạt động')
  expect((await stored(page, guestKey)).lastGreetDay).toBe(vietnamDay())
  await bubble(page).getByRole('button', { name: 'Ẩn lời chào' }).click()
  await expect(bubble(page)).toHaveCount(0)
  await page.reload()
  await expect(launcher(page)).toHaveAccessibleName('Bạn đồng hành Bông')
  await expect(bubble(page)).toHaveCount(0)
})

test('each account has its own companion, and broken records are ignored', async ({ page }) => {
  await page.addInitScript(([guest, member]) => {
    localStorage.setItem(guest, JSON.stringify({ species: 'turtle', name: 'Rùa Khách', namedAt: '2026-11-01T08:00:00.000Z' }))
    localStorage.setItem(member, JSON.stringify({ species: 'dragon', name: '<script>', namedAt: 'yesterday' }))
  }, [guestKey, memberKey] as const)
  await signInAsMember(page)
  await page.goto('/home')
  // The member's stored name is not a valid name: they are invited to choose one, the guest's companion stays apart.
  await expect(launcher(page)).toHaveAccessibleName('Bạn đồng hành: đặt tên')
  await launcher(page).click()
  await panel(page).getByLabel('Đặt tên cho bạn rùa').fill('Sử Sử')
  await page.keyboard.press('Enter')
  expect(await stored(page, memberKey)).toMatchObject({ species: 'turtle', name: 'Sử Sử' })
  expect((await stored(page, guestKey)).name).toBe('Rùa Khách')
})

test('on a phone the companion sits above the bottom navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/home')
  const nav = await page.locator('.mobile-learning-nav').boundingBox()
  const button = await launcher(page).boundingBox()
  expect(nav && button).toBeTruthy()
  expect(button!.y + button!.height).toBeLessThanOrEqual(nav!.y)
  await bubble(page).getByRole('button', { name: 'Đặt tên', exact: true }).click()
  const box = await panel(page).boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  expect(box!.y).toBeGreaterThanOrEqual(0)

  // The phone menu drawer covers the screen: the companion steps aside while it is open.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await expect(launcher(page)).toBeHidden()
})

const mascot = (page: Page) => page.locator('.companion-launcher svg.cm')
const box = async (page: Page) => (await launcher(page).boundingBox())!
const named = (page: Page) => page.addInitScript(([key, day]) => localStorage.setItem(key, JSON.stringify({ species: 'turtle', name: 'Bông', namedAt: '2026-11-01T08:00:00.000Z', lastGreetDay: day })), [guestKey, vietnamDay()] as const)

test('the companion can be dragged anywhere, stays on screen and keeps its place after a reload', async ({ page }) => {
  await named(page)
  await page.goto('/home')
  const start = await box(page)
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x - 300, start.y - 250, { steps: 8 })
  // Carried: the turtle hangs from its shell, feet dangling.
  await expect(mascot(page)).toHaveAttribute('data-mood', 'lifted')
  await page.mouse.move(start.x - 500, start.y - 400, { steps: 8 })
  await page.mouse.up()
  // Dropping it is not a click: the panel stays closed.
  await expect(panel(page)).toHaveCount(0)
  const moved = await box(page)
  // Held by its middle: the companion's corner ends half its size up and left of the pointer.
  expect(Math.abs(moved.x - (start.x - 500 - start.width / 2))).toBeLessThan(3)
  expect(Math.abs(moved.y - (start.y - 400 - start.height / 2))).toBeLessThan(3)
  await expect(mascot(page)).toHaveAttribute('data-mood', 'idle')

  // Same place after a reload.
  await page.reload()
  const restored = await box(page)
  expect(Math.abs(restored.x - moved.x)).toBeLessThan(3)
  expect(Math.abs(restored.y - moved.y)).toBeLessThan(3)

  // Dragged past the edge, it stops at the screen border.
  await page.mouse.move(restored.x + 20, restored.y + 20)
  await page.mouse.down()
  await page.mouse.move(-400, -400, { steps: 6 })
  await page.mouse.up()
  const edge = await box(page)
  expect(edge.x).toBeGreaterThanOrEqual(0)
  expect(edge.y).toBeGreaterThanOrEqual(0)
  expect(edge.x).toBeLessThan(20)
  expect(edge.y).toBeLessThan(20)

  // A plain click still opens the panel, which opens below the companion near the top and stays on screen.
  await launcher(page).click()
  const open = (await panel(page).boundingBox())!
  expect(open.y).toBeGreaterThan(edge.y + edge.height)
  expect(open.x).toBeGreaterThanOrEqual(0)
  expect(open.y + open.height).toBeLessThanOrEqual(900)
})

test('the companion moves with the arrow keys and the corner buttons', async ({ page }) => {
  await named(page)
  await page.goto('/home')
  const start = await box(page)
  await launcher(page).focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Shift+ArrowUp')
  const moved = await box(page)
  expect(Math.round(start.x - moved.x)).toBe(16)
  expect(Math.round(start.y - moved.y)).toBe(64)
  // Arrow keys move the companion, not the page.
  expect(await page.evaluate(() => window.scrollY)).toBe(0)

  await launcher(page).click()
  await settings(page).click()
  await panel(page).getByRole('button', { name: 'Góc trên bên trái' }).click()
  const corner = await box(page)
  expect(corner.x).toBeLessThan(40)
  expect(corner.y).toBeLessThan(120)
  // The panel follows the companion and opens below it.
  expect((await panel(page).boundingBox())!.y).toBeGreaterThan(corner.y)

  // Bottom right is the default corner again, and nothing is stored for it.
  await panel(page).getByRole('button', { name: 'Góc dưới bên phải' }).click()
  const home = await box(page)
  expect(Math.abs(home.x - start.x)).toBeLessThan(2)
  expect(Math.abs(home.y - start.y)).toBeLessThan(2)
  expect(await page.evaluate(() => localStorage.getItem('xuyen-su-ky-companion-position-v1'))).toBeNull()
})

test('the turtle waves while it calls, and is happy when named', async ({ page }) => {
  await page.goto('/home')
  await expect(mascot(page)).toHaveAttribute('data-mood', 'wave')
  await bubble(page).getByRole('button', { name: 'Đặt tên', exact: true }).click()
  await panel(page).getByLabel('Đặt tên cho bạn rùa').fill('Bông')
  await page.keyboard.press('Enter')
  await expect(mascot(page)).toHaveAttribute('data-mood', 'happy')
  await expect(mascot(page)).toHaveAttribute('data-mood', 'idle')
})

// Chat. The test server runs with AI_DISABLED=1: answers come from the app guide, the textbook or the browser's data.
const chatInput = (page: Page) => panel(page).getByRole('textbox', { name: /^Câu hỏi cho/ })
const answers = (page: Page) => panel(page).locator('.companion-answer')
const namedMember = (page: Page) => page.addInitScript(([key, day]) => localStorage.setItem(key, JSON.stringify({ species: 'turtle', name: 'Bông', namedAt: '2026-11-01T08:00:00.000Z', lastGreetDay: day })), [memberKey, vietnamDay()] as const)

test('a guest names the companion but is invited to sign in to chat', async ({ page }) => {
  await named(page)
  await page.goto('/home')
  await launcher(page).click()
  await expect(chatInput(page)).toHaveCount(0)
  await panel(page).getByRole('button', { name: 'Đăng nhập để trò chuyện' }).click()
  await expect(panel(page)).toHaveCount(0)
  await expect(page.getByRole('dialog')).toContainText('Đăng nhập')
})

test.describe('signing in', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('right after signing in the companion opens once, ready to chat, without taking the focus', async ({ page }) => {
    await namedMember(page)
    await page.goto('/dang-nhap')
    await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
    await page.locator('.login-form button[type=submit]').click()
    await page.locator('.grade-onboarding .button-primary').click()
    await expect(page).toHaveURL(/\/home$/)
    await expect(panel(page)).toBeVisible()
    await expect(panel(page).getByRole('group', { name: 'Câu hỏi gợi ý' })).toBeVisible()
    await expect(chatInput(page)).toBeVisible()
    await expect(chatInput(page)).not.toBeFocused()
    expect(await page.evaluate(() => document.activeElement?.closest('#companion-panel') ?? null)).toBeNull()
    // Once per sign-in: a reload in the same session keeps it closed.
    await page.reload()
    await expect(launcher(page)).toBeVisible()
    await expect(panel(page)).toHaveCount(0)
  })
})

test('a member chats about the app, their progress and the textbook; the talk is kept and can be cleared', async ({ page }) => {
  await memberInGrade(page, 6)
  await namedMember(page)
  await page.goto('/home')
  await launcher(page).click()

  // A suggested question about the app, answered from the guide with a button to the section.
  await panel(page).getByRole('group', { name: 'Câu hỏi gợi ý' }).getByRole('button', { name: 'Hành trình là gì?' }).click()
  await expect(answers(page)).toHaveCount(1)
  await expect(answers(page).first()).toContainText('mỗi chặng là một bài')
  await expect(panel(page).getByRole('group', { name: 'Câu hỏi gợi ý' })).toHaveCount(0)

  // Progress comes from this browser, without a request.
  let requests = 0
  page.on('request', (request) => { if (request.url().includes('/api/companion/chat')) requests++ })
  await chatInput(page).fill('Mình đã học được bao nhiêu bài rồi?')
  await page.keyboard.press('Enter')
  await expect(answers(page)).toHaveCount(2)
  await expect(answers(page).nth(1)).toContainText('đã đọc xong 0 bài')
  expect(requests).toBe(0)

  // A history question: a cited textbook passage of the student's grade.
  await chatInput(page).fill('Trận Bạch Đằng năm 938 do ai chỉ huy?')
  await panel(page).getByRole('button', { name: 'Gửi' }).click()
  await expect(answers(page)).toHaveCount(3)
  await expect(answers(page).nth(2).getByRole('list', { name: 'Nguồn' })).toContainText('trang')
  expect(requests).toBe(1)

  // Kept after a reload.
  await page.reload()
  await launcher(page).click()
  await expect(answers(page)).toHaveCount(3)
  await expect(panel(page).locator('.companion-ask')).toHaveCount(3)

  // The answer's button opens its section and closes the panel.
  await answers(page).first().getByRole('button', { name: 'Mở Hành trình' }).click()
  await expect(panel(page)).toHaveCount(0)
  await expect(page).toHaveURL(/#journey$/)

  // Cleared from the settings.
  await launcher(page).click()
  await settings(page).click()
  page.once('dialog', (dialog) => dialog.accept())
  await panel(page).getByRole('button', { name: 'Xoá cuộc trò chuyện' }).click()
  await expect(answers(page)).toHaveCount(0)
  await expect(panel(page).getByRole('group', { name: 'Câu hỏi gợi ý' })).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), `xuyen-su-ky-companion-chat-v1:${encodeURIComponent(memberSession.userId)}`)).toBeNull()
})

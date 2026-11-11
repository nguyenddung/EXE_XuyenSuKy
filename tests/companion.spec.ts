import { expect, test, type Page } from '@playwright/test'
import { memberSession, signInAsMember } from './member'

// Specs start in guest mode (playwright.config.ts): the companion record of a guest is stored under the owner 'guest'.
const guestKey = 'xuyen-su-ky-companion-v1:guest'
const memberKey = `xuyen-su-ky-companion-v1:${encodeURIComponent(memberSession.userId)}`
const launcher = (page: Page) => page.getByRole('button', { name: /^Bạn đồng hành/ })
const panel = (page: Page) => page.locator('#companion-panel')
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
})

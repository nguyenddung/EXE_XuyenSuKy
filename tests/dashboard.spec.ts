import { expect, test, type Page } from '@playwright/test'

const openMenu = (page: Page, name: string) => page.getByRole('navigation', { name: 'Các khu vực' }).getByRole('link', { name, exact: true }).click()

test('dashboard cards open real lessons, search and quiz', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Hành trình khám phá Lịch sử Việt Nam' })).toBeVisible()
  await expect(page.locator('.dashboard-era')).toHaveCount(6)
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png') })
  await page.getByRole('button', { name: 'Thời Lý', exact: true }).click()
  await expect(page.locator('#dataset-reader-title')).toContainText('Nhà Lý')
  await page.getByRole('button', { name: 'Đóng bài đọc' }).click()
  await page.getByRole('searchbox', { name: 'Tìm sự kiện, nhân vật, thời kỳ' }).fill('Bạch Đằng')
  await page.getByRole('searchbox', { name: 'Tìm sự kiện, nhân vật, thời kỳ' }).press('Enter')
  await expect(page.getByRole('region', { name: 'Kết quả tìm kiếm' }).getByRole('button').first()).toBeVisible()
  await openMenu(page, 'Trang chủ')
  await page.locator('.dashboard-mission.mission-orange').click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('landing shares the dashboard look and its era cards open the lesson on /home', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 820 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Chạm vào quá khứ/ })).toBeVisible()
  await expect(page.locator('.site-header .brand-text')).toHaveText('Xuyên Sử Ký')
  await expect(page.locator('.landing-hero .dashboard-era')).toHaveCount(6)
  await page.locator('.landing-hero .dashboard-era').filter({ hasText: 'Thời Lý' }).click()
  await expect(page).toHaveURL(/\/home#library$/)
  await expect(page.locator('#dataset-reader-title')).toContainText('Nhà Lý')
})

test('landing fits mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.landing-banner .landing-gold-button')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('dashboard navigation works on mobile without horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Hành trình khám phá Lịch sử Việt Nam' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Các khu vực' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Các khu vực' }).getByRole('link', { name: 'Học tập' }).click()
  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible()
})

test('each menu item shows only its own section', async ({ page }) => {
  await page.goto('/home')
  const sections = { 'Trang chủ': '#dashboard', 'Học tập': '#library', 'Khám phá': '#timeline', 'Nhân vật AI': '#characters', 'Thử thách': '#challenges', 'Bảng xếp hạng': '#progress' }
  for (const [name, selector] of Object.entries(sections)) {
    await openMenu(page, name)
    await expect(page).toHaveURL(new RegExp(`${selector}$`))
    await expect(page.getByRole('navigation', { name: 'Các khu vực' }).getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.locator(selector)).toBeVisible()
    for (const other of Object.values(sections).filter(item => item !== selector)) await expect(page.locator(other)).toHaveCount(0)
  }
  // "Học tập" holds the journey above the textbook library; #journey opens the same section.
  await openMenu(page, 'Học tập')
  await expect(page.locator('#journey')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Các khu vực' }).getByRole('link', { name: 'Hành trình', exact: true })).toHaveCount(0)
  await page.getByRole('navigation', { name: 'Các phần của Học tập' }).getByRole('link', { name: 'Hành trình' }).click()
  await expect(page).toHaveURL(/#journey$/)
  await expect(page.getByRole('navigation', { name: 'Các khu vực' }).getByRole('link', { name: 'Học tập', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('#library')).toBeVisible()
  await openMenu(page, 'Bảng xếp hạng')
  // History: … #challenges, #progress, #library, #journey, #progress.
  for (let step = 0; step < 4; step++) await page.goBack()
  await expect(page.locator('#challenges')).toBeVisible()
  await expect(page.locator('#progress')).toHaveCount(0)
})

test('the bell opens notifications that lead somewhere, instead of jumping to the home page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/home')
  const bell = page.getByRole('button', { name: /^Thông báo/ })
  await expect(bell.locator('i')).toBeVisible()
  await bell.click()
  const panel = page.getByRole('region', { name: 'Thông báo' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('button', { name: /Lưu tiến độ của bạn/ })).toBeVisible()
  await expect(panel.getByRole('button', { name: /Thử thách mới: Xếp dòng sử/ })).toBeVisible()
  await expect(bell.locator('i')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await bell.click()
  await panel.getByRole('button', { name: /Thử thách mới/ }).click()
  await expect(page.getByRole('dialog')).toContainText('Xếp dòng sử')
  await page.reload()
  await expect(page.getByRole('button', { name: /^Thông báo/ }).locator('i')).toHaveCount(0)
})

test('a grade card opens from anywhere on the card, not only from "Khám phá"', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('.class-card').filter({ hasText: 'Lớp 8' })
  await card.scrollIntoViewIfNeeded()
  const title = (await card.locator('h3').boundingBox())!
  await page.mouse.click(title.x + title.width / 2, title.y + title.height / 2)
  await expect(page).toHaveURL(/\/home#library$/)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xuyen-su-ky-demo-v1')!).grade)).toBe(8)
})

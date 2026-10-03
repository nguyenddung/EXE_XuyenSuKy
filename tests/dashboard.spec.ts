import { expect, test } from '@playwright/test'

test('dashboard cards open real lessons, search and quiz', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Hành trình khám phá Lịch sử Việt Nam' })).toBeVisible()
  await expect(page.locator('.dashboard-era')).toHaveCount(6)
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png') })
  await page.getByRole('button', { name: 'Thời Lý', exact: true }).click()
  await expect(page.locator('#dataset-reader-title')).toContainText('thời Lý')
  await page.getByRole('button', { name: 'Đóng bài đọc' }).click()
  await page.getByRole('searchbox', { name: 'Tìm sự kiện, nhân vật, thời kỳ' }).fill('Bạch Đằng')
  await page.getByRole('searchbox', { name: 'Tìm sự kiện, nhân vật, thời kỳ' }).press('Enter')
  await expect(page.getByRole('region', { name: 'Kết quả tìm kiếm' }).getByRole('button').first()).toBeVisible()
  await page.locator('.dashboard-mission.mission-orange').click()
  await expect(page.getByRole('dialog')).toBeVisible()
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

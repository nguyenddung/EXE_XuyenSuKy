import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('signed-out visitors are sent to sign-in and return to the page they wanted', async ({ page }) => {
  await page.goto('/home')
  await expect(page).toHaveURL(/\/dang-nhap$/)
  await expect(page.getByRole('heading', { name: 'Đăng nhập Xuyên Sử Ký' })).toBeVisible()
  await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('button', { name: 'Tài khoản' })).toContainText('Minh')
  await expect(page.locator('.dashboard-guest-banner')).toHaveCount(0)
  await page.getByRole('button', { name: 'Tài khoản' }).click()
  await page.getByRole('link', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/home')
  await expect(page).toHaveURL(/\/dang-nhap$/)
})

test('landing never opens the app by itself; guest mode is an explicit choice', async ({ page }) => {
  await page.goto('/')
  const header = page.getByRole('navigation', { name: 'Điều hướng chính' })
  await expect(header.getByRole('link', { name: 'Trang chủ' })).toHaveCount(0)
  await header.getByRole('link', { name: 'Bắt đầu học' }).click()
  await expect(page).toHaveURL(/\/dang-nhap$/)
  await page.getByRole('button', { name: /Học thử không cần tài khoản/ }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.locator('.dashboard-guest-banner')).toContainText('Bạn đang học thử')
  await expect(page.locator('.dashboard-rank.is-me')).toContainText('Bạn (khách)')
})

test('an era chosen while signed out opens its lesson after signing in', async ({ page }) => {
  await page.goto('/')
  await page.locator('.landing-hero .dashboard-era').filter({ hasText: 'Thời Lý' }).click()
  await expect(page).toHaveURL(/\/dang-nhap$/)
  await page.getByRole('button', { name: /Học thử không cần tài khoản/ }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.locator('#dataset-reader-title')).toContainText('thời Lý')
})

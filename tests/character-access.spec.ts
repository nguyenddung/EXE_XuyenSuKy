import { expect, test } from '@playwright/test'

const card = (page: import('@playwright/test').Page, name: string) => page.locator('.character-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
const signIn = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Đăng nhập để tiếp tục' })

test('a guest is asked to sign in before chatting; closing keeps the chat shut, signing in opens the chosen character', async ({ page }) => {
  await page.goto('/home#characters')
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(signIn(page)).toContainText('Đăng nhập để nhắn tin với Ngô Quyền')
  await expect(signIn(page)).toContainText('chỉ dành cho tài khoản đã đăng nhập')
  await expect(page.locator('.chat-modal')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(signIn(page)).toHaveCount(0)
  await expect(page.locator('.chat-modal')).toHaveCount(0)

  await card(page, 'Lý Công Uẩn').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await signIn(page).getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
  await signIn(page).locator('.login-form button[type=submit]').click()
  await expect(signIn(page)).toHaveCount(0)
  await expect(page.locator('#chat-title')).toContainText('Lý Công Uẩn')
  await expect(page.locator('#chat-input')).toBeVisible()
})

test.describe('visitor on the landing page', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('the featured character voice button asks a visitor to sign in, then opens the voice conversation', async ({ page }) => {
    await page.goto('/')
    await page.locator('.landing-featured').getByRole('button', { name: 'Nói chuyện' }).click()
    await expect(signIn(page)).toContainText('Đăng nhập để nói chuyện với Trần Hưng Đạo')
    await signIn(page).getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
    await signIn(page).locator('.login-form button[type=submit]').click()
    // The landing page does not ask for a grade, so the conversation opens straight after signing in.
    await expect(page.locator('#chat-title')).toContainText('Trần Hưng Đạo')
    await expect(page.getByRole('button', { name: 'Xem văn bản và nguồn' })).toBeVisible()
  })
})

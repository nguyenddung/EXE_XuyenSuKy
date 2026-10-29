import { expect, test } from '@playwright/test'

// Hành trình and Bài học share the SGK lessons: the reader shows each lesson's videos and missions, and the journey map links back to the text.

test('a journey stage opens its SGK lesson, which plays the lesson videos and launches a mission', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/home#journey')
  await page.getByRole('navigation', { name: 'Chọn chương' }).getByRole('button', { name: /Chương 2/ }).click()
  await page.locator('.journey-stage').first().getByRole('button', { name: 'Đọc bài SGK và xem video' }).click()

  const reader = page.locator('dialog.dataset-reader')
  await expect(reader.locator('#dataset-reader-title')).toHaveText('Nguồn gốc loài người')
  const block = reader.locator('.lesson-journey')
  await expect(block.getByRole('heading', { name: 'Video & nhiệm vụ của bài' })).toBeVisible()
  await expect(block.locator('.lesson-journey-count')).toHaveText('2 video · 2 nhiệm vụ')
  const videos = block.getByRole('list', { name: 'Video bài học' }).getByRole('button')
  await expect(videos).toHaveCount(2)
  await videos.first().click()
  await expect(videos.first()).toHaveAttribute('aria-pressed', 'true')
  await expect(block.locator('.lesson-journey-player')).toBeVisible()
  await block.getByRole('button', { name: 'Đóng video' }).click()
  await expect(block.locator('.lesson-journey-player')).toHaveCount(0)

  const missions = block.getByRole('list', { name: 'Nhiệm vụ của bài' }).getByRole('listitem')
  await expect(missions).toHaveCount(2)
  const title = (await missions.first().locator('span').first().evaluate((node) => node.firstChild?.textContent || '')).trim()
  await expect(missions.nth(1).getByRole('button')).toBeDisabled()
  await missions.first().getByRole('button', { name: /Làm nhiệm vụ/ }).click()

  await expect(reader).toHaveCount(0)
  await expect(page).toHaveURL(/#journey$/)
  await expect(page.locator('dialog.journey-modal')).toBeVisible()
  await expect(page.locator('dialog.journey-modal')).toContainText(title)
  expect(errors).toEqual([])
})

test('library cards say which lessons have videos and missions, and the reader links to the journey map', async ({ page }) => {
  await page.goto('/home#library')
  await page.getByRole('combobox', { name: 'Lọc lớp sách giáo khoa' }).selectOption('6')
  const card = page.locator('.dataset-card').filter({ has: page.getByRole('heading', { name: 'Xã hội nguyên thuỷ', exact: true }) })
  await expect(card.locator('.lesson-journey-badge')).toHaveText('3 video · 3 nhiệm vụ')
  await card.locator('.library-open').click()
  const block = page.locator('dialog.dataset-reader .lesson-journey')
  await expect(block.locator('.lesson-journey-videos li')).toHaveCount(3)
  await block.getByRole('button', { name: 'Xem trên bản đồ hành trình' }).click()
  await expect(page).toHaveURL(/#journey$/)
  await expect(page.locator('.journey-chapters button[aria-pressed="true"]')).toContainText('Chương 2')
  await expect(page.locator('.journey-stage').nth(1)).toBeInViewport()
})

test('lessons without a journey keep the plain reader', async ({ page }) => {
  await page.goto('/home#library')
  await page.locator('.dataset-card .library-open').first().click()
  await expect(page.locator('dialog.dataset-reader #dataset-reader-title')).toBeFocused()
  await expect(page.locator('.lesson-journey')).toHaveCount(0)
})

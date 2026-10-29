import { expect, test } from '@playwright/test'

// Hành trình and Bài học share the SGK lessons: the reader shows each video at the start of the section it illustrates,
// offers the missions as practice after the text, and the journey map links back to the text.

test('a journey stage opens its SGK lesson, which plays the section video in place and launches a mission', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/home#journey')
  await page.getByRole('navigation', { name: 'Chọn chương' }).getByRole('button', { name: /Chương 2/ }).click()
  await page.locator('.journey-stage').first().getByRole('button', { name: 'Đọc bài SGK và xem video' }).click()

  const reader = page.locator('dialog.dataset-reader')
  await expect(reader.locator('#dataset-reader-title')).toHaveText('Nguồn gốc loài người')
  await expect(reader.locator('.reader-meta')).toContainText('2 video minh hoạ')
  await expect(reader.locator('.reader-meta')).toContainText('2 nhiệm vụ luyện tập')
  // Both videos of Bài 4 quote section 2, so they open that section, not the top of the lesson.
  const section = reader.locator('#dataset-section-2')
  const videos = section.locator('.lesson-video')
  await expect(videos).toHaveCount(2)
  await expect(reader.locator('.lesson-video')).toHaveCount(2)
  await videos.first().click()
  await expect(section.locator('.lesson-video.is-playing')).toBeVisible()
  await section.getByRole('button', { name: 'Đóng video' }).click()
  await expect(reader.locator('.lesson-video.is-playing')).toHaveCount(0)

  const missions = reader.getByRole('list', { name: 'Nhiệm vụ của bài' }).getByRole('listitem')
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

test('library cards say which lessons have videos; the reader typesets the text and links to the journey map', async ({ page }) => {
  await page.goto('/home#library')
  await page.getByRole('combobox', { name: 'Lọc lớp sách giáo khoa' }).selectOption('6')
  const card = page.locator('.dataset-card').filter({ has: page.getByRole('heading', { name: 'Xã hội nguyên thuỷ', exact: true }) })
  await expect(card.locator('.lesson-journey-badge')).toHaveText('3 video · 3 nhiệm vụ')
  await card.locator('.library-open').click()
  const reader = page.locator('dialog.dataset-reader')
  await expect(reader.locator('#dataset-section-2 .lesson-video')).toHaveCount(2)
  await expect(reader.locator('#dataset-section-3 .lesson-video')).toHaveCount(1)
  await expect(reader.locator('.dataset-toc .toc-video')).toHaveCount(2)
  await expect(reader.locator('.dataset-section.is-objectives .reader-checklist li')).not.toHaveCount(0)
  await expect(reader.locator('.reader-note').first()).toContainText('Em có biết?')
  await expect(reader.locator('.reader-figure').first()).toContainText('Hình 1')
  await reader.getByRole('button', { name: 'Xem trên bản đồ hành trình' }).click()
  await expect(page).toHaveURL(/#journey$/)
  await expect(page.locator('.journey-chapters button[aria-pressed="true"]')).toContainText('Chương 2')
  await expect(page.locator('.journey-stage').nth(1)).toBeInViewport()
})

test('lessons without a journey keep the reader without videos or practice, and it fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/home#library')
  await page.locator('.dataset-card .library-open').first().click()
  const reader = page.locator('dialog.dataset-reader')
  await expect(reader.locator('#dataset-reader-title')).toBeFocused()
  await expect(reader.locator('.lesson-video')).toHaveCount(0)
  await expect(reader.locator('.lesson-practice')).toHaveCount(0)
  expect(await reader.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
})

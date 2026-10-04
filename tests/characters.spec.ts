import { expect, test } from '@playwright/test'

async function openCharacter(page: import('@playwright/test').Page, name: string) {
  await page.goto('/home#characters')
  await page.locator('.character-card').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('#chat-input')).toBeFocused()
}

test('12 illustrated characters load; aliases, era, grade and empty filters work', async ({ page }) => {
  await page.goto('/home#characters')
  await expect(page.locator('.character-card')).toHaveCount(12)
  for (const card of await page.locator('.character-card').all()) {
    await card.scrollIntoViewIfNeeded()
    await expect.poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  }
  const search = page.getByRole('searchbox', { name: 'Tìm nhân vật lịch sử' })
  await search.fill('ly thai to')
  await expect(page.locator('.character-card')).toHaveCount(1)
  await expect(page.locator('.character-card h3')).toHaveText('Lý Công Uẩn')
  await search.fill('')
  await page.getByRole('group', { name: 'Lọc thời kỳ nhân vật' }).getByRole('button', { name: 'Việt Nam hiện đại' }).click()
  await expect(page.locator('.character-card')).toHaveCount(2)
  await page.getByRole('combobox', { name: 'Lọc lớp có nhân vật' }).selectOption('12')
  await expect(page.locator('.character-card')).toHaveCount(2)
  await search.fill('khongton tai')
  await expect(page.getByRole('heading', { name: 'Chưa tìm thấy nhân vật phù hợp' })).toBeVisible()
  await page.getByRole('button', { name: 'Xem tất cả nhân vật' }).click()
  await expect(page.locator('.character-card')).toHaveCount(12)
})

test('suggestions, contextual follow-ups and citations open the real lesson', async ({ page }) => {
  await openCharacter(page, 'Lý Công Uẩn')
  await page.getByRole('button', { name: 'Lý Công Uẩn dời đô năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer').first()).toContainText('1010')
  await expect(page.locator('.chat-sources small').first()).toContainText('trang PDF')
  await page.locator('#chat-input').fill('Vì sao?')
  await page.keyboard.press('Enter')
  await expect(page.locator('.chat-answer')).toHaveCount(2)
  await expect(page.locator('.chat-answer').last()).toContainText('rồng cuộn hổ ngồi')
  await page.locator('.chat-sources button').last().click()
  await expect(page.locator('.chat-modal')).toHaveCount(0)
  await expect(page.locator('#dataset-reader-title')).toContainText('thời Lý')
  await expect(page.locator('#dataset-reader-title')).toBeFocused()
})

test('failed request can retry; busy state prevents duplicates and clearing resets context', async ({ page }) => {
  let requests = 0
  await page.route('**/api/characters/ngo-quyen/chat', async (route) => {
    requests++
    if (requests === 1) await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"DATASET_UNAVAILABLE"}}' })
    else await route.continue()
  })
  await openCharacter(page, 'Ngô Quyền')
  await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Thử gửi lại' }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  expect(requests).toBe(2)
  await page.unroute('**/api/characters/ngo-quyen/chat')
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  let payload: { history: unknown[] } | undefined
  await page.route('**/api/characters/ngo-quyen/chat', async (route) => {
    requests++
    payload = route.request().postDataJSON()
    await gate
    await route.continue()
  })
  await page.locator('#chat-input').fill('Chiến thắng có ý nghĩa gì?')
  await page.keyboard.press('Enter')
  await expect(page.locator('.chat-loading')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Gửi câu hỏi', exact: true })).toBeDisabled()
  expect(requests).toBe(3)
  expect(payload?.history).toHaveLength(2)
  release()
  await expect(page.locator('.chat-answer')).toHaveCount(2)
  await page.getByRole('button', { name: 'Bắt đầu cuộc trò chuyện mới' }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
  await expect(page.locator('#chat-input')).toBeFocused()
})

test('mobile chat fits viewport, traps focus and Escape restores the trigger', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openCharacter(page, 'Võ Nguyên Giáp')
  await page.getByRole('button', { name: 'Điện Biên Phủ diễn ra năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('1954')
  expect(await page.locator('.chat-modal').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('.chat-modal'))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(page.locator('.chat-modal')).toHaveCount(0)
  await expect(page.locator('.character-card').filter({ has: page.getByRole('heading', { name: 'Võ Nguyên Giáp', exact: true }) }).getByRole('button')).toBeFocused()
  expect(errors).toEqual([])
})

test('rate-limited chat locks every way of asking and counts down until the server allows it again', async ({ page }) => {
  let requests = 0
  await page.route('**/api/characters/ngo-quyen/chat', async (route) => {
    requests++
    if (requests === 1) await route.fulfill({ status: 429, headers: { 'Retry-After': '2' }, contentType: 'application/json', body: '{"error":{"code":"RATE_LIMITED"}}' })
    else await route.continue()
  })
  await openCharacter(page, 'Ngô Quyền')
  await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Hãy chờ')
  await expect(page.locator('.chat-cooldown')).toContainText('giây')
  await expect(page.locator('.chat-suggestions button').first()).toBeDisabled()
  await expect(page.getByRole('button', { name: /Gửi lại sau/ })).toBeDisabled()
  await page.locator('#chat-input').fill('Bạch Đằng diễn ra năm nào?')
  await expect(page.getByRole('button', { name: 'Gửi câu hỏi' })).toBeDisabled()
  expect(requests).toBe(1)
  await expect(page.locator('.chat-cooldown')).toHaveCount(0, { timeout: 5000 })
  await page.getByRole('button', { name: 'Thử gửi lại' }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  expect(requests).toBe(2)
})

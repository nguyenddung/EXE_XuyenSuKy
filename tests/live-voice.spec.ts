import { expect, test, type Page } from '@playwright/test'

// The dev server runs without ElevenLabs, so these tests mark the characters as live-capable and stub the session endpoint.
async function enableLiveVoice(page: Page, session: { status: number; body: unknown }) {
  await page.route(/\/api\/characters(\?.*)?$/, async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, items: body.items.map((item: object) => ({ ...item, liveVoice: true })) } })
  })
  await page.route('**/api/characters/*/voice-session', (route) => route.fulfill({ status: session.status, contentType: 'application/json', body: JSON.stringify(session.body) }))
}
const openVoice = async (page: Page) => {
  await page.goto('/home#characters')
  await page.locator('.character-card').filter({ has: page.getByRole('heading', { name: 'Ngô Quyền', exact: true }) }).getByRole('button', { name: 'Nói chuyện', exact: true }).click()
}

test('voice mode opens a hands-free conversation instead of the ask-by-mic flow', async ({ page }) => {
  await enableLiveVoice(page, { status: 503, body: { error: { code: 'LIVE_VOICE_UNAVAILABLE', message: 'Trò chuyện trực tiếp bằng giọng nói chưa được bật cho nhân vật này.' } } })
  await openVoice(page)
  await expect(page.getByText('TRÒ CHUYỆN TRỰC TIẾP')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu trò chuyện' })).toBeFocused()
  await expect(page.locator('.voice-send')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bắt đầu trò chuyện' }).click()
  await expect(page.getByRole('alert')).toContainText('chưa được bật')
  await page.getByRole('alert').getByRole('button', { name: 'Hỏi từng câu bằng mic' }).click()
  await expect(page.locator('.voice-mic')).toHaveAttribute('aria-label', 'Nói câu hỏi')
  await expect(page.locator('.voice-mic')).toBeFocused()
})

test('a busy session endpoint tells the student when to call again', async ({ page }) => {
  await enableLiveVoice(page, { status: 429, body: { error: { code: 'RATE_LIMITED' } } })
  await openVoice(page)
  await page.getByRole('button', { name: 'Bắt đầu trò chuyện' }).click()
  await expect(page.getByRole('alert')).toContainText('thử lại sau')
  await page.getByRole('group', { name: 'Chế độ trò chuyện' }).getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('#chat-input')).toBeFocused()
})

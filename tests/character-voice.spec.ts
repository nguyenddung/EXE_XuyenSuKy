import { expect, test, type Page } from '@playwright/test'

async function installVoiceMocks(page: Page, hasVietnameseVoice = true, hasMic = true) {
  await page.addInitScript(({ hasVietnameseVoice, hasMic }) => {
    const state = { played: 0, paused: 0, canceled: 0, micAborted: 0, utterances: [] as { text: string; lang: string; rate: number; pitch: number }[], transcript: (_text: string) => {}, micError: (_error: string) => {}, finishAudio: () => {} }
    Object.defineProperty(window, '__voiceTest', { value: state })
    class MockAudio {
      onplaying: (() => void) | null = null
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      async play() { state.played++; this.onplaying?.(); state.finishAudio = () => this.onended?.() }
      pause() { state.paused++ }
      removeAttribute() {}
      load() {}
    }
    Object.defineProperty(window, 'Audio', { value: MockAudio })
    class MockUtterance {
      constructor(public text: string) {}
      lang = ''; rate = 1; pitch = 1
      voice: unknown = null
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance })
    const synth = new EventTarget() as EventTarget & { getVoices: () => unknown[]; speak: (utterance: MockUtterance) => void; cancel: () => void }
    synth.getVoices = () => hasVietnameseVoice ? [{ name: 'Vietnamese demo', lang: 'vi-VN' }] : [{ name: 'English demo', lang: 'en-US' }]
    synth.speak = (utterance) => { state.utterances.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate, pitch: utterance.pitch }); utterance.onstart?.() }
    synth.cancel = () => { state.canceled++ }
    Object.defineProperty(window, 'speechSynthesis', { value: synth })
    class MockRecognition {
      lang = ''; continuous = false; interimResults = false
      onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null
      onend: (() => void) | null = null
      start() {
        state.transcript = (text) => { this.onresult?.({ results: [[{ transcript: text }]] }); this.onend?.() }
        state.micError = (error) => { this.onerror?.({ error }) }
      }
      abort() { state.micAborted++ }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: hasMic ? MockRecognition : undefined })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined })
  }, { hasVietnameseVoice, hasMic })
}

const stats = (page: Page) => page.evaluate(() => (window as unknown as { __voiceTest: { played: number; paused: number; canceled: number; micAborted: number; utterances: { text: string; lang: string; rate: number; pitch: number }[] } }).__voiceTest)
async function openCharacter(page: Page, name = 'Ngô Quyền') {
  await page.goto('/home#characters')
  await page.locator('.character-card').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button').click()
}
const question = (page: Page) => page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
async function mockAzure(page: Page) {
  await page.route('**/api/characters/*/speech', (route) => route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('mock-audio') }))
}
async function mockUnconfigured(page: Page) {
  await page.route('**/api/characters/*/speech', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SPEECH_NOT_CONFIGURED' } }) }))
}

test('auto-read sends the grounded answer without citation markers, glows only during playback and stops/replays', async ({ page }) => {
  await installVoiceMocks(page)
  let payload: { text: string } | undefined
  await page.route('**/api/characters/*/speech', async (route) => { payload = route.request().postDataJSON(); await route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('mock-audio') }) })
  await openCharacter(page)
  await question(page)
  await expect(page.locator('.chat-avatar')).toHaveClass(/is-speaking/)
  expect(payload?.text).toContain('938')
  expect(payload?.text).not.toContain('[1]')
  await page.getByRole('button', { name: 'Dừng giọng nói' }).click()
  await expect(page.locator('.chat-avatar')).not.toHaveClass(/is-speaking/)
  expect((await stats(page)).paused).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Nghe câu trả lời 1', exact: true }).click()
  await expect(page.locator('.chat-avatar')).toHaveClass(/is-speaking/)
  await page.evaluate(() => (window as unknown as { __voiceTest: { finishAudio: () => void } }).__voiceTest.finishAudio())
  await expect(page.locator('.chat-avatar')).not.toHaveClass(/is-speaking/)
  await page.getByRole('button', { name: 'Nghe câu trả lời 1', exact: true }).click()
  await expect.poll(async () => (await stats(page)).played).toBe(3)
  await page.getByRole('button', { name: 'Đóng trò chuyện' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await stats(page)).paused).toBe(3)
})

test('turning off auto-read during chat generation prevents speech but manual reading still works', async ({ page }) => {
  await installVoiceMocks(page)
  await mockAzure(page)
  let release = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/characters/*/chat', async (route) => { await gate; await route.continue() })
  await openCharacter(page)
  await question(page)
  await expect(page.locator('.chat-loading')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Tự đọc câu trả lời' }).uncheck()
  release()
  await expect(page.locator('.chat-answer')).toContainText('938')
  expect((await stats(page)).played).toBe(0)
  await page.getByRole('button', { name: 'Nghe câu trả lời 1', exact: true }).click()
  await expect(page.locator('.chat-avatar')).toHaveClass(/is-speaking/)
  await page.getByRole('button', { name: 'Bắt đầu cuộc trò chuyện mới' }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
  await expect(page.locator('.chat-avatar')).not.toHaveClass(/is-speaking/)
  expect((await stats(page)).paused).toBe(1)
})

test('stopping pending speech prevents late audio playback', async ({ page }) => {
  await installVoiceMocks(page)
  let release = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/characters/*/speech', async (route) => { await gate; await route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('mock-audio') }).catch(() => {}) })
  await openCharacter(page)
  await question(page)
  await expect(page.getByText('Đang tạo giọng đọc…', { exact: true })).toBeVisible()
  await expect(page.locator('.chat-avatar')).not.toHaveClass(/is-speaking/)
  await page.getByRole('button', { name: 'Dừng giọng nói' }).click()
  const finished = page.waitForEvent('requestfinished', { predicate: (request) => request.url().endsWith('/speech'), timeout: 2000 }).catch(() => null)
  release()
  await finished
  expect((await stats(page)).played).toBe(0)
  await expect(page.locator('.chat-avatar')).not.toHaveClass(/is-speaking/)
})

test('browser fallback uses Vietnamese and per-character prosody, and stops when opening a source', async ({ page }) => {
  await installVoiceMocks(page)
  await mockUnconfigured(page)
  await openCharacter(page)
  await question(page)
  await expect(page.locator('.chat-avatar')).toHaveClass(/is-speaking/)
  const utterance = (await stats(page)).utterances[0]
  expect(utterance.lang).toBe('vi-VN')
  expect(utterance.rate).toBe(0.92)
  expect(utterance.pitch).toBe(0.96)
  expect(utterance.text).not.toContain('[1]')
  await page.locator('.chat-sources button').first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await stats(page)).canceled).toBe(1)
})

test('missing Vietnamese voice and unsupported microphone keep text chat usable on mobile', async ({ page }) => {
  await installVoiceMocks(page, false, false)
  await mockUnconfigured(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openCharacter(page)
  await expect(page.getByRole('button', { name: 'Nói câu hỏi' })).toBeDisabled()
  await question(page)
  await expect(page.locator('.chat-answer')).toContainText('938')
  await expect(page.getByText('Máy chưa có giọng đọc tiếng Việt.', { exact: false })).toBeVisible()
  expect((await stats(page)).utterances).toHaveLength(0)
  expect(await page.locator('.chat-modal').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/character-voice-mobile.png' })
})

test('mic transcribes into editable input, waits for send and reports denied permission', async ({ page }) => {
  await installVoiceMocks(page)
  await mockAzure(page)
  await openCharacter(page)
  await page.getByRole('button', { name: 'Nói câu hỏi' }).click()
  await expect(page.getByText('Đang nghe…', { exact: false })).toBeVisible()
  await page.evaluate(() => (window as unknown as { __voiceTest: { transcript: (text: string) => void } }).__voiceTest.transcript('Ngô Quyền thắng trận Bạch Đằng năm nào?'))
  await expect(page.locator('#chat-input')).toHaveValue('Ngô Quyền thắng trận Bạch Đằng năm nào?')
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
  await page.getByRole('button', { name: 'Gửi câu hỏi', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  await expect(page.locator('.chat-avatar')).toHaveClass(/is-speaking/)
  await page.getByRole('button', { name: 'Nói câu hỏi' }).click()
  await expect(page.locator('.chat-avatar')).not.toHaveClass(/is-speaking/)
  await page.evaluate(() => (window as unknown as { __voiceTest: { micError: (error: string) => void } }).__voiceTest.micError('not-allowed'))
  await expect(page.getByText('Chưa được phép dùng mic.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nói câu hỏi' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('#chat-input')).not.toHaveAttribute('readonly')
  await page.getByRole('button', { name: 'Nói câu hỏi' }).click()
  await page.keyboard.press('Escape')
  expect((await stats(page)).micAborted).toBeGreaterThan(0)
})

test('Azure quota errors leave citations and text visible without a browser fallback', async ({ page }) => {
  await installVoiceMocks(page)
  await page.route('**/api/characters/*/speech', (route) => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SPEECH_QUOTA_EXCEEDED', message: 'Đã hết lượt đọc Azure hôm nay.' } }) }))
  await openCharacter(page)
  await question(page)
  await expect(page.getByText('Đã hết lượt đọc Azure hôm nay.', { exact: true })).toBeVisible()
  await expect(page.locator('.chat-answer')).toContainText('938')
  await expect(page.locator('.chat-sources')).toBeVisible()
  expect((await stats(page)).played).toBe(0)
  expect((await stats(page)).utterances).toHaveLength(0)
})

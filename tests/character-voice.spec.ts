import { expect, test, type Page } from '@playwright/test'
import { signInAsMember } from './member'

// Character conversations are for signed-in members.
test.beforeEach(({ page }) => signInAsMember(page))

type VoiceAction = 'beginStudentSpeech' | 'endStudentSpeech' | 'interimTranscript' | 'endMic' | 'lateMicSpeech' | 'finishUtterance' | 'pauseUtterance' | 'resumeUtterance' | 'failUtterance' | 'repeatFirstEnd' | 'lateUtteranceEvents' | 'pauseAudio'
const voiceAction = (page: Page, action: VoiceAction, text = '') => page.evaluate(({ action, text }) => (window as unknown as { __voiceTest: Record<VoiceAction, (text: string) => void> }).__voiceTest[action](text), { action, text })

async function installVoiceMocks(page: Page, hasVietnameseVoice = true, hasMic = true, deferPlayback = false) {
  await page.addInitScript(({ hasVietnameseVoice, hasMic, deferPlayback }) => {
    const state = { played: 0, paused: 0, canceled: 0, micAborted: 0, utterances: [] as { text: string; lang: string; rate: number; pitch: number }[], transcript: (_text: string) => {}, micError: (_error: string) => {}, startAudio: () => {}, finishAudio: () => {}, pauseAudio: () => {}, finishUtterance: () => {}, pauseUtterance: () => {}, resumeUtterance: () => {}, failUtterance: () => {}, repeatFirstEnd: () => {}, lateUtteranceEvents: () => {}, beginStudentSpeech: () => {}, endStudentSpeech: () => {}, interimTranscript: (_text: string) => {}, endMic: () => {}, lateMicSpeech: () => {} }
    Object.defineProperty(window, '__voiceTest', { value: state })
    class MockAudio {
      onplaying: (() => void) | null = null
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      onpause: (() => void) | null = null
      async play() { state.played++; state.startAudio = () => this.onplaying?.(); if (!deferPlayback) state.startAudio(); state.finishAudio = () => this.onended?.(); state.pauseAudio = () => this.onpause?.() }
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
      onpause: (() => void) | null = null
      onresume: (() => void) | null = null
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance })
    const synth = new EventTarget() as EventTarget & { getVoices: () => unknown[]; speak: (utterance: MockUtterance) => void; cancel: () => void; paused: boolean; resume: () => void }
    synth.getVoices = () => hasVietnameseVoice ? [{ name: 'Vietnamese demo', lang: 'vi-VN' }] : [{ name: 'English demo', lang: 'en-US' }]
    synth.paused = false
    synth.resume = () => { synth.paused = false }
    synth.speak = (utterance) => {
      state.utterances.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate, pitch: utterance.pitch })
      state.finishUtterance = () => utterance.onend?.()
      state.pauseUtterance = () => { synth.paused = true; utterance.onpause?.() }
      state.resumeUtterance = () => { synth.paused = false; utterance.onresume?.() }
      state.failUtterance = () => utterance.onerror?.()
      const end = utterance.onend, start = utterance.onstart, resume = utterance.onresume
      if (state.utterances.length === 1) state.repeatFirstEnd = () => end?.()
      state.lateUtteranceEvents = () => { start?.(); resume?.(); end?.() }
      utterance.onstart?.()
    }
    synth.cancel = () => { state.canceled++ }
    Object.defineProperty(window, 'speechSynthesis', { value: synth })
    class MockRecognition {
      lang = ''; continuous = false; interimResults = false
      onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null
      onend: (() => void) | null = null
      onspeechstart: (() => void) | null = null
      onspeechend: (() => void) | null = null
      start() {
        state.transcript = (text) => { this.onresult?.({ results: [[{ transcript: text }]] }); this.onend?.() }
        state.micError = (error) => { this.onerror?.({ error }) }
        state.beginStudentSpeech = () => this.onspeechstart?.()
        state.endStudentSpeech = () => this.onspeechend?.()
        state.interimTranscript = (text) => this.onresult?.({ results: [[{ transcript: text }]] })
        state.endMic = () => this.onend?.()
        const speechStart = this.onspeechstart
        state.lateMicSpeech = () => speechStart?.()
      }
      abort() { state.micAborted++ }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: hasMic ? MockRecognition : undefined })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined })
  }, { hasVietnameseVoice, hasMic, deferPlayback })
}

const stats = (page: Page) => page.evaluate(() => (window as unknown as { __voiceTest: { played: number; paused: number; canceled: number; micAborted: number; utterances: { text: string; lang: string; rate: number; pitch: number }[] } }).__voiceTest)
async function openCharacter(page: Page, name = 'Ngô Quyền', mode: 'Nhắn tin' | 'Nói chuyện' = 'Nói chuyện') {
  await page.goto('/home#characters')
  await page.locator('.character-card').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: mode, exact: true }).click()
}
const switchTo = (page: Page, mode: 'Nhắn tin' | 'Nói chuyện') => page.getByRole('group', { name: 'Chế độ trò chuyện' }).getByRole('button', { name: mode, exact: true }).click()
const question = (page: Page) => page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
async function mockAzure(page: Page) {
  await page.route('**/api/characters/*/speech', (route) => route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('mock-audio') }))
}
async function mockUnconfigured(page: Page) {
  await page.route('**/api/characters/*/speech', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SPEECH_NOT_CONFIGURED' } }) }))
}

async function expectClosedMouth(page: Page) {
  await expect(page.locator('.character-stage')).toHaveAttribute('data-mouth', 'closed')
  await expect(page.locator('.actor-mouth-closed')).toHaveCSS('opacity', '1')
  await expect(page.locator('.actor-mouth-open')).toHaveCSS('opacity', '0')
  await expect(page.locator('.actor-mouth-open')).toHaveCSS('animation-name', 'none')
}

test('text and voice have separate layouts; switching preserves history and drafts and stops playback', async ({ page }) => {
  await installVoiceMocks(page)
  await mockAzure(page)
  await openCharacter(page, 'Ngô Quyền', 'Nhắn tin')
  await expect(page.locator('#chat-input')).toBeFocused()
  await expect(page.locator('.character-stage')).toHaveCount(0)
  await expect(page.locator('.voice-mic')).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: 'Tự đọc câu trả lời' })).toHaveCount(0)
  await question(page)
  await expect(page.locator('.chat-answer')).toContainText('938')
  expect((await stats(page)).played).toBe(0)
  await page.locator('#chat-input').fill('Chiến thắng có ý nghĩa gì?')
  await switchTo(page, 'Nói chuyện')
  await expect(page.locator('.voice-mic')).toBeFocused()
  await expect(page.locator('.voice-answer')).toContainText('938')
  await expect(page.locator('.voice-transcript')).toHaveText('Chiến thắng có ý nghĩa gì?')
  await expect(page.locator('#chat-input')).toHaveCount(0)
  await expect(page.locator('.chat-body')).toHaveCount(0)
  await expect(page.locator('.chat-sources')).toHaveCount(0)
  expect((await stats(page)).played).toBe(0)
  await page.getByRole('button', { name: 'Nghe câu trả lời 1', exact: true }).click()
  await expect(page.locator('.character-stage')).toHaveAttribute('data-mouth', 'speaking')
  await switchTo(page, 'Nhắn tin')
  expect((await stats(page)).paused).toBe(1)
  await expect(page.locator('#chat-input')).toHaveValue('Chiến thắng có ý nghĩa gì?')
  await expect(page.locator('.chat-answer')).toContainText('938')
  await expect(page.locator('.chat-sources')).toBeVisible()
  await page.getByRole('button', { name: 'Nghe câu trả lời 1', exact: true }).click()
  await expect(page.locator('.voice-answer')).toContainText('938')
  await expect(page.locator('.character-stage')).toHaveAttribute('data-mouth', 'speaking')
})

test('voice transcript can be corrected in text mode; switching cancels mic and ignores late recognition', async ({ page }) => {
  await installVoiceMocks(page)
  await mockAzure(page)
  await openCharacter(page)
  await page.getByRole('button', { name: 'Nói câu hỏi', exact: true }).click()
  await voiceAction(page, 'interimTranscript', 'Bạch Đằng diễn ra năm nào')
  await page.getByRole('button', { name: 'Chỉnh nội dung' }).click()
  expect((await stats(page)).micAborted).toBe(1)
  await voiceAction(page, 'interimTranscript', 'Nội dung đến muộn')
  await expect(page.locator('#chat-input')).toBeFocused()
  await expect(page.locator('#chat-input')).toHaveValue('Bạch Đằng diễn ra năm nào')
  await page.locator('#chat-input').fill('Ngô Quyền thắng trận Bạch Đằng năm nào?')
  await page.getByRole('button', { name: 'Gửi câu hỏi', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  expect((await stats(page)).played).toBe(0)
  await switchTo(page, 'Nói chuyện')
  await expect(page.locator('.voice-answer')).toContainText('938')
  await expectClosedMouth(page)
  await expect(page.getByRole('button', { name: 'Nói câu hỏi', exact: true })).toHaveAttribute('aria-pressed', 'false')
})

test('a pending voice reply stays silent when the student switches to text', async ({ page }) => {
  await installVoiceMocks(page)
  await mockAzure(page)
  let release = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/characters/*/chat', async (route) => { await gate; await route.continue() })
  await openCharacter(page)
  await question(page)
  await expect(page.locator('.voice-loading')).toBeVisible()
  await switchTo(page, 'Nhắn tin')
  await expect(page.locator('.chat-loading')).toBeVisible()
  release()
  await expect(page.locator('.chat-answer')).toContainText('938')
  expect((await stats(page)).played).toBe(0)
  await switchTo(page, 'Nói chuyện')
  await expect(page.locator('.voice-answer')).toContainText('938')
  expect((await stats(page)).played).toBe(0)
})

test('other historical characters retain a usable voice portrait and separate text mode', async ({ page }) => {
  await installVoiceMocks(page)
  await mockAzure(page)
  await openCharacter(page, 'Lý Công Uẩn')
  await expect(page.locator('.character-stage--static img')).toBeVisible()
  await expect(page.locator('.stage-caption strong')).toHaveText('Lý Công Uẩn')
  await page.getByRole('button', { name: 'Nghe lời chào', exact: true }).click()
  await expect(page.locator('.chat-avatar')).toHaveClass(/is-speaking/)
  await switchTo(page, 'Nhắn tin')
  await expect(page.locator('.character-stage')).toHaveCount(0)
  await expect(page.locator('#chat-input')).toBeFocused()
  expect((await stats(page)).paused).toBe(1)
})

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
  await expect(page.locator('.voice-loading')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Tự đọc câu trả lời' }).uncheck()
  release()
  await expect(page.locator('.voice-answer')).toContainText('938')
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
  await page.getByRole('button', { name: 'Xem văn bản và nguồn' }).click()
  await page.locator('.chat-sources button').first().click()
  // The chat closes and the cited lesson opens in the reader (itself a dialog), so wait for the chat specifically.
  await expect(page.locator('dialog.chat-modal')).toHaveCount(0)
  expect((await stats(page)).canceled).toBe(1)
})

test('missing Vietnamese voice and unsupported microphone keep text chat usable on mobile', async ({ page }) => {
  await installVoiceMocks(page, false, false)
  await mockUnconfigured(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openCharacter(page)
  await expect(page.getByRole('button', { name: 'Nói câu hỏi' })).toBeDisabled()
  await question(page)
  await expect(page.locator('.voice-answer')).toContainText('938')
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
  await expect(page.locator('.voice-transcript')).toHaveText('Ngô Quyền thắng trận Bạch Đằng năm nào?')
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
  await page.getByRole('button', { name: 'Gửi câu hỏi', exact: true }).click()
  await expect(page.locator('.voice-answer')).toContainText('938')
  await expect(page.locator('.chat-avatar')).toHaveClass(/is-speaking/)
  await page.getByRole('button', { name: 'Nói câu hỏi' }).click()
  await expect(page.locator('.chat-avatar')).not.toHaveClass(/is-speaking/)
  await page.evaluate(() => (window as unknown as { __voiceTest: { micError: (error: string) => void } }).__voiceTest.micError('not-allowed'))
  await expect(page.getByText('Chưa được phép dùng mic.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nói câu hỏi' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('#chat-input')).toHaveCount(0)
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
  await expect(page.locator('.voice-answer')).toContainText('938')
  await page.getByRole('button', { name: 'Xem văn bản và nguồn' }).click()
  await expect(page.locator('.chat-sources')).toBeVisible()
  expect((await stats(page)).played).toBe(0)
  expect((await stats(page)).utterances).toHaveLength(0)
})

const animatedPeople = [
  { name: 'Ngô Quyền', id: 'ngo-quyen', prompt: 'Bạch Đằng diễn ra năm nào?' },
  { name: 'Trần Hưng Đạo', id: 'tran-hung-dao', prompt: 'Bạch Đằng diễn ra năm nào?' },
  { name: 'Hồ Chí Minh', id: 'ho-chi-minh', prompt: 'Nguyễn Tất Thành ra đi tìm đường cứu nước năm nào?' },
  { name: 'Võ Nguyên Giáp', id: 'vo-nguyen-giap', prompt: 'Điện Biên Phủ diễn ra năm nào?' },
]

for (const { name, id, prompt } of animatedPeople) {
  test(`${name} animates listening, waits for actual playback, and returns to rest on stop/end/reset`, async ({ page }) => {
    await installVoiceMocks(page, true, true, true)
    await mockAzure(page)
    let release = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/characters/*/chat', async (route) => { await gate; await route.continue() })
    await openCharacter(page, name)
    const stage = page.locator('.character-stage')
    await expect(stage).toHaveAttribute('data-activity', 'idle')
    await expect(stage).toHaveAttribute('data-ready', 'true')
    await expect(stage.getByRole('img')).toHaveAccessibleName(new RegExp(name))
    await page.getByRole('button', { name: 'Nói câu hỏi', exact: true }).click()
    await expect(stage).toHaveAttribute('data-activity', 'listening')
    await expectClosedMouth(page)
    expect(await stage.locator('.actor-head').evaluate((node) => getComputedStyle(node).animationName)).toBe('actor-listen')
    await voiceAction(page, 'beginStudentSpeech')
    await expect(stage).toHaveAttribute('data-mouth', 'responding')
    await expect(stage.locator('.actor-mouth-open')).toHaveCSS('animation-name', 'actor-listen-mouth')
    const mouthTransform = await stage.locator('.actor-mouth-open').evaluate((node) => getComputedStyle(node).transform)
    await expect.poll(() => stage.locator('.actor-mouth-open').evaluate((node) => getComputedStyle(node).transform)).not.toBe(mouthTransform)
    await stage.screenshot({ path: `test-results/listening-response-${id}.png` })
    await voiceAction(page, 'endStudentSpeech')
    await expectClosedMouth(page)
    await expect(stage).toHaveAttribute('data-activity', 'listening')
    // A final recognition result can arrive after speechend, while the mic is still open.
    await voiceAction(page, 'interimTranscript', prompt)
    await expectClosedMouth(page)
    await page.evaluate((text) => (window as unknown as { __voiceTest: { transcript: (text: string) => void } }).__voiceTest.transcript(text), prompt)
    await expect(stage).toHaveAttribute('data-activity', 'idle')
    await expect(page.locator('.chat-exchange')).toHaveCount(0)
    await page.getByRole('button', { name: 'Gửi câu hỏi', exact: true }).click()
    await expect(stage).toHaveAttribute('data-activity', 'thinking')
    release()
    await expect(page.locator('.voice-answer')).toBeVisible()
    await expect(stage).toHaveAttribute('data-activity', 'loading')
    await expect.poll(async () => (await stats(page)).played).toBe(1)
    await page.evaluate(() => (window as unknown as { __voiceTest: { startAudio: () => void } }).__voiceTest.startAudio())
    await expect(stage).toHaveAttribute('data-activity', 'speaking')
    await expect(stage).toHaveAttribute('data-mouth', 'speaking')
    expect(await stage.locator('.actor-mouth-open').evaluate((node) => getComputedStyle(node).animationName)).toBe('actor-talk')
    expect(await stage.locator('.actor-forearm').evaluate((node) => getComputedStyle(node).animationName)).toBe('actor-gesture')
    await page.screenshot({ path: `test-results/animated-${id}-desktop.png` })
    await voiceAction(page, 'pauseAudio')
    await expectClosedMouth(page)
    await page.evaluate(() => (window as unknown as { __voiceTest: { startAudio: () => void } }).__voiceTest.startAudio())
    await expect(stage).toHaveAttribute('data-mouth', 'speaking')
    await page.evaluate(() => (window as unknown as { __voiceTest: { finishAudio: () => void } }).__voiceTest.finishAudio())
    await expect(stage).toHaveAttribute('data-activity', 'idle')
    await expectClosedMouth(page)
    await page.getByRole('button', { name: 'Nghe câu trả lời 1', exact: true }).click()
    await expect.poll(async () => (await stats(page)).played).toBe(2)
    await page.evaluate(() => (window as unknown as { __voiceTest: { startAudio: () => void } }).__voiceTest.startAudio())
    await expect(stage).toHaveAttribute('data-activity', 'speaking')
    await page.getByRole('button', { name: 'Nói câu hỏi', exact: true }).click()
    await expect(stage).toHaveAttribute('data-activity', 'listening')
    await expect(page.locator('.chat-avatar')).not.toHaveClass(/is-speaking/)
    await page.getByRole('button', { name: 'Bắt đầu cuộc trò chuyện mới' }).click()
    await expect(stage).toHaveAttribute('data-activity', 'idle')
    await expect(page.locator('.chat-exchange')).toHaveCount(0)
    await page.getByRole('button', { name: 'Đóng trò chuyện', exact: true }).click()
    await expect(stage).toHaveCount(0)
    expect((await stats(page)).paused).toBe(2)
  })

  test(`${name} reads every browser speech chunk and closes the mouth only after the final chunk`, async ({ page }) => {
    await installVoiceMocks(page)
    await mockUnconfigured(page)
    const answer = `${'Chiến thắng Bạch Đằng cho thấy trí tuệ và tinh thần đoàn kết của nhân dân. '.repeat(12)}Câu chuyện đến đây là hết. [1]`
    await page.route('**/api/characters/*/chat', (route) => route.fulfill({ json: { characterId: id, mode: 'textbook', kind: 'grounded', answer, sources: [], suggestions: [], relatedLessons: [] } }))
    await openCharacter(page, name)
    await expect(page.locator('.character-stage')).toHaveAttribute('data-ready', 'true')
    await page.locator('.voice-prompts button').first().click()
    const stage = page.locator('.character-stage')
    await expect(stage).toHaveAttribute('data-mouth', 'speaking')
    await voiceAction(page, 'finishUtterance')
    await expect.poll(async () => (await stats(page)).utterances.length).toBe(2)
    await voiceAction(page, 'repeatFirstEnd')
    expect((await stats(page)).utterances).toHaveLength(2)
    await expect(stage).toHaveAttribute('data-mouth', 'speaking')
    await voiceAction(page, 'pauseUtterance')
    await expectClosedMouth(page)
    await voiceAction(page, 'resumeUtterance')
    await expect(stage).toHaveAttribute('data-mouth', 'speaking')
    for (let i = 0; i < 15; i++) {
      const count = (await stats(page)).utterances.length
      await voiceAction(page, 'finishUtterance')
      await expect.poll(async () => await stage.getAttribute('data-mouth') === 'closed' || (await stats(page)).utterances.length > count).toBe(true)
      if (await stage.getAttribute('data-mouth') === 'closed') break
      await expect(stage).toHaveAttribute('data-mouth', 'speaking')
    }
    await expectClosedMouth(page)
    await expect(stage).toHaveAttribute('data-activity', 'idle')
    expect((await stats(page)).utterances.map((utterance) => utterance.text).join(' ')).toBe(answer.replace(/\[\d+\]/g, '').trim())
    await voiceAction(page, 'lateUtteranceEvents')
    await expectClosedMouth(page)
    await page.screenshot({ path: `test-results/finished-reading-${id}.png` })
  })

  test(`${name} painted portrait keeps its likeness, Vietnamese labels and controls across screen sizes`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await installVoiceMocks(page)
    await mockAzure(page)
    await openCharacter(page, name)
    await expect(page.locator('.character-stage')).toHaveAttribute('data-ready', 'true')
    await expect(page.locator('.portrait-source')).toHaveAttribute('href', `/images/characters/${id}.webp`)
    await expect(page.locator('.stage-caption strong')).toHaveText(name)
    await expect(page.locator('.stage-topline')).toContainText('HOẠT HÌNH 2D')
    await expect(page.locator('.character-animation-intro')).toHaveCount(0)
    for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport)
      await expect(page.locator('.stage-caption strong')).toBeInViewport()
      await expect(page.locator('.stage-status')).toBeInViewport()
      await expect(page.locator('.stage-disclaimer')).toBeInViewport()
      await expect(page.locator('.voice-main-controls')).toBeInViewport()
      await expect(page.locator('.voice-caption')).toBeInViewport()
      await expect(page.locator('#chat-input')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Đóng trò chuyện', exact: true })).toBeInViewport()
      expect(await page.locator('.chat-modal').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.locator('.character-stage').evaluate((node) => node.getAnimations({ subtree: true }).forEach((animation) => { animation.pause(); animation.currentTime = 0 }))
      await page.screenshot({ path: `test-results/painted-${id}-${viewport.width}.png` })
    }
    expect(errors).toEqual([])
  })
}

test('browser speech stop and errors close the mouth and ignore late playback callbacks', async ({ page }) => {
  await installVoiceMocks(page)
  await mockUnconfigured(page)
  await openCharacter(page)
  await page.getByRole('button', { name: 'Nghe lời chào', exact: true }).click()
  await expect(page.locator('.character-stage')).toHaveAttribute('data-mouth', 'speaking')
  await voiceAction(page, 'pauseUtterance')
  await expectClosedMouth(page)
  await page.getByRole('button', { name: 'Dừng giọng nói', exact: true }).click()
  await voiceAction(page, 'lateUtteranceEvents')
  await expectClosedMouth(page)
  await page.getByRole('button', { name: 'Nghe lời chào', exact: true }).click()
  await expect(page.locator('.character-stage')).toHaveAttribute('data-mouth', 'speaking')
  await voiceAction(page, 'failUtterance')
  await expectClosedMouth(page)
  await expect(page.locator('.chat-voice-notice')).toContainText('Chưa phát được giọng đọc')
  await voiceAction(page, 'lateUtteranceEvents')
  await expectClosedMouth(page)
})

test('native audio playback automatically restores the normal mouth at the real ended event', async ({ page }) => {
  // One second of silent PCM exercises real browser media events, without a paid TTS call.
  const wav = Buffer.alloc(44 + 8000 * 2)
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34)
  wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40)
  await page.route('**/api/characters/*/speech', (route) => route.fulfill({ contentType: 'audio/wav', body: wav }))
  await openCharacter(page)
  await page.getByRole('button', { name: 'Nghe lời chào', exact: true }).click()
  await expect(page.locator('.character-stage')).toHaveAttribute('data-mouth', 'speaking')
  await expectClosedMouth(page)
  await expect(page.locator('.character-stage')).toHaveAttribute('data-activity', 'idle')
  await expect(page.getByRole('button', { name: 'Nghe lời chào', exact: true })).toBeVisible()
})

test('interim recognition animates listening without speech events and clears on silence, mic end and denial', async ({ page }) => {
  await installVoiceMocks(page)
  await openCharacter(page)
  const stage = page.locator('.character-stage')
  await page.getByRole('button', { name: 'Nói câu hỏi', exact: true }).click()
  await expectClosedMouth(page)
  await voiceAction(page, 'interimTranscript', 'Cho em hỏi về Bạch Đằng')
  await expect(stage).toHaveAttribute('data-mouth', 'responding')
  await expectClosedMouth(page)
  await expect(stage).toHaveAttribute('data-activity', 'listening')
  await voiceAction(page, 'interimTranscript', 'Trận Bạch Đằng diễn ra')
  await expect(stage).toHaveAttribute('data-mouth', 'responding')
  await voiceAction(page, 'endMic')
  await expectClosedMouth(page)
  await expect(stage).toHaveAttribute('data-activity', 'idle')
  await voiceAction(page, 'lateMicSpeech')
  await expectClosedMouth(page)
  await page.getByRole('button', { name: 'Nói câu hỏi', exact: true }).click()
  await voiceAction(page, 'beginStudentSpeech')
  await expect(stage).toHaveAttribute('data-mouth', 'responding')
  await page.evaluate(() => (window as unknown as { __voiceTest: { micError: (error: string) => void } }).__voiceTest.micError('not-allowed'))
  await expectClosedMouth(page)
  await voiceAction(page, 'lateMicSpeech')
  await expectClosedMouth(page)
  expect((await stats(page)).played).toBe(0)
  expect((await stats(page)).utterances).toHaveLength(0)
})

test('animated mobile conversation keeps the character and mic visible with reduced motion', async ({ page }) => {
  await installVoiceMocks(page)
  await mockAzure(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openCharacter(page)
  const stage = page.locator('.character-stage')
  await question(page)
  await expect(stage).toHaveAttribute('data-activity', 'speaking')
  expect(await stage.locator('.actor-mouth-open').evaluate((node) => getComputedStyle(node).animationName)).toBe('none')
  await page.getByRole('button', { name: 'Nói câu hỏi', exact: true }).click()
  await expect(stage).toHaveAttribute('data-activity', 'listening')
  await expect(stage).toBeInViewport()
  await expect(page.locator('.voice-transcript')).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Dừng microphone', exact: true })).toBeInViewport()
  expect(await page.locator('.chat-modal').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/animated-character-mobile.png' })
  await page.setViewportSize({ width: 360, height: 640 })
  await expect(page.locator('.voice-transcript')).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Đóng trò chuyện', exact: true })).toBeInViewport()
  await page.keyboard.press('Escape')
  expect((await stats(page)).micAborted).toBeGreaterThan(0)
})

import { expect, test, type Page } from '@playwright/test'
import { memberSession as minhSession, signInAsMember } from './member'

const prefix = 'xuyen-su-ky-chat-v1'
const sessionKey = 'xuyen-su-ky-demo-v1'
const minh = 'minh%40xuyensuki.vn'
// Conversations need a signed-in member; the account tests sign in and out themselves.
test.beforeEach(({ page }, testInfo) => { if (!testInfo.titlePath.includes('accounts')) return signInAsMember(page) })

const openMenu = (page: Page, name: string) => page.getByRole('navigation', { name: 'Các khu vực' }).getByRole('link', { name, exact: true }).click()
const card = (page: Page, name: string) => page.locator('.character-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
async function openCharacter(page: Page, name: string, mode: 'Nhắn tin' | 'Nói chuyện' = 'Nhắn tin') {
  await page.goto('/home#characters')
  await card(page, name).getByRole('button', { name: mode, exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}
const ask = async (page: Page, question: string) => {
  await page.locator('#chat-input').fill(question)
  await page.keyboard.press('Enter')
}
const stored = (page: Page, owner: string, character: string) => page.evaluate(([key]) => localStorage.getItem(key), [`${prefix}:${encodeURIComponent(owner)}:${character}`])
const storedKeys = (page: Page) => page.evaluate((chatPrefix) => Object.keys(localStorage).filter((key) => key.startsWith(chatPrefix)).sort(), prefix)
async function useSession(page: Page, session: object) {
  await page.goto('/home#characters')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [sessionKey, JSON.stringify(session)])
}

test('conversation survives reload, close and source lessons, and text and voice modes share it', async ({ page }) => {
  await openCharacter(page, 'Ngô Quyền')
  await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  await expect(page.locator('.chat-time')).toHaveCount(1)

  // Closing and reopening the modal.
  await page.keyboard.press('Escape')
  await expect(page.locator('.chat-modal')).toHaveCount(0)
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  await expect(page.locator('.chat-history-note')).toContainText('Đã khôi phục')

  // Opening the source lesson and coming back.
  await page.locator('.chat-sources button').first().click()
  await expect(page.locator('.chat-modal')).toHaveCount(0)
  // The lesson loads before the reader opens; closing it any earlier lets it open later over the character cards.
  await expect(page.locator('.lesson-reader')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.lesson-reader')).toHaveCount(0)
  await openMenu(page, 'Nhân vật AI')
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('.chat-answer')).toHaveCount(1)
  await expect(page.locator('.chat-sources small').first()).toContainText('trang PDF')

  // A full page reload, then the other mode of the same character.
  await page.reload()
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nói chuyện', exact: true }).click()
  await expect(page.locator('.voice-current-question')).toContainText('Bạch Đằng năm nào')
  await expect(page.locator('.voice-answer')).toContainText('938')
  await page.getByRole('button', { name: 'Xem văn bản và nguồn' }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(1)
  await ask(page, 'Vì sao thắng lợi?')
  await expect(page.locator('.chat-answer')).toHaveCount(2)
  await page.reload()
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(2)

  // Only text is on disk: no audio, key, error or loading state.
  const raw = (await stored(page, minhSession.userId, 'ngo-quyen')) || ''
  const record = JSON.parse(raw)
  expect(record.version).toBe(1)
  expect(record.exchanges).toHaveLength(2)
  expect(record.exchanges[0]).toMatchObject({ question: 'Ngô Quyền thắng trận Bạch Đằng năm nào?' })
  expect(record.exchanges[0].askedAt).toBeGreaterThan(0)
  expect(record.exchanges[0].answeredAt).toBeGreaterThanOrEqual(record.exchanges[0].askedAt)
  expect(record.exchanges[0].reply.sources[0].source.pageStart).toBeGreaterThan(0)
  expect(raw).not.toMatch(/audio|apiKey|loading|"error"/i)
})

test('each character keeps its own conversation and starting over clears only the open one', async ({ page }) => {
  await openCharacter(page, 'Ngô Quyền')
  await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  await page.keyboard.press('Escape')

  await card(page, 'Lý Công Uẩn').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
  await expect(page.locator('.chat-history-note')).toHaveCount(0)
  await page.getByRole('button', { name: 'Lý Công Uẩn dời đô năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('1010')
  expect(await storedKeys(page)).toEqual([`${prefix}:${minh}:ly-cong-uan`, `${prefix}:${minh}:ngo-quyen`])

  await page.getByRole('button', { name: 'Bắt đầu cuộc trò chuyện mới' }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
  expect(await storedKeys(page)).toEqual([`${prefix}:${minh}:ngo-quyen`])
  await page.reload()
  await card(page, 'Lý Công Uẩn').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
})

test.describe('accounts', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('a guest cannot open a conversation and never sees the account history; signing back in restores it', async ({ page }) => {
    await page.goto('/dang-nhap')
    await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
    await page.locator('.login-form button[type=submit]').click()
    await page.locator('.grade-onboarding .button-primary').click()
    await expect(page).toHaveURL(/\/home$/)
    await openMenu(page, 'Nhân vật AI')
    await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
    await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
    await expect(page.locator('.chat-answer')).toContainText('938')
    expect(await storedKeys(page)).toEqual([`${prefix}:minh%40xuyensuki.vn:ngo-quyen`])
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Tài khoản' }).click()
    await page.getByRole('link', { name: 'Đăng xuất' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/dang-nhap')
    await page.getByRole('button', { name: /Học thử không cần tài khoản/ }).click()
    await expect(page).toHaveURL(/\/home$/)
    await openMenu(page, 'Nhân vật AI')
    await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Đăng nhập để tiếp tục' })).toContainText('Đăng nhập để nhắn tin với Ngô Quyền')
    await expect(page.locator('.chat-modal')).toHaveCount(0)
    await page.getByRole('button', { name: 'Đóng đăng nhập' }).click()
    expect(await storedKeys(page)).toEqual([`${prefix}:${minh}:ngo-quyen`])

    await page.goto('/')
    await page.getByRole('button', { name: 'Tài khoản: Khách' }).click()
    await page.getByRole('menuitem', { name: 'Thoát học thử' }).click()
    await page.goto('/dang-nhap')
    await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
    await page.locator('.login-form button[type=submit]').click()
    await expect(page).toHaveURL(/\/home$/)
    await openMenu(page, 'Nhân vật AI')
    await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
    await expect(page.locator('.chat-exchange')).toHaveCount(1)
    await expect(page.locator('.chat-exchange .user-bubble')).toHaveText('Ngô Quyền thắng trận Bạch Đằng năm nào?')
  })

  test('a display name is not an identity: another account with the same name has its own history', async ({ page }) => {
    await useSession(page, minhSession)
    await page.reload()
    await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
    await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
    await expect(page.locator('.chat-answer')).toContainText('938')
    await page.keyboard.press('Escape')
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [sessionKey, JSON.stringify({ ...minhSession, userId: 'minh@khac.example' })])
    await page.reload()
    await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
    await expect(page.locator('.chat-exchange')).toHaveCount(0)
  })

  test('a signed-in session without a stable id still chats but is not stored', async ({ page }) => {
    const { userId: _userId, ...legacy } = minhSession
    await useSession(page, legacy)
    await page.reload()
    await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
    await expect(page.locator('.chat-history-note')).toContainText('không được lưu')
    await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
    await expect(page.locator('.chat-answer')).toContainText('938')
    expect(await storedKeys(page)).toEqual([])
  })
})

test('corrupt, outdated or mismatched stored data is ignored and chatting still works', async ({ page }) => {
  await page.goto('/home#characters')
  const key = `${prefix}:${minh}:ngo-quyen`
  for (const raw of ['{khong-phai-json', JSON.stringify({ version: 0, owner: minhSession.userId, characterId: 'ngo-quyen', exchanges: [] }), JSON.stringify({ version: 1, owner: 'khac@xuyensuki.vn', characterId: 'ngo-quyen', exchanges: [{ id: 'x', question: 'Của người khác', askedAt: 1, answeredAt: 2, reply: { mode: 'textbook', answer: 'RIENG-TU-CUA-NGUOI-KHAC', sources: [] } }] })]) {
    await page.evaluate(([name, value]) => localStorage.setItem(name, value), [key, raw])
    await page.reload()
    await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
    await expect(page.locator('.chat-history-note')).toContainText('bị lỗi hoặc không còn tương thích')
    await expect(page.locator('.chat-exchange')).toHaveCount(0)
    await expect(page.getByText('RIENG-TU-CUA-NGUOI-KHAC')).toHaveCount(0)
    await expect.poll(() => stored(page, minhSession.userId, 'ngo-quyen')).toBeNull()
    await page.keyboard.press('Escape')
  }
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  expect(JSON.parse((await stored(page, minhSession.userId, 'ngo-quyen'))!).exchanges).toHaveLength(1)
})

test('a full or blocked storage warns but never stops the conversation', async ({ page }) => {
  await page.addInitScript((chatPrefix) => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith(chatPrefix)) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  }, prefix)
  await openCharacter(page, 'Ngô Quyền')
  await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('938')
  await expect(page.locator('.chat-history-note')).toContainText('Không lưu được')
  await ask(page, 'Vì sao thắng lợi?')
  await expect(page.locator('.chat-answer')).toHaveCount(2)
  expect(await storedKeys(page)).toEqual([])
})

test('a reply that arrives after the modal was closed or another character opened is not saved anywhere', async ({ page }) => {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/characters/ngo-quyen/chat', async (route) => { await gate; await route.continue().catch(() => {}) })
  await openCharacter(page, 'Ngô Quyền')
  await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
  await expect(page.locator('.chat-loading')).toBeVisible()
  // The unanswered question is not stored while the request is in flight.
  expect(await storedKeys(page)).toEqual([])
  await page.keyboard.press('Escape')
  await card(page, 'Lý Công Uẩn').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  release()
  await page.waitForTimeout(800)
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
  await page.getByRole('button', { name: 'Lý Công Uẩn dời đô năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer')).toContainText('1010')
  expect(await storedKeys(page)).toEqual([`${prefix}:${minh}:ly-cong-uan`])
  await page.keyboard.press('Escape')
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(0)
})

test('only the last three answered turns are still sent as context after a restore', async ({ page }) => {
  await openCharacter(page, 'Ngô Quyền')
  await page.getByRole('button', { name: 'Ngô Quyền thắng trận Bạch Đằng năm nào?', exact: true }).click()
  await expect(page.locator('.chat-answer')).toHaveCount(1)
  for (const [count, question] of [[2, 'Vì sao thắng lợi?'], [3, 'Chiến thắng có ý nghĩa gì?'], [4, 'Bạch Đằng ở đâu?']] as const) {
    await ask(page, question)
    await expect(page.locator('.chat-answer')).toHaveCount(count)
  }
  await page.reload()
  await card(page, 'Ngô Quyền').getByRole('button', { name: 'Nhắn tin', exact: true }).click()
  await expect(page.locator('.chat-exchange')).toHaveCount(4)
  let payload: { history: { role: string; content: string }[] } | undefined
  await page.route('**/api/characters/ngo-quyen/chat', async (route) => { payload = route.request().postDataJSON(); await route.continue() })
  await ask(page, 'Kể thêm về Ngô Quyền.')
  await expect(page.locator('.chat-exchange')).toHaveCount(5)
  await expect.poll(() => payload?.history.length).toBe(6)
  expect(payload!.history[0].content).toBe('Vì sao thắng lợi?')
})

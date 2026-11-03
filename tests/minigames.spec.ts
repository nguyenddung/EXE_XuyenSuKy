import { expect, test, type Page } from '@playwright/test'
import { milestones, pairs, cases, decisions } from '../src/data/minigames'
async function open(page: Page, index: number) { await page.goto('/'); await page.locator('.game-card-bottom button').nth(index).click(); await expect(page.getByRole('dialog')).toBeVisible() }
async function xp(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem('xuyen-su-ky-demo-v1')!).earnedXp) }
async function arrange(page: Page) { for (let target = 0; target < milestones.length; target++) { let index = (await page.locator('.timeline-puzzle li').allTextContents()).findIndex(text => text.includes(milestones[target].label)); while (index > target) { await page.locator('.timeline-puzzle li').nth(index).press('ArrowUp'); index-- } } }
test('timeline supports hints, wrong answers, completion, persistence and replay without duplicate XP', async ({ page }) => {
  await open(page, 0); await arrange(page); await page.locator('.timeline-puzzle li').first().press('ArrowDown'); await page.getByRole('button', { name: 'Kiểm tra dòng sử' }).click(); await expect(page.locator('.game-feedback')).toContainText('3/5'); expect(await xp(page)).toBe(0)
  await page.getByRole('button', { name: 'Gợi ý năm' }).click(); await expect(page.locator('.timeline-puzzle small')).toHaveCount(5); await arrange(page); await page.getByRole('button', { name: 'Kiểm tra dòng sử' }).click(); await expect(page.locator('.game-result')).toBeVisible(); expect(await xp(page)).toBe(60)
  await page.getByRole('dialog').getByRole('button', { name: 'Chơi lại', exact: true }).click(); await arrange(page); await page.getByRole('button', { name: 'Kiểm tra dòng sử' }).click(); expect(await xp(page)).toBe(60); expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xuyen-su-ky-demo-v1')!).gameRecords.timeline)).toBe(3); await page.keyboard.press('Escape'); await page.reload(); await expect(page.locator('.arcade-progress')).toContainText('1/4'); expect(await xp(page)).toBe(60)
})
test('memory matches four semantic pairs and explains mistakes', async ({ page }) => {
  await open(page, 1); const tiles = page.locator('.memory-tile'); const known = new Map<number, string>()
  // Scout all cards just as a player would: only read a card after revealing it.
  for (let i = 0; i < 8; i += 2) { await tiles.nth(i).click(); known.set(i, (await tiles.nth(i).innerText()).trim()); await tiles.nth(i + 1).click(); known.set(i + 1, (await tiles.nth(i + 1).innerText()).trim()); await expect(page.locator('.game-feedback')).toBeVisible(); await page.locator('.minigame-body .button-primary').click() }
  for (const pair of pairs) { if (await page.locator('.game-result').count()) break; const indices = [...known].filter(([, text]) => text === pair.name || text === pair.legacy).map(([index]) => index); expect(indices).toHaveLength(2); if (!(await tiles.nth(indices[0]).isDisabled())) { await tiles.nth(indices[0]).click(); await tiles.nth(indices[1]).click(); await expect(page.locator('.game-feedback')).toContainText(pair.explanation); await page.locator('.minigame-body .button-primary').click() } }
  await expect(page.locator('.game-result')).toBeVisible(); expect(await xp(page)).toBe(60)
})
test('detective eliminates wrong guesses and completes all three cases', async ({ page }) => {
  await open(page, 2)
  for (const item of cases) { const wrong = (item.answer + 1) % 4; await page.locator('.suspect').nth(wrong).click(); await expect(page.locator('.suspect').nth(wrong)).toBeDisabled(); await page.locator('.game-text-button').click(); await expect(page.locator('.clue-list p')).toHaveCount(2); await page.locator('.suspect').nth(item.answer).click(); await page.locator('.minigame-body .button-primary').click() }
  await expect(page.locator('.game-result')).toBeVisible(); expect(await xp(page)).toBe(80)
})
test('strategy gives feedback, prevents advance on incorrect choices and awards once', async ({ page }) => {
  await open(page, 3)
  for (const item of decisions) { await page.locator('.strategy-options button').nth((item.answer + 1) % 3).click(); await expect(page.locator('.game-feedback')).toContainText('cân nhắc'); await expect(page.locator('.minigame-body .button-primary')).toHaveCount(0); await page.locator('.strategy-options button').nth(item.answer).click(); await expect(page.locator('.game-feedback')).toContainText(item.explanation); await page.locator('.minigame-body .button-primary').click() }
  await expect(page.locator('.game-result')).toBeVisible(); expect(await xp(page)).toBe(80); await page.keyboard.press('Escape'); await page.locator('.game-card-bottom button').nth(3).click(); await page.keyboard.press('Escape'); expect(await xp(page)).toBe(80)
})
test('mobile: both routes, image loading, modal focus and Escape restore', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  for (const route of ['/', '/home#challenges']) { await page.goto(route); for (let index = 0; index < 4; index++) { const trigger = page.locator('.game-card-bottom button').nth(index); await trigger.click(); await expect(page.locator('#game-title')).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(page.locator('.minigame-modal button:not(:disabled), .minigame-modal a[href]').last()).toBeFocused(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); await expect(page.getByRole('dialog')).toHaveCount(0) } }
  expect(errors).toEqual([])
})
test('timeline rows can be dragged into place with a mouse and keep keyboard focus when moved', async ({ page }) => {
  await open(page, 0)
  const rows = page.locator('.timeline-puzzle li')
  const last = (await rows.nth(4).locator('span').nth(1).textContent())!
  const from = (await rows.nth(4).boundingBox())!, to = (await rows.nth(0).boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, to.y + 4, { steps: 24 }); await page.mouse.up()
  await expect(rows.first()).toContainText(last)
  await rows.first().press('ArrowDown')
  await expect(rows.nth(1)).toContainText(last)
  await expect(rows.nth(1)).toBeFocused()
})

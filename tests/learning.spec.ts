import { test, expect } from '@playwright/test'
const journalKey = 'xuyen-su-ky-journal-v1'
test('library search, grade filters, saved articles and empty state', async ({page})=>{
 await page.goto('/home'); await expect(page.locator('.library-card')).toHaveCount(6)
 await page.getByRole('button',{name:/Khám phá thêm/}).click(); await expect(page.locator('.library-card')).toHaveCount(12)
 await page.getByRole('searchbox',{name:'Tìm kiếm thư viện'}).fill('co loa'); await expect(page.locator('.library-card')).toHaveCount(1); await expect(page.locator('.library-card h3')).toHaveText('Âu Lạc và thành Cổ Loa')
 await page.locator('.library-card-top button').click(); await page.getByRole('searchbox').fill(''); await page.getByRole('button',{name:'Đã lưu',exact:true}).click(); await expect(page.locator('.library-card')).toHaveCount(1)
 await page.reload(); await page.getByRole('button',{name:'Đã lưu',exact:true}).click(); await expect(page.locator('.library-card')).toHaveCount(1)
 await page.getByRole('combobox',{name:'Lọc lớp học'}).selectOption('9'); await expect(page.locator('.library-empty')).toBeVisible(); await page.getByRole('button',{name:'Xem tất cả bài học'}).click(); await expect(page.locator('.library-card')).toHaveCount(6)
})
test('reader notes, reading goal, flashcard review and reload persistence',async({page})=>{
 await page.goto('/home'); await page.getByRole('combobox',{name:'Mục tiêu hoạt động mỗi ngày'}).selectOption('1'); await page.locator('.library-open').first().click(); await expect(page.locator('#reader-title')).toBeFocused()
 await page.getByRole('button',{name:'Aa · Chữ lớn'}).click(); await expect(page.locator('.reader-prose')).toHaveClass(/large/)
 await page.getByLabel('Sổ tay của bạn').fill('Mình muốn tìm hiểu thêm về Văn Lang.'); await page.getByRole('button',{name:'Đánh dấu đã đọc'}).click(); await page.locator('.mark-read').click()
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).events.length,journalKey)).toBe(1)
 await page.locator('.study-flashcard').click(); await page.getByRole('button',{name:'Cần ôn thêm'}).click(); await page.keyboard.press('Escape'); await expect(page.locator('.daily-count')).toContainText('Đã hoàn thành mục tiêu hôm nay')
 await page.getByRole('button',{name:'Cần ôn',exact:true}).click(); await expect(page.locator('.library-card')).toHaveCount(1); await page.reload(); await page.getByRole('button',{name:'Có ghi chú',exact:true}).click(); await page.locator('.library-open').first().click(); await expect(page.getByLabel('Sổ tay của bạn')).toHaveValue('Mình muốn tìm hiểu thêm về Văn Lang.'); await page.locator('.study-flashcard').click(); await page.getByRole('button',{name:'Đã nhớ bài này'}).click(); await page.keyboard.press('Escape'); await page.getByRole('button',{name:'Cần ôn',exact:true}).click(); await expect(page.locator('.library-empty')).toBeVisible()
})
test('legacy session is preserved; quiz completion logs learning without duplicate XP',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xuyen-su-ky-demo-v1',JSON.stringify({loggedIn:true,grade:7,earnedXp:60,completedActivities:['minigame-timeline']})))
 await page.goto('/home'); await page.locator('.library-open').first().click(); await page.getByRole('button',{name:'Làm câu hỏi',exact:true}).click(); await expect(page.locator('.activity-modal')).toBeVisible(); await page.locator('.answer-option').nth(1).click(); await page.getByRole('button',{name:'Kiểm tra đáp án'}).click()
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('xuyen-su-ky-demo-v1')!).earnedXp)).toBe(110); await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).events.filter((e:{kind:string})=>e.kind==='quiz').length,journalKey)).toBe(1)
 await page.keyboard.press('Escape'); await page.locator('.library-open').first().click(); await page.getByRole('button',{name:'Làm câu hỏi',exact:true}).click(); await page.locator('.answer-option').nth(1).click(); await page.getByRole('button',{name:'Kiểm tra đáp án'}).click(); expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('xuyen-su-ky-demo-v1')!).earnedXp)).toBe(110)
})
test('daily counts reset at Vietnam midnight and streak carries over',async({page})=>{
 await page.clock.install({time:new Date('2026-09-30T16:59:00Z')}); await page.goto('/home'); await page.locator('.library-open').first().click(); await page.locator('.mark-read').click(); await page.keyboard.press('Escape'); await expect(page.locator('.daily-count')).toContainText('1/3'); await page.clock.fastForward(120000); await expect(page.locator('.daily-count')).toContainText('0/3'); await expect(page.locator('.daily-count')).toContainText('1 ngày liên tiếp'); await page.locator('.library-open').first().click(); await page.locator('.mark-read').click(); await page.keyboard.press('Escape'); await expect(page.locator('.daily-count')).toContainText('2 ngày liên tiếp')
})
test('mobile reader focus, no overflow, malformed storage and unavailable storage',async({page})=>{
 await page.setViewportSize({width:390,height:844}); await page.addInitScript(()=>localStorage.setItem('xuyen-su-ky-journal-v1','{broken'))
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('.library-open').first().click();await expect(page.locator('#reader-title')).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.lesson-reader').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.keyboard.press('Escape');await expect(page.locator('.library-open').first()).toBeFocused();expect(errors).toEqual([])
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}});await page.locator('.library-open').first().click();await page.getByLabel('Sổ tay của bạn').fill('Ghi chú vẫn có trong phiên');await expect(page.locator('.reader-notebook small')).toContainText('Chưa lưu được');expect(errors).toEqual([])
})

test('reset confirms before clearing both progress and personal notebook',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('xuyen-su-ky-demo-v1',JSON.stringify({loggedIn:true,grade:7,earnedXp:60,completedActivities:['minigame-timeline']}));localStorage.setItem('xuyen-su-ky-journal-v1',JSON.stringify({bookmarks:['lesson-6'],read:['lesson-6'],notes:{'lesson-6':'Keep this note'},review:{},events:[],goal:5}))})
 await page.goto('/home');page.once('dialog',dialog=>dialog.dismiss());await page.locator('.reset-demo').click();expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).notes['lesson-6'],journalKey)).toBe('Keep this note')
 page.once('dialog',dialog=>dialog.accept());await page.locator('.reset-demo').click();await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).bookmarks.length,journalKey)).toBe(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('xuyen-su-ky-demo-v1')!).earnedXp)).toBe(0);await expect(page.locator('.library-saved')).toContainText('0 bài đã lưu')
})

import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })
test.beforeEach(({ page }) => { page.on('dialog', (dialog) => dialog.accept()) })

const roleLabel = { student: 'Học sinh', teacher: 'Giáo viên', admin: 'Quản trị viên' } as const
async function chooseRole(page: Page, role: keyof typeof roleLabel) {
  await page.locator('.login-role label').filter({ hasText: roleLabel[role] }).click()
}
async function signIn(page: Page, email: string, role: keyof typeof roleLabel, password = 'demo123') {
  await page.goto('/dang-nhap')
  await chooseRole(page, role)
  await page.locator('#demo-email').fill(email)
  await page.locator('#demo-password').fill(password)
  await page.locator('.login-form button[type=submit]').click()
}
async function signOut(page: Page, name: string) {
  await page.getByRole('button', { name: `Tài khoản: ${name}` }).click()
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('the sample teacher manages classes, assigns a textbook lesson and exports progress; staff areas are guarded', async ({ page }) => {
  await page.goto('/dang-nhap')
  await chooseRole(page, 'teacher')
  await expect(page.locator('.demo-credentials')).toContainText('dung.gv@xuyensuki.vn')
  await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
  await page.locator('.login-form button[type=submit]').click()
  await expect(page).toHaveURL(/\/giao-vien$/)
  await expect(page.getByRole('heading', { name: 'Xin chào, Thầy Dũng' })).toBeVisible()
  await expect(page.locator('#students tbody tr')).toHaveCount(8)

  await page.getByLabel('Tên lớp').fill('7A9')
  await page.getByRole('button', { name: 'Tạo lớp' }).click()
  await expect(page.locator('.staff-notice')).toContainText('Đã tạo lớp 7A9')
  await page.getByRole('listitem').filter({ hasText: 'Lớp 7A9' }).click()
  await expect(page.locator('.staff-class-head h2')).toHaveText('Lớp 7A9 · Khối 7')
  await expect(page.locator('#students')).toContainText('Chưa có học sinh')
  const lesson = page.getByLabel(/Bài học SGK lớp 7/)
  await expect(lesson.locator('option')).not.toHaveCount(1)
  await lesson.selectOption('LS7_B17')
  await page.getByRole('button', { name: 'Giao bài' }).click()
  await expect(page.locator('.staff-assignments')).toContainText('Ba lần kháng chiến')

  await page.getByRole('listitem').filter({ hasText: 'Lớp 7A1' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất CSV' }).click()
  const csv = await readFile(await (await download).path(), 'utf8')
  expect(csv.split('\r\n')).toHaveLength(9)
  expect(csv).toContain('Nguyễn Văn An,an.hs@xuyensuki.vn,4,420,6,2')

  await page.goto('/admin')
  await expect(page).toHaveURL(/\/giao-vien$/)
})

test('a teacher registers, waits for approval, then the student joins the class and the teacher sees them', async ({ page }) => {
  await page.goto('/dang-nhap')
  await page.getByRole('tab', { name: 'Đăng ký' }).click()
  await page.locator('#demo-email').fill('hoa.gv@truong.vn')
  await page.locator('#demo-password').fill('matkhau123')
  await page.locator('#confirm-password').fill('matkhau123')
  await page.getByText('Giáo viên', { exact: true }).click()
  await page.getByLabel('Họ và tên').fill('Cô Phạm Thu Hoa')
  await page.getByLabel('Trường').fill('THCS Kim Đồng')
  await page.locator('.login-form button[type=submit]').click()
  await expect(page.locator('.form-info')).toContainText('sau khi quản trị viên duyệt')

  await signIn(page, 'hoa.gv@truong.vn', 'teacher', 'matkhau123')
  await expect(page.locator('.form-error')).toContainText('đang chờ quản trị viên duyệt')

  await signIn(page, 'admin@xuyensuki.vn', 'admin')
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.locator('#requests')).toContainText('Cô Phạm Thu Hoa')
  await page.getByRole('button', { name: 'Duyệt Cô Phạm Thu Hoa' }).click()
  await expect(page.locator('#requests')).not.toContainText('Cô Phạm Thu Hoa')
  await expect(page.locator('#audit')).toContainText('Duyệt giáo viên')
  await signOut(page, 'Quản trị viên')

  await signIn(page, 'hoa.gv@truong.vn', 'teacher', 'matkhau123')
  await expect(page).toHaveURL(/\/giao-vien$/)
  await expect(page.locator('#classes')).toContainText('Bạn chưa có lớp nào')
  await page.getByLabel('Tên lớp').fill('6A1')
  await page.getByLabel('Khối').selectOption('6')
  await page.getByRole('button', { name: 'Tạo lớp' }).click()
  const lesson = page.getByLabel(/Bài học SGK lớp 6/)
  await expect(lesson.locator('option')).not.toHaveCount(1)
  await lesson.selectOption('LS6_B14')
  await page.getByRole('button', { name: 'Giao bài' }).click()
  const code = (await page.locator('.staff-code-button span').textContent())!.trim()
  expect(code).toMatch(/^[A-Z2-9]{6}$/)
  await signOut(page, 'Cô Phạm Thu Hoa')

  await page.goto('/dang-nhap')
  await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
  await page.locator('.login-form button[type=submit]').click()
  await page.locator('.grade-onboarding .button-primary').click()
  await expect(page).toHaveURL(/\/home$/)
  await page.locator('#join-code').fill('SAI000')
  await page.getByRole('button', { name: 'Tham gia lớp', exact: true }).click()
  await expect(page.locator('.student-join [role=alert]')).toContainText('Mã lớp không đúng')
  await page.locator('#join-code').fill(code.toLowerCase())
  await page.getByRole('button', { name: 'Tham gia lớp', exact: true }).click()
  await expect(page.locator('.student-class-panel')).toContainText('Lớp 6A1 · Cô Phạm Thu Hoa')
  await page.getByRole('button', { name: /Mở bài được giao: Nhà nước Văn Lang/ }).click()
  await expect(page).toHaveURL(/#library$/)
  await expect(page.locator('#dataset-reader-title')).toContainText('Văn Lang')

  await page.goto('/giao-vien')
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('button', { name: 'Tài khoản' }).click()
  await page.getByRole('link', { name: 'Đăng xuất' }).click()
  await signIn(page, 'hoa.gv@truong.vn', 'teacher', 'matkhau123')
  await expect(page.locator('#students tbody tr')).toHaveCount(1)
  await expect(page.locator('#students')).toContainText('dung@xuyensuki.vn')
})

test('an admin locks and changes accounts, but never their own; a locked account cannot sign in', async ({ page }) => {
  await signIn(page, 'admin@xuyensuki.vn', 'admin')
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByLabel('Vai trò của Quản trị viên')).toBeDisabled()
  await page.getByRole('group', { name: 'Lọc theo vai trò' }).getByRole('button', { name: 'Giáo viên' }).click()
  await expect(page.locator('#users tbody tr')).toHaveCount(2)
  await page.getByRole('group', { name: 'Lọc theo vai trò' }).getByRole('button', { name: 'Tất cả' }).click()
  await page.getByLabel('Tìm người dùng').fill('dung@')
  const row = page.locator('#users tbody tr').filter({ hasText: 'dung@xuyensuki.vn' })
  await row.getByRole('button', { name: 'Khoá' }).click()
  await expect(row).toContainText('Đã khoá')
  await page.getByLabel('Tìm người dùng').fill('hung.gv')
  await page.getByLabel('Vai trò của Thầy Trần Văn Hùng').selectOption('admin')
  await expect(page.locator('.staff-notice')).toContainText('giờ là quản trị viên')
  await expect(page.locator('#audit')).toContainText('Khoá tài khoản')
  await signOut(page, 'Quản trị viên')

  await page.goto('/dang-nhap')
  await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click()
  await page.locator('.login-form button[type=submit]').click()
  await expect(page.locator('.form-error')).toContainText('đã bị khoá')
  await expect(page).toHaveURL(/\/dang-nhap$/)
})

test('staff areas fit a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [email, role, path] of [['dung.gv@xuyensuki.vn', 'teacher', '/giao-vien'], ['admin@xuyensuki.vn', 'admin', '/admin']] as const) {
    await signIn(page, email, role)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.locator('.staff-heading h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await page.evaluate(() => { sessionStorage.clear() })
  }
})

test('sign-in asks for the role and refuses an account of another role', async ({ page }) => {
  await page.goto('/dang-nhap')
  const roles = page.getByRole('group', { name: 'Đăng nhập với vai trò' })
  await expect(roles.getByRole('radio', { name: 'Học sinh' })).toBeChecked()
  await expect(page.locator('.demo-credentials')).toContainText('dung@xuyensuki.vn')
  await chooseRole(page, 'admin')
  await expect(page.locator('.demo-credentials')).toContainText('admin@xuyensuki.vn')

  await signIn(page, 'dung.gv@xuyensuki.vn', 'student')
  await expect(page.locator('.form-error')).toContainText('tài khoản giáo viên')
  await expect(page).toHaveURL(/\/dang-nhap$/)
  await signIn(page, 'dung@xuyensuki.vn', 'admin', 'sai-mat-khau')
  await expect(page.locator('.form-error')).toHaveText('Email hoặc mật khẩu chưa đúng.')
  await signIn(page, 'admin@xuyensuki.vn', 'teacher')
  await expect(page.locator('.form-error')).toContainText('Quản trị viên')

  await signIn(page, 'dung@xuyensuki.vn', 'student')
  await page.locator('.grade-onboarding .button-primary').click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('button', { name: 'Tài khoản' })).toContainText('Dũng')
})

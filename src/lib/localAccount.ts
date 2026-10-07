const key = 'xuyen-su-ky-local-account-v1'
async function digest(password: string, salt: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + password))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function registerLocal(email: string, password: string) {
  const normalized = email.trim().toLowerCase()
  if (password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.')
  if (normalized === 'minh@xuyensuki.vn' || localStorage.getItem(key)) throw new Error('Trình duyệt này đã có tài khoản demo. Hãy đăng nhập.')
  const salt = crypto.randomUUID()
  localStorage.setItem(key, JSON.stringify({ email: normalized, salt, hash: await digest(password, salt) }))
}
export async function verifyLocal(email: string, password: string) {
  try {
    const account = JSON.parse(localStorage.getItem(key) || 'null')
    return !!account && account.email === email.trim().toLowerCase() && account.hash === await digest(password, account.salt)
  } catch { return false }
}

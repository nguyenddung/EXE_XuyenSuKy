import type { Page } from '@playwright/test'

/** The demo account, remembered (expiresAt) so the sign-in survives new pages and reloads. */
export const memberSession = { loggedIn: true, guest: false, expiresAt: 4102444800000, userId: 'dung@xuyensuki.vn', name: 'Dũng', gradeSelected: true, grade: 7, completedActivities: [], earnedXp: 0 }

/**
 * Puts the signed-in member in another grade once per tab (after signInAsMember), e.g. to open a source lesson that is only
 * in the grade 6 textbook. Later navigations keep whatever the page itself saved.
 */
export const memberInGrade = (page: Page, grade: number) => page.addInitScript(([value, marker]) => {
  if (sessionStorage.getItem(marker)) return
  sessionStorage.setItem(marker, '1')
  localStorage.setItem('xuyen-su-ky-demo-v1', value)
}, [JSON.stringify({ ...memberSession, grade }), 'test-member-grade'] as const)

/** A visitor in guest mode (grade 7), once per tab, replacing a member signed in by beforeEach. */
export const asGuest = (page: Page) => page.addInitScript((value) => {
  if (sessionStorage.getItem('test-guest')) return
  sessionStorage.setItem('test-guest', '1')
  localStorage.setItem('xuyen-su-ky-demo-v1', value)
}, JSON.stringify({ loggedIn: false, guest: true, expiresAt: 4102444800000, gradeSelected: true, grade: 7, completedActivities: [], earnedXp: 0 }))

/** Conversations with the AI characters need a signed-in member: sign the page in before it loads, unless a test already did. */
export const signInAsMember = (page: Page, session: object = memberSession) => page.addInitScript((value) => {
  if (!localStorage.getItem('xuyen-su-ky-demo-v1')?.includes('"loggedIn":true')) localStorage.setItem('xuyen-su-ky-demo-v1', value)
}, JSON.stringify(session))

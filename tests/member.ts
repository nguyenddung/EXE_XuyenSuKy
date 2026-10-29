import type { Page } from '@playwright/test'

/** The demo account, remembered (expiresAt) so the sign-in survives new pages and reloads. */
export const memberSession = { loggedIn: true, guest: false, expiresAt: 4102444800000, userId: 'minh@xuyensuki.vn', name: 'Minh', gradeSelected: true, grade: 7, completedActivities: [], earnedXp: 0 }

/** Conversations with the AI characters need a signed-in member: sign the page in before it loads, unless a test already did. */
export const signInAsMember = (page: Page, session: object = memberSession) => page.addInitScript((value) => {
  if (!localStorage.getItem('xuyen-su-ky-demo-v1')?.includes('"loggedIn":true')) localStorage.setItem('xuyen-su-ky-demo-v1', value)
}, JSON.stringify(session))

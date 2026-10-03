import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:5188'
// /home requires a session; most specs start as a visitor who already chose guest mode. tests/auth.spec.ts starts signed out.
const guestSession = JSON.stringify({ loggedIn: false, guest: true, grade: 7, completedActivities: [], earnedXp: 0 })

export default defineConfig({ testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1, timeout: 60000, use: { baseURL, storageState: { cookies: [], origins: [{ origin: baseURL, localStorage: [{ name: 'xuyen-su-ky-demo-v1', value: guestSession }] }] }, browserName: 'chromium', launchOptions: process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}, viewport: { width: 1280, height: 900 } }, webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5188', url: baseURL, reuseExistingServer: !process.env.CI } })

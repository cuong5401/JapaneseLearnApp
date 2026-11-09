import { defineConfig, devices } from '@playwright/test'

const PORT = 5180
const MOBILE = /mobile\.spec\.ts$/
/** tests/preview chạy trên bản build (base /JapaneseLearnApp/): xem playwright.preview.config.ts */
const PREVIEW = /[\\/]preview[\\/]/

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    { name: 'desktop', testIgnore: [MOBILE, PREVIEW], use: { ...devices['Desktop Chrome'] } },
    // Điện thoại: chống zoom khi nhập / chạm đúp và cuộn cao su (cần `npx playwright install webkit`).
    { name: 'iphone', testMatch: MOBILE, use: { ...devices['iPhone 15'] } },
    { name: 'android', testMatch: MOBILE, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})

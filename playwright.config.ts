import { defineConfig, devices } from '@playwright/test'

const PORT = 5180
const MOBILE = /mobile\.spec\.ts$/
/** tests/preview chạy trên bản build (base /JapaneseLearnApp/): xem playwright.preview.config.ts */
const PREVIEW = /[\\/]preview[\\/]/

/**
 * PW_CHANNEL=chrome: chạy project Chromium bằng Google Chrome đã cài (có chữ ký) thay cho chromium-headless-shell
 * của Playwright, khi Windows Smart App Control chặn trình duyệt tải về. WebKit vẫn dùng bản của Playwright.
 */
const CHROME = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    { name: 'desktop', testIgnore: [MOBILE, PREVIEW], use: { ...devices['Desktop Chrome'], ...CHROME } },
    // Điện thoại: chống zoom khi nhập / chạm đúp và cuộn cao su (cần `npx playwright install webkit`).
    { name: 'iphone', testMatch: MOBILE, use: { ...devices['iPhone 15'] } },
    { name: 'android', testMatch: MOBILE, use: { ...devices['Pixel 7'], ...CHROME } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})

import { defineConfig, devices } from '@playwright/test'

/**
 * E2E trên bản build thật (vite preview, base '/JapaneseLearnApp/' như GitHub Pages).
 * Dev chạy ở gốc '/', nên lỗi lặp basename chỉ lộ ra ở đây.
 * Cần build trước: `npm run build && npm run test:e2e:preview` (CI chạy sau bước build).
 *  - tests/preview/*: chỉ chạy ở đây;
 *  - tests/dock.mobile.spec.ts: khung Hỏi AI trên điện thoại, chạy cả ở dev lẫn ở đây (đường dẫn theo E2E_BASE).
 */
const PORT = 4180
process.env.E2E_BASE = '/JapaneseLearnApp/'

const PREVIEW = /[\\/]preview[\\/].*\.spec\.ts$/
const DOCK_PHONE = /dock\.mobile\.spec\.ts$/

/**
 * PW_CHANNEL=chrome: chạy project Chromium bằng Google Chrome đã cài (có chữ ký) thay cho chromium-headless-shell
 * của Playwright, khi Windows Smart App Control chặn trình duyệt tải về. WebKit vẫn dùng bản của Playwright.
 */
const CHROME = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: 'preview-desktop', testMatch: PREVIEW, use: { ...devices['Desktop Chrome'], ...CHROME, viewport: { width: 1280, height: 900 } } },
    { name: 'preview-phone', testMatch: [PREVIEW, DOCK_PHONE], use: { ...devices['Pixel 7'], ...CHROME } },
    { name: 'preview-iphone', testMatch: DOCK_PHONE, use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/JapaneseLearnApp/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})

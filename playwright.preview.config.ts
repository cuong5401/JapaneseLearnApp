import { defineConfig, devices } from '@playwright/test'

/**
 * E2E trên bản build thật (vite preview, base '/JapaneseLearnApp/' như GitHub Pages).
 * Dev chạy ở gốc '/', nên lỗi lặp basename chỉ lộ ra ở đây.
 * Cần build trước: `npm run build && npm run test:e2e:preview` (CI chạy sau bước build).
 */
const PORT = 4180

export default defineConfig({
  testDir: './tests/preview',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: 'preview-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'preview-phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/JapaneseLearnApp/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})

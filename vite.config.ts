/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Địa chỉ GitHub Pages: https://cuong5401.github.io/JapaneseLearnApp/ */
const PAGES_BASE = '/JapaneseLearnApp/'

/** Ngữ pháp lấy từ sách: không đưa lên bản web công khai. */
const PRIVATE_GRAMMAR = ['n4', 'n3', 'n2', 'n1'].map((l) => `grammar/${l}.json`)

/**
 * Bước cuối của build:
 *  - copy index.html thành 404.html để GitHub Pages trả về app khi F5 ở trang con;
 *  - bản public: xóa file ngữ pháp riêng khỏi dist và sửa manifest dữ liệu cho khớp.
 */
function kotonohaDist(publicBuild: boolean): Plugin {
  let outDir = 'dist'
  return {
    name: 'kotonoha-dist',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
      if (!publicBuild) return

      const dataDir = resolve(outDir, 'data')
      let removed = 0
      for (const path of PRIVATE_GRAMMAR) {
        const file = resolve(dataDir, path)
        if (existsSync(file)) {
          rmSync(file)
          removed++
        }
      }
      const manifestPath = resolve(dataDir, 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: { path: string }[] }
      manifest.files = manifest.files.filter((f) => !PRIVATE_GRAMMAR.includes(f.path))
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`[kotonoha] Bản public: đã bỏ ${removed} file ngữ pháp khỏi dist/data.`)
    },
  }
}

/**
 * Mã mở khóa (VITE_UNLOCK_CODE, 4 số, đặt trong GitHub Actions secret).
 * Chỉ nhúng mã băm SHA-256 vào bundle, không nhúng con số. Không đặt biến thì không có màn nhập mã.
 * Đây là rào chắn người lạ, không phải bảo mật: dữ liệu trong data/ vẫn tải trực tiếp được.
 */
const UNLOCK_SALT = 'kotonoha-unlock:'
function unlockHash(): string {
  const code = (process.env.VITE_UNLOCK_CODE ?? '').trim()
  if (!code) return ''
  if (!/^\d{4}$/.test(code)) throw new Error('VITE_UNLOCK_CODE phải gồm đúng 4 chữ số.')
  return createHash('sha256').update(UNLOCK_SALT + code).digest('hex')
}

// https://vite.dev/config/
export default defineConfig(({ command, mode, isPreview }) => {
  const publicBuild = process.env.VITE_PUBLIC_BUILD === 'true' || mode === 'public'
  // Build và preview (xem bản build) dùng đường dẫn GitHub Pages; dev chạy ở gốc '/'.
  const base = command === 'build' || isPreview ? PAGES_BASE : '/'

  return {
    base,
    define: {
      __PUBLIC_BUILD__: JSON.stringify(publicBuild),
      __UNLOCK_HASH__: JSON.stringify(command === 'build' ? unlockHash() : ''),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        devOptions: { enabled: false },
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Kotonoha – Học tiếng Nhật',
          short_name: 'Kotonoha',
          description: 'Học tiếng Nhật từ N5 đến N1: kana, từ vựng, chữ Hán, quiz và ôn tập ngắt quãng.',
          lang: 'vi',
          // --ai và --paper trong src/index.css
          theme_color: '#27458c',
          background_color: '#f1f3f8',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Vỏ app được precache; dữ liệu học cache khi mở (runtime) để học offline bài đã xem.
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          globIgnores: ['404.html', 'data/**'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // manifest.json luôn kèm ?t=now: hỏi mạng trước, mất mạng thì dùng bản đã lưu.
              urlPattern: ({ url }) => url.pathname.endsWith('/data/manifest.json'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'kotonoha-data-manifest',
                networkTimeoutSeconds: 3,
                matchOptions: { ignoreSearch: true },
                expiration: { maxEntries: 2 },
              },
            },
            {
              // File dữ liệu có ?v=hash: trả bản đã lưu ngay, cập nhật ngầm.
              urlPattern: ({ url }) => url.pathname.includes('/data/') && url.pathname.endsWith('.json'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'kotonoha-data',
                expiration: { maxEntries: 60 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-css' },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-files',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
      kotonohaDist(publicBuild),
    ],
    test: {
      // Test đơn vị nằm cạnh mã nguồn; tests/ là Playwright.
      include: ['src/**/*.test.ts'],
    },
  }
})

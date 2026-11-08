/**
 * Sinh icon PWA từ thiết kế favicon (chữ 言 trắng trên nền chàm, đường kẻ ô tập viết).
 * Chạy tay khi đổi thiết kế: `node scripts/gen-icons.mjs` (cần `npx playwright install chromium`).
 * Kết quả commit vào public/icons/.
 */
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons')
const AI = '#27458c'
const GUIDE = '#4b67a8'

/**
 * - rounded: bo góc như favicon (icon thường);
 * - full: tràn nền, iOS/Android tự bo; `scale` thu chữ vào vùng an toàn (maskable: 80% đường kính).
 */
const ICONS = [
  { file: 'icon-192.png', size: 192, rounded: true, scale: 1 },
  { file: 'icon-512.png', size: 512, rounded: true, scale: 1 },
  { file: 'icon-512-maskable.png', size: 512, rounded: false, scale: 0.72 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.86 },
]

function svg({ rounded, scale }) {
  // Hệ tọa độ 64×64 giống public/favicon.svg.
  const pad = (64 - 64 * scale) / 2
  const g = (v) => pad + v * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
    <rect width="64" height="64" rx="${rounded ? 6 : 0}" fill="${AI}"/>
    <path d="M32 ${g(6)}V${g(58)}M${g(6)} 32H${g(58)}" stroke="${GUIDE}" stroke-width="${1.5 * scale}" stroke-dasharray="${3 * scale} ${3 * scale}"/>
    <text x="32" y="${g(45)}" font-family="'Noto Sans JP'" font-size="${38 * scale}" font-weight="700" fill="#fff" text-anchor="middle">言</text>
  </svg>`
}

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()
for (const icon of ICONS) {
  await page.setViewportSize({ width: icon.size, height: icon.size })
  await page.setContent(`<!doctype html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=言&display=block" rel="stylesheet">
    <style>html,body{margin:0;background:transparent}div{width:${icon.size}px;height:${icon.size}px}</style>
  </head><body><div>${svg(icon)}</div></body></html>`)
  await page.evaluate(async () => {
    await document.fonts.load('700 38px "Noto Sans JP"', '言')
    await document.fonts.ready
  })
  const ok = await page.evaluate(() => document.fonts.check('700 38px "Noto Sans JP"', '言'))
  if (!ok) throw new Error('Không tải được Noto Sans JP')
  await page.locator('div').screenshot({ path: resolve(OUT, icon.file), omitBackground: icon.rounded })
  console.log('✓', icon.file)
}
await browser.close()

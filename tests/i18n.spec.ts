import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import vi from '../src/i18n/vi'

/**
 * Ngôn ngữ giao diện (Tiếng Việt / 日本語):
 *  - đổi trong Cài đặt áp dụng ngay, không tải lại trang; <html lang>, <title> đổi theo;
 *  - giao diện 日本語: chữ giao diện là tiếng Nhật, dữ liệu học (nghĩa, Hán Việt…) vẫn tiếng Việt;
 *  - Hỏi AI mặc định tiếng Việt kể cả khi giao diện là 日本語; tùy chọn "Ngôn ngữ giải thích của AI" đổi được;
 *  - chụp các màn chính ở 日本語 (390 / 1280px), không tràn ngang, không lộ khóa từ điển.
 * I18N_SHOTS=<thư mục> để lưu ảnh chụp.
 */
const VI_MARK = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
const KEYS = Object.keys(vi)

function seedJa(page: Page, extra: Record<string, string> = {}) {
  return page.addInitScript((x) => {
    if (sessionStorage.getItem('__seeded')) return
    sessionStorage.setItem('__seeded', '1')
    localStorage.setItem('jla:v1:locale', JSON.stringify('ja'))
    localStorage.setItem('jla:v1:swipe-hint-seen', 'true')
    for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v)
  }, extra)
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForFunction(() => !document.querySelector('main [role="status"][aria-busy="true"]'), null, { timeout: 15_000 })
  await page.waitForTimeout(300)
}

/** Chữ hiện trên trang không được chứa khóa từ điển (khóa chưa dịch / thiếu từ điển). */
async function expectNoRawKeys(page: Page, where: string) {
  const text = await page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label],[title],[placeholder]')].map((e) => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''} ${e.getAttribute('placeholder') ?? ''}`).join(' '))
  const leaked = KEYS.filter((k) => text.includes(k))
  expect(leaked, `${where}: lộ khóa ${leaked.join(', ')}`).toEqual([])
}

test('đổi sang 日本語 trong Cài đặt: áp dụng ngay, không tải lại trang; đổi lại tiếng Việt', async ({ page }) => {
  await page.goto('/settings')
  await settle(page)
  await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true))
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await page.getByRole('radio', { name: '日本語' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('設定')
  await expect(page.getByRole('navigation', { name: 'メインメニュー' }).first()).toContainText('ホーム')
  await expect(page).toHaveTitle(/日本語学習/)
  expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
  expect(await page.evaluate(() => localStorage.getItem('jla:v1:locale'))).toBe('"ja"')
  // F5 giữ ngôn ngữ.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
  await page.getByRole('radio', { name: 'Tiếng Việt' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cài đặt')
})

test('日本語: chữ giao diện tiếng Nhật, dữ liệu học vẫn tiếng Việt', async ({ page }) => {
  await seedJa(page)
  await page.goto('/vocab/n5/1')
  await settle(page)
  // Nhãn quanh dữ liệu đã dịch, nghĩa / Hán Việt giữ nguyên.
  await expect(page.locator('main')).toContainText('第1課')
  await expect(page.locator('main')).toContainText('Tôi')
  await expect(page.locator('main')).toContainText('Tư')
  for (const sel of ['nav', 'header', 'aside']) {
    const text = await page.locator(sel).evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText).join(' '))
    expect(text, `${sel} còn chữ tiếng Việt`).not.toMatch(VI_MARK)
  }
  await page.goto('/kanji?k=%E6%97%A5')
  await settle(page)
  const panel = page.locator('[data-detail-kanji="日"]').first()
  await expect(panel).toContainText('音読み')
  await expect(panel).toContainText('訓読み')
  await expect(panel).toContainText('画数')
  await expect(panel).toContainText('NHẬT')
  await expectNoRawKeys(page, 'kanji')
})

test('Hỏi AI mặc định tiếng Việt khi giao diện 日本語; đổi "Ngôn ngữ giải thích của AI" sang tiếng Nhật', async ({ page }) => {
  await seedJa(page, { 'jla:v1:ai-settings': JSON.stringify({ provider: 'mock' }) })
  await page.goto('/kanji?k=%E6%97%A5')
  await page.locator('[data-detail-kanji="日"]').first().waitFor()
  await page.locator('[data-ask-ai]').first().click()
  const panel = page.locator('[data-ai-panel]')
  await expect(panel.locator('[data-msg="user"]').last()).toContainText('Giải thích chữ Hán 日')
  // Khung giao diện của AI theo ngôn ngữ giao diện.
  await expect(panel.getByRole('button', { name: /閉じる/ }).first()).toBeVisible()
  await panel.getByRole('button', { name: /閉じる/ }).first().click()

  await page.goto('/settings')
  await settle(page)
  await page.getByRole('radiogroup', { name: 'AI の説明言語' }).getByRole('radio', { name: '日本語' }).click()
  await page.goto('/kanji?k=%E6%97%A5')
  await page.locator('[data-detail-kanji="日"]').first().waitFor()
  await page.locator('[data-ask-ai]').first().click()
  await expect(page.locator('[data-ai-panel] [data-msg="user"]').last()).toContainText('漢字「日」')
})

const SCREENS: { id: string; path: string; act?: (p: Page) => Promise<unknown> }[] = [
  { id: 'home', path: '/' },
  { id: 'learn', path: '/learn' },
  { id: 'kanji-panel', path: '/kanji?bai=1', act: (p) => p.locator('[data-kanji-cell]').nth(1).click() },
  { id: 'review', path: '/review' },
  { id: 'notebooks', path: '/notebooks' },
  { id: 'settings', path: '/settings' },
  { id: 'ai-dock', path: '/learn', act: (p) => p.locator('[data-ai-tab]').click() },
]

for (const width of [390, 1280]) {
  test.describe(`${width}px 日本語`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 800 }, hasTouch: width < 768 })
    test('các màn chính: không tràn ngang, không lộ khóa, chụp ảnh', async ({ page }) => {
      test.setTimeout(120_000)
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await seedJa(page, { 'jla:v1:cards': JSON.stringify({ 'n5-e1ea452d': { id: 'n5-e1ea452d', due: 0, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: 0, last_review: 0, learning_steps: 0 } }) })
      const dir = process.env.I18N_SHOTS
      if (dir) mkdirSync(dir, { recursive: true })
      for (const s of SCREENS) {
        await page.goto(s.path)
        await settle(page)
        if (s.act) {
          await s.act(page)
          await page.waitForTimeout(800)
        }
        const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }))
        expect(sw, `${s.id}: tràn ngang`).toBeLessThanOrEqual(iw)
        await expectNoRawKeys(page, s.id)
        if (dir) await page.screenshot({ path: `${dir}/ja-${s.id}-${width}.png`, fullPage: s.id !== 'ai-dock' })
      }
      expect(errors).toEqual([])
    })
  })
}

test('không gọi t() trước khi nạp từ điển / không thiếu khóa (console [i18n])', async ({ page }) => {
  test.setTimeout(120_000)
  const warns: string[] = []
  page.on('console', (m) => m.text().includes('[i18n]') && warns.push(m.text()))
  await page.addInitScript(() => localStorage.clear())
  for (const p of ['/', '/learn', '/learn/counters', '/kana', '/vocab/n5/1?tab=quiz', '/kanji?bai=1', '/grammar', '/review', '/notebooks', '/notebooks/default', '/writing', '/progress', '/settings', '/ai', '/me']) {
    await page.goto(p)
    await settle(page)
  }
  expect(warns, warns.join('\n')).toEqual([])
})

test('phiếu luyện viết ở 日本語: tiêu đề / chân trang PDF tiếng Nhật (font nhúng có đủ chữ)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedJa(page)
  await page.goto('/writing?src=kanji&level=N5&bai=1')
  await expect(page.getByRole('heading', { name: '書き取り練習', level: 1 })).toBeVisible()
  await expect(page.locator('[data-writing-list] > li')).toHaveCount(20)
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-pdf]').click()])
  const bytes = readFileSync(await pdf.path())
  const out = await page.evaluate(async (b64) => {
    const pdfjs = await import(/* @vite-ignore */ '/node_modules/pdfjs-dist/build/pdf.min.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
    const doc = await pdfjs.getDocument({ data: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) }).promise
    const pg = await doc.getPage(1)
    const text = (await pg.getTextContent()).items.map((i: { str?: string }) => i.str ?? '').join(' ')
    const vp = pg.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width
    canvas.height = vp.height
    await pg.render({ canvas, viewport: vp }).promise
    return { text, png: canvas.toDataURL('image/png') }
  }, bytes.toString('base64'))
  const text = out.text.replace(/\s+/g, '')
  expect(text).toContain('書き取り練習')
  expect(text).toContain('第1課')
  expect(text).toContain('No.1')
  expect(text).toContain('ページ')
  expect(text).not.toContain('Trang')
  if (process.env.I18N_SHOTS) writeFileSync(`${process.env.I18N_SHOTS}/ja-writing-pdf.png`, Buffer.from(out.png.split(',')[1], 'base64'))
})

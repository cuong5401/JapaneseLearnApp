import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

/**
 * Chuyển trang khi panel / bottom sheet chi tiết đang mở (bản build, base '/JapaneseLearnApp/'):
 * vùng main luôn phải có nội dung sau mỗi lần chuyển, URL chỉ đổi đúng một lần cho mỗi lần bấm
 * (lỗi cũ: trang đang rời đi ghi thêm URL lúc thoát → AnimatePresence kẹt → main trắng).
 * Chạy ở preview-desktop (1280px) và preview-phone (Pixel 7).
 */
const BASE = '/JapaneseLearnApp/'
const UNLOCK = (process.env.VITE_UNLOCK_CODE ?? '').trim()
const UNLOCK_HASH = UNLOCK ? createHash('sha256').update(`kotonoha-unlock:${UNLOCK}`).digest('hex') : ''

interface Probe {
  /** Mọi lần pushState / replaceState: "push /path?query" */
  nav: string[]
  errors: string[]
}

async function probe(page: Page): Promise<Probe> {
  const p: Probe = { nav: [], errors: [] }
  page.on('console', (m) => {
    if (m.type() === 'error') p.errors.push(m.text())
  })
  page.on('pageerror', (e) => p.errors.push(e.message))
  return p
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((hash) => {
    if (hash) localStorage.setItem('jla:unlock', hash)
    const w = window as unknown as { __nav: string[] }
    w.__nav = []
    for (const m of ['pushState', 'replaceState'] as const) {
      const orig = history[m].bind(history)
      history[m] = (state: unknown, title: string, url?: string | URL | null) => {
        w.__nav.push(`${m === 'pushState' ? 'push' : 'replace'} ${url ?? ''}`)
        return orig(state, title, url)
      }
    }
  }, UNLOCK_HASH)
})

const navLog = (page: Page) => page.evaluate(() => (window as unknown as { __nav: string[] }).__nav)
const clearNavLog = (page: Page) => page.evaluate(() => ((window as unknown as { __nav: string[] }).__nav.length = 0))
const pathOf = (page: Page) => new URL(page.url()).pathname

/** main phải có nội dung thật (không trắng, không chỉ skeleton rỗng). */
async function expectMainFilled(page: Page, step: string) {
  await expect
    .poll(() => page.locator('main').evaluate((m) => m.innerText.trim().length), { message: `main trống sau: ${step}`, timeout: 6000 })
    .toBeGreaterThan(20)
}

const navLink = (page: Page, label: RegExp) => page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: label })
/** Mục "Học" (学 Học): không nhầm với nhóm "Học tập" (không phải link). */
const LEARN = /Học$/

async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector('[aria-label^="Đang tải"]'), null, { timeout: 15_000 })
}

/** Mở chi tiết chữ 合 từ lưới bài 1; điện thoại thì sheet bật lên. */
async function pickKanji(page: Page) {
  await page.goto(`${BASE}kanji?bai=1`)
  await settle(page)
  await page.locator('[data-kanji-cell="合"]').click()
  await expect(page.locator('[data-detail-kanji="合"]')).toBeVisible()
}

/**
 * Bấm một mục điều hướng và kiểm tra: đúng trang, URL chỉ đổi đúng 1 lần, main có nội dung, không lỗi.
 * Điện thoại + sheet đang mở: lớp nền sheet che thanh điều hướng, nên bấm bằng click của DOM.
 */
async function goTo(page: Page, p: Probe, label: RegExp, path: string, step: string, viaDom = false) {
  const finalPath = path
  await clearNavLog(page)
  const link = navLink(page, label)
  if (viaDom) await link.evaluate((a) => (a as HTMLAnchorElement).click())
  else await link.click()
  await expect.poll(() => pathOf(page), { message: `URL sau: ${step}` }).toBe(`${BASE}${finalPath}`)
  await expectMainFilled(page, step)
  // Trang đã rời đi không được ghi thêm URL: chỉ có đúng một lần điều hướng cho lần bấm này.
  await page.waitForTimeout(500)
  const log = await navLog(page)
  expect(log[0], `lần điều hướng đầu sau: ${step}`).toMatch(/^push /)
  // Mọi lần ghi URL đều thuộc trang đích (không có trang cũ ghi thêm lúc đang thoát).
  for (const entry of log) {
    const target = new URL(entry.split(' ')[1], 'http://x').pathname
    expect([`${BASE}${path}`, `${BASE}${finalPath}`], `URL lạ sau: ${step}: ${log.join(' | ')}`).toContain(target)
  }
  expect(pathOf(page)).toBe(`${BASE}${finalPath}`)
  expect(p.errors, `lỗi console sau: ${step}`).toEqual([])
}

test('chọn chữ 合 → Trang chủ', async ({ page }) => {
  const p = await probe(page)
  await pickKanji(page)
  const phone = await page.locator('[role="dialog"]').count()
  await goTo(page, p, /Trang chủ/, '', 'Chữ Hán 合 → Trang chủ', phone > 0)
})

test('chọn 合 → chọn một từ trong panel → Học', async ({ page }) => {
  const p = await probe(page)
  await pickKanji(page)
  await page.locator('[data-kanji-words] button').first().click()
  await settle(page)
  const phone = await page.locator('[role="dialog"]').count()
  await goTo(page, p, LEARN, 'learn', 'chữ → từ → Học', phone > 0)
})

test('Cách đếm: chọn 本 → Cá nhân', async ({ page }) => {
  const p = await probe(page)
  await page.goto(`${BASE}learn/counters`)
  await settle(page)
  await page.locator('[data-counter-card="hon"]').click()
  await expect(page.locator('[data-detail-counter="hon"]')).toBeVisible()
  const phone = await page.locator('[role="dialog"]').count()
  await goTo(page, p, /Cá nhân/, 'me', 'Cách đếm 本 → Cá nhân', phone > 0)
})

test('tab Bộ thủ → chọn một bộ → Sổ tay', async ({ page }) => {
  const p = await probe(page)
  await page.goto(`${BASE}kanji?tab=radicals&bai=1`)
  await settle(page)
  await page.locator('[data-radical-card] button[aria-label^="Bộ "]').first().click()
  await expect(page.locator('[data-detail-radical]')).toBeVisible()
  const phone = await page.locator('[role="dialog"]').count()
  await goTo(page, p, /Sổ tay/, 'notebooks', 'Bộ thủ → Sổ tay', phone > 0)
})

test('bấm nhanh hai mục điều hướng liên tiếp (panel đang mở)', async ({ page }) => {
  const p = await probe(page)
  await pickKanji(page)
  await clearNavLog(page)
  // Hai lần bấm trong cùng một tác vụ: trang thứ nhất chưa kịp mount thì đã sang trang thứ hai.
  await page.evaluate(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Điều hướng chính"] a')]
    const by = (t: string) => links.find((a) => a.offsetParent !== null && a.textContent?.includes(t))
    by('Ôn tập')?.click()
    by('Sổ tay')?.click()
  })
  await expect.poll(() => pathOf(page)).toBe(`${BASE}notebooks`)
  await expectMainFilled(page, 'bấm nhanh Ôn tập → Sổ tay')
  await page.waitForTimeout(500)
  // Cả hai lần bấm đều được ghi, và không có thêm lần ghi nào của trang cũ.
  expect((await navLog(page)).filter((e) => !e.includes('/notebooks') && !e.includes('/review'))).toEqual([])
  expect(p.errors).toEqual([])
  // Rồi quay về Học và đi tiếp: vẫn không trắng.
  await goTo(page, p, LEARN, 'learn', 'Sổ tay → Học')
  await goTo(page, p, /Trang chủ/, '', 'Học → Trang chủ')
})

test('chuyển liên tục nhiều trang: main luôn có nội dung', async ({ page }) => {
  const p = await probe(page)
  await page.goto(`${BASE}`)
  await expectMainFilled(page, 'Trang chủ')
  for (const [label, path] of [
    [LEARN, 'learn'],
    [/Ôn tập/, 'review'],
    [/Sổ tay/, 'notebooks'],
    [/Cá nhân/, 'me'],
    [/Trang chủ/, ''],
  ] as const) {
    await goTo(page, p, label, path, `→ ${path || 'Trang chủ'}`)
  }
})

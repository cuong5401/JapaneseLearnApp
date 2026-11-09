import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

/**
 * Khung "Hỏi AI" trên điện thoại (sheet gần toàn màn hình). Chạy ở 2 nơi:
 *  - playwright.config.ts (dev, base '/'): project iphone (WebKit) và android;
 *  - playwright.preview.config.ts (bản build, base '/JapaneseLearnApp/'): E2E_BASE đặt trong config.
 * Không gọi AI: cuộc trò chuyện (có bảng rộng) được đặt sẵn vào localStorage.
 */
const BASE = process.env.E2E_BASE ?? '/'
const app = (path = '') => BASE + path.replace(/^\//, '')

const UNLOCK = (process.env.VITE_UNLOCK_CODE ?? '').trim()
const UNLOCK_HASH = UNLOCK ? createHash('sha256').update(`kotonoha-unlock:${UNLOCK}`).digest('hex') : ''

const TABLE = [
  'So sánh:',
  '',
  '| Từ | Cách đọc | Nghĩa | Ví dụ | Dịch | Ghi chú |',
  '|---|---|---|---|---|---|',
  '| 把握 | はあく | nắm bắt | 状況を正確に把握する必要があります | Cần nắm bắt tình hình chính xác | Văn viết |',
  '| 理解 | りかい | hiểu | 日本の文化をもっと深く理解したいです | Tôi muốn hiểu sâu hơn văn hóa Nhật | Dùng rộng rãi |',
].join('\n')

function seedChat(page: Page) {
  return page.addInitScript(
    ([table, unlock]) => {
      const now = Date.now()
      const messages = []
      for (let i = 1; i <= 8; i++) {
        messages.push({ role: 'user', text: `Câu hỏi số ${i}`, at: now })
        messages.push({ role: 'assistant', text: `Trả lời số ${i}.\n\n${'Nội dung dài để danh sách tin cuộn được. '.repeat(6)}`, at: now })
      }
      messages.push({ role: 'user', text: 'So sánh 把握 và 理解', at: now })
      messages.push({ role: 'assistant', text: table, at: now })
      localStorage.setItem('jla:v1:ai-chats', JSON.stringify([{ id: 'c-test', title: 'Thử', mode: 'lookup', pinned: false, createdAt: now, updatedAt: now, messages }]))
      if (!localStorage.getItem('jla:v1:ai-dock')) localStorage.setItem('jla:v1:ai-dock', JSON.stringify({ open: false, tabY: null, convId: 'c-test', mode: 'lookup' }))
      // Key giả chỉ để qua màn "Chưa có key"; test không gửi câu hỏi nên không gọi mạng.
      localStorage.setItem('jla:v1:ai-settings', JSON.stringify({ provider: 'gemini' }))
      localStorage.setItem('jla:ai-key:gemini', 'test-key-not-real')
      if (unlock) localStorage.setItem('jla:unlock', unlock)
    },
    [TABLE, UNLOCK_HASH] as const,
  )
}

const dock = (page: Page) => page.locator('[data-ai-dock]')
const panel = (page: Page) => page.locator('[data-ai-panel]')
const path = (page: Page) => new URL(page.url()).pathname

async function open(page: Page) {
  await page.locator('[data-ai-tab]').tap()
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'open')
  await expect(panel(page).locator('[data-dock-scroll]')).toBeVisible({ timeout: 15_000 })
  // Hết hiệu ứng trượt.
  await expect.poll(async () => Math.round((await panel(page).boundingBox())!.x)).toBe(8)
}

/** PointerEvent tổng hợp (Playwright không kéo chạm được trên WebKit mobile). */
async function swipeHeader(page: Page, fraction: number) {
  await page.evaluate(async (f) => {
    const header = document.querySelector<HTMLElement>('[data-dock-header]')!
    const r = header.getBoundingClientRect()
    const panelW = document.querySelector('[data-ai-panel]')!.getBoundingClientRect().width
    const y = r.top + 20
    const x0 = r.left + 40
    const fire = (type: string, x: number) =>
      header.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }))
    fire('pointerdown', x0)
    const steps = 10
    for (let i = 1; i <= steps; i++) {
      fire('pointermove', x0 + (panelW * f * i) / steps)
      // Kéo chậm (vận tốc < 500px/s) để chỉ quãng đường quyết định.
      await new Promise((res) => setTimeout(res, 60))
    }
    fire('pointerup', x0 + panelW * f)
  }, fraction)
}

test.beforeEach(async ({ page }) => {
  await seedChat(page)
})

test('mở khung: cuộn danh sách tin không làm trang cuộn theo; thu gọn thì trang về đúng vị trí cũ', async ({ page }) => {
  await page.goto(app('kanji'))
  await expect(page.getByRole('heading', { name: 'Chữ Hán', level: 1 })).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => window.scrollTo(0, 300))
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(300)
  await open(page)
  // Body cố định đúng chỗ cũ (iOS bỏ qua overflow: hidden).
  expect(await page.evaluate(() => ({ pos: document.body.style.position, top: document.body.style.top }))).toEqual({ pos: 'fixed', top: '-300px' })
  const list = panel(page).locator('[data-dock-scroll]')
  await list.evaluate((el) => (el.scrollTop = 0))
  await list.evaluate((el) => el.scrollBy(0, 400))
  await page.mouse.wheel?.(0, 0).catch(() => {})
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.body.style.top)).toBe('-300px')
  expect(await list.evaluate((el) => getComputedStyle(el).overscrollBehaviorY || getComputedStyle(el).getPropertyValue('overscroll-behavior-y'))).toMatch(/contain|^$/)

  await panel(page).getByRole('button', { name: 'Thu gọn' }).tap()
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'closed')
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(300)
  expect(await page.evaluate(() => document.body.style.position)).toBe('')
})

test('bàn phím ảo (visualViewport thấp đi 340px): header khung không khuất, ô nhập trong vùng thấy, bottom nav ẩn', async ({ page }) => {
  await page.goto(app())
  await open(page)
  const nav = page.locator('[data-bottom-nav]')
  await expect(nav).toBeVisible()
  await page.evaluate(() => {
    const vv = window.visualViewport!
    const h = vv.height - 340
    Object.defineProperty(vv, 'height', { configurable: true, get: () => h })
    vv.dispatchEvent(new Event('resize'))
  })
  await expect(nav).toBeHidden()
  await expect(page.locator('[data-ai-tab]')).toBeHidden()
  const m = await page.evaluate(() => {
    const vv = window.visualViewport!
    const header = document.querySelector('[data-dock-header]')!.getBoundingClientRect()
    const input = document.querySelector('[data-ai-panel] [data-ai-input]')!.getBoundingClientRect()
    return { headerTop: header.top, inputTop: input.top, inputBottom: input.bottom, top: vv.offsetTop, bottom: vv.offsetTop + vv.height }
  })
  expect(m.headerTop).toBeGreaterThanOrEqual(0)
  expect(m.inputTop).toBeGreaterThanOrEqual(m.top)
  expect(m.inputBottom).toBeLessThanOrEqual(m.bottom)
  // Danh sách tin tự xuống tin mới nhất.
  const list = panel(page).locator('[data-dock-scroll]')
  expect(await list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(4)

  // Bàn phím đóng: thanh đáy hiện lại.
  await page.evaluate(() => {
    delete (window.visualViewport as unknown as { height?: number }).height
    window.visualViewport!.dispatchEvent(new Event('resize'))
  })
  await expect(nav).toBeVisible()
})

test('bấm "Chữ Hán" ở bottom nav: thu gọn và chuyển trang một lần bấm; mở lại còn tin nhắn và chữ gõ dở; Back lùi trang', async ({ page }) => {
  await page.goto(app())
  await open(page)
  const input = panel(page).locator('[data-ai-input]')
  await input.fill('abc đang gõ dở')
  await page.locator('[data-bottom-nav]').getByRole('link', { name: /Chữ Hán/ }).tap()
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'closed')
  await expect.poll(() => path(page)).toBe(app('kanji'))
  expect(path(page)).not.toContain('JapaneseLearnApp/JapaneseLearnApp')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang này' })).toHaveCount(0)

  await open(page)
  await expect(input).toHaveValue('abc đang gõ dở')
  await expect(panel(page).locator('[data-msg="user"]')).toHaveCount(9)
  await panel(page).getByRole('button', { name: 'Thu gọn' }).tap()
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'closed')

  // Mục lịch sử của khung đã được thay bằng trang mới: Back về trang chủ ngay, không có lần Back "chết".
  await page.goBack()
  await expect.poll(() => path(page)).toBe(app())
})

test('chạm vùng nền phía trên khung: khung vẫn mở, URL không đổi, trang bên dưới không nhận chạm', async ({ page }) => {
  await page.goto(app('kanji'))
  await open(page)
  const before = page.url()
  // Phần trang lộ ra: lề trái 8px của sheet (dưới header) và lớp nền phủ lên đó.
  const backdrop = page.locator('[data-ai-backdrop]')
  await expect(backdrop).toBeVisible()
  const nav = (await page.locator('[data-bottom-nav]').boundingBox())!
  const bd = (await backdrop.boundingBox())!
  expect(bd.y + bd.height).toBeLessThanOrEqual(nav.y + 1)
  await page.touchscreen.tap(3, 200)
  await page.waitForTimeout(400)
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'open')
  expect(page.url()).toBe(before)
})

test('vuốt header sang phải: 40% thì thu gọn, 20% thì bật về', async ({ page }) => {
  await page.goto(app())
  await open(page)
  await swipeHeader(page, 0.2)
  await page.waitForTimeout(500)
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'open')
  await expect.poll(async () => Math.round((await panel(page).boundingBox())!.x)).toBe(8)

  await swipeHeader(page, 0.4)
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'closed')
  expect(path(page)).toBe(app())
})

test('bảng rộng trong câu trả lời cuộn ngang được, trang không tràn ngang', async ({ page }) => {
  await page.goto(app())
  await open(page)
  const table = panel(page).locator('[data-md-table]').last()
  await table.scrollIntoViewIfNeeded()
  const m = await table.evaluate((el) => {
    el.scrollLeft = 200
    return { sw: el.scrollWidth, cw: el.clientWidth, left: el.scrollLeft, minCol: Math.min(...[...el.querySelectorAll('th')].map((th) => th.getBoundingClientRect().width)) }
  })
  expect(m.sw).toBeGreaterThan(m.cw)
  expect(m.left).toBeGreaterThan(0)
  expect(m.minCol).toBeGreaterThanOrEqual(95)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  // Cột đầu dính bên trái khi cuộn ngang.
  const first = await table.locator('td').first().evaluate((el) => getComputedStyle(el).position)
  expect(first).toBe('sticky')
})

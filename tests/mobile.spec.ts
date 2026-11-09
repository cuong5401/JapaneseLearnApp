import { expect, test, type Page } from '@playwright/test'

/**
 * Điện thoại (iPhone/WebKit và Android/Chromium, xem projects trong playwright.config.ts):
 *  - ô nhập ≥ 16px để iOS không tự phóng to khi focus; focus xong scale vẫn 1;
 *  - chạm đúp không phóng to (touch-action: manipulation);
 *  - kéo quá đầu trang không nảy (overscroll-behavior: none), vùng cuộn trong dùng contain.
 * Trình giả lập không tái hiện đủ hành vi iOS thật nên ngoài đo scale còn kiểm CSS là nguyên nhân gốc.
 */

/**
 * Bản WebKit của Playwright trên Windows/Linux chưa hỗ trợ overscroll-behavior (Safari thật có từ iOS 16):
 * khi đó bỏ qua phần kiểm thuộc tính này, Android (Chromium) vẫn kiểm đầy đủ.
 */
async function overscrollSupported(page: Page) {
  const ok = await page.evaluate(() => CSS.supports('overscroll-behavior', 'none'))
  if (!ok) test.info().annotations.push({ type: 'skip-check', description: 'overscroll-behavior không được engine này hỗ trợ' })
  return ok
}

const scale = (page: Page) => page.evaluate(() => window.visualViewport?.scale ?? 1)

/** Cỡ chữ của mọi ô nhập đang hiện (bỏ checkbox, file…). */
const inputFontSizes = (page: Page) =>
  page.locator('input, textarea, select').evaluateAll((els) =>
    els
      .filter((el) => !['checkbox', 'radio', 'file', 'hidden', 'range'].includes((el as HTMLInputElement).type))
      .filter((el) => (el as HTMLElement).offsetParent !== null || getComputedStyle(el).position === 'fixed' || getComputedStyle(el).position === 'absolute')
      .map((el) => ({ name: el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? el.id ?? el.tagName, size: parseFloat(getComputedStyle(el).fontSize) })),
  )

const useMockAi = (page: Page) => page.addInitScript(() => localStorage.setItem('jla:v1:ai-settings', JSON.stringify({ provider: 'mock' })))

const PAGES = ['/settings', '/ai', '/kanji?tab=radicals', '/grammar/n5']

for (const path of PAGES) {
  test(`ô nhập ≥ 16px và focus không phóng to: ${path}`, async ({ page }) => {
    await useMockAi(page)
    await page.goto(path)
    const first = page.locator('input:not([type=checkbox]):not([type=file]), textarea, select').first()
    await expect(first).toBeAttached()
    const sizes = await inputFontSizes(page)
    expect(sizes.length).toBeGreaterThan(0)
    for (const s of sizes) expect(s.size, `${path} › ${s.name}`).toBeGreaterThanOrEqual(16)
    await first.focus()
    await page.waitForTimeout(300)
    expect(await scale(page)).toBe(1)
  })
}

test('ô tìm kiếm ≥ 16px, focus không phóng to', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Tìm kiếm' }).first().tap()
  const input = page.getByRole('combobox', { name: 'Tìm từ, chữ Hán, ngữ pháp' })
  await expect(input).toBeFocused()
  expect(parseFloat(await input.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
  await input.fill('nihon')
  await page.waitForTimeout(300)
  expect(await scale(page)).toBe(1)
})

test('html/body chặn chạm đúp và cuộn cao su; nút có touch-action manipulation', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-next-kanji]')).toBeVisible()
  const css = await page.evaluate(() => {
    const h = getComputedStyle(document.documentElement)
    const b = getComputedStyle(document.body)
    const btn = document.querySelector('[data-next-kanji]')!
    return {
      htmlOverscroll: h.getPropertyValue('overscroll-behavior-y'),
      bodyOverscroll: b.getPropertyValue('overscroll-behavior-y'),
      htmlTouch: h.touchAction,
      bodyTouch: b.touchAction,
      buttonTouch: getComputedStyle(btn).touchAction,
      viewport: document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? '',
    }
  })
  if (await overscrollSupported(page)) {
    expect(css.htmlOverscroll).toBe('none')
    expect(css.bodyOverscroll).toBe('none')
  }
  expect(css.htmlTouch).toBe('manipulation')
  expect(css.bodyTouch).toBe('manipulation')
  expect(css.buttonTouch).toBe('manipulation')
  // Không khóa zoom hai ngón (khả năng truy cập).
  expect(css.viewport).not.toMatch(/maximum-scale|user-scalable/)
})

test('chạm đúp lên thẻ và nút không phóng to', async ({ page }) => {
  await page.goto('/')
  const target = page.locator('[data-random-kanji]')
  await expect(target).toBeVisible()
  const box = (await target.boundingBox())!
  for (let i = 0; i < 2; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + 20)
    await page.touchscreen.tap(box.x + box.width / 2, box.y + 20)
    await page.waitForTimeout(400)
  }
  expect(await scale(page)).toBe(1)
})

test('kéo quá đầu trang không nảy, trang vẫn ở đầu', async ({ page, browserName }) => {
  await page.goto('/')
  await expect(page.locator('[data-random-kanji]')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  // Vuốt xuống (kéo nội dung xuống) khi đang ở đầu trang. Chromium: chạm kéo thật qua CDP;
  // WebKit trên Playwright không có thao tác kéo chạm nên cuộn ngược bằng script.
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.synthesizeScrollGesture', { x: 200, y: 200, yDistance: 600, gestureSourceType: 'touch', speed: 2000 })
  } else {
    await page.evaluate(() => window.scrollBy(0, -600))
  }
  await page.waitForTimeout(300)
  const pos = await page.evaluate(() => ({ y: window.scrollY, top: window.visualViewport?.offsetTop ?? 0 }))
  expect(pos.y).toBe(0)
  expect(pos.top).toBe(0)
})

test('bottom sheet chi tiết cuộn trong chính nó (overscroll contain)', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-kanji-word] button').first().tap()
  const sheet = page.getByRole('dialog', { name: 'Chi tiết' })
  await expect(sheet).toBeVisible()
  test.skip(!(await overscrollSupported(page)), 'Engine này không hỗ trợ overscroll-behavior')
  const ob = await sheet.evaluate((el) => {
    let n: HTMLElement | null = el as HTMLElement
    while (n && !/(auto|scroll)/.test(getComputedStyle(n).overflowY)) n = n.parentElement
    return n ? getComputedStyle(n).getPropertyValue('overscroll-behavior-y') : 'none-found'
  })
  expect(ob).toBe('contain')
})

test.describe('khung chat Hỏi AI nổi', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jla:v1:ai-settings', JSON.stringify({ provider: 'mock' })))
  })

  /** Ô nhập nằm trọn trong phần màn hình nhìn thấy (visualViewport). */
  const inputVisible = (page: Page) =>
    page.locator('[data-ai-panel] [data-ai-input]').evaluate((el) => {
      const r = el.getBoundingClientRect()
      const vv = window.visualViewport!
      return { top: r.top, bottom: r.bottom, visibleTop: vv.offsetTop, visibleBottom: vv.offsetTop + vv.height }
    })

  test('focus ô nhập trong khung: không phóng to, ô nhập không bị che', async ({ page }) => {
    await page.goto('/')
    await page.locator('[data-ai-tab]').tap()
    await expect(page.locator('[data-ai-dock]')).toHaveAttribute('data-ai-dock', 'open')
    const input = page.locator('[data-ai-panel] [data-ai-input]')
    await input.tap()
    await expect(input).toBeFocused()
    await page.waitForTimeout(400)
    expect(await scale(page)).toBe(1)
    expect(parseFloat(await input.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
    const v = await inputVisible(page)
    expect(v.top).toBeGreaterThanOrEqual(v.visibleTop)
    expect(v.bottom).toBeLessThanOrEqual(v.visibleBottom)
  })

  test('bàn phím ảo che nửa dưới (giả lập visualViewport): khung co lại, ô nhập vẫn thấy', async ({ page }) => {
    await page.goto('/')
    await page.locator('[data-ai-tab]').tap()
    await expect(page.locator('[data-ai-dock]')).toHaveAttribute('data-ai-dock', 'open')
    const before = (await page.locator('[data-ai-panel]').boundingBox())!
    // iOS: bàn phím không đổi layout viewport mà thu visualViewport lại.
    const kbTop = await page.evaluate(() => {
      const vv = window.visualViewport!
      const h = Math.round(window.innerHeight * 0.55)
      Object.defineProperty(vv, 'height', { configurable: true, get: () => h })
      vv.dispatchEvent(new Event('resize'))
      return h
    })
    await expect.poll(async () => Math.round((await page.locator('[data-ai-panel]').boundingBox())!.height)).toBeLessThan(Math.round(before.height))
    await page.waitForTimeout(400)
    const p = (await page.locator('[data-ai-panel]').boundingBox())!
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y + p.height).toBeLessThanOrEqual(kbTop)
    const v = await inputVisible(page)
    expect(v.bottom).toBeLessThanOrEqual(kbTop)
    expect(v.top).toBeGreaterThanOrEqual(0)
  })

  test('Back của điện thoại thu gọn khung, không rời trang', async ({ page }) => {
    await page.goto('/grammar/n5')
    await page.locator('[data-ai-tab]').tap()
    await expect(page.locator('[data-ai-dock]')).toHaveAttribute('data-ai-dock', 'open')
    await page.goBack()
    await expect(page.locator('[data-ai-dock]')).toHaveAttribute('data-ai-dock', 'closed')
    expect(new URL(page.url()).pathname).toBe('/grammar/n5')
  })
})

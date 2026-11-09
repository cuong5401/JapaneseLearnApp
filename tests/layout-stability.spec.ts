import { expect, test, type Page } from '@playwright/test'

/**
 * Không layout shift: đổi tab, chọn chữ, chọn từ trong panel, chờ tải xong đều không làm khung co giãn.
 *  - độ rộng main / khung bài / panel không đổi (Δ = 0),
 *  - khối danh sách trong panel không thấp đi khi dữ liệu về (skeleton đúng số lượng),
 *  - CLS (PerformanceObserver layout-shift, bỏ shift ngay sau thao tác) < 0.02.
 */

const WIDTHS = [1280, 1440]

async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector('[aria-label^="Đang tải"]'), null, { timeout: 15_000 })
  await page.waitForTimeout(400)
}

const width = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().width)
const height = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().height)

/** Ghi CLS từ lúc trang tải (buffered). */
async function trackCls(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number }
    w.__cls = 0
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!e.hadRecentInput) w.__cls += e.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
}
const cls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls)

/** Dữ liệu từ vựng về chậm để thấy skeleton. */
async function slowVocab(page: Page, ms = 700) {
  await page.route(/\/data\/vocab\/.*\.json/, async (route) => {
    await new Promise((r) => setTimeout(r, ms))
    await route.continue()
  })
}

for (const w of WIDTHS) {
  test.describe(`${w}px`, () => {
    test.use({ viewport: { width: w, height: 900 } })
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('jla:v1:lesson-size', '20'))
      await trackCls(page)
    })

    test('bài từ vựng: 3 tab cùng độ rộng, vùng tab không thấp hơn flashcard', async ({ page }) => {
      await page.goto('/vocab/n5/1')
      await settle(page)
      const main = await width(page, 'main')
      const frame = await width(page, '[data-lesson-page]')
      const heights: number[] = []
      for (const tab of ['Flashcard', 'Quiz', 'Danh sách']) {
        await page.getByRole('radio', { name: tab }).click()
        await settle(page)
        expect(await width(page, 'main')).toBe(main)
        expect(await width(page, '[data-lesson-page]')).toBe(frame)
        heights.push(await height(page, '[data-tab-area]'))
      }
      // Quiz / danh sách không thấp hơn vùng flashcard
      expect(heights[1]).toBeGreaterThanOrEqual(heights[0] - 1)
      expect(heights[2]).toBeGreaterThanOrEqual(heights[0] - 1)
      expect(await cls(page)).toBeLessThan(0.02)
    })

    test('bài kanji: panel 360px, chọn chữ / chọn từ không đổi độ rộng, danh sách từ không co', async ({ page }) => {
      await slowVocab(page)
      await page.goto('/kanji?bai=1')
      await settle(page)
      const main = await width(page, 'main')
      const panel = page.locator('[data-detail-panel]')
      expect(await width(page, '[data-detail-panel]')).toBe(360)
      const left = await page.locator('[data-kanji-layout] > div').first().evaluate((el) => el.getBoundingClientRect().width)

      for (const i of [3, 7, 1]) {
        await page.locator('[data-kanji-cell]').nth(i).click()
        // skeleton đúng số từ → dữ liệu về không làm khối thấp đi
        const skeleton = panel.locator('ul[role=status]')
        const sk = (await skeleton.count()) ? await skeleton.first().evaluate((el) => el.getBoundingClientRect().height) : 0
        await settle(page)
        const real = await height(page, '[data-detail-panel] [data-kanji-words]')
        expect(real).toBeGreaterThanOrEqual(sk - 1)
        expect(await width(page, '[data-detail-panel]')).toBe(360)
        expect(await page.locator('[data-kanji-layout] > div').first().evaluate((el) => el.getBoundingClientRect().width)).toBe(left)
        expect(await width(page, 'main')).toBe(main)
      }

      // chọn từ trong panel
      await panel.locator('[data-kanji-words] button').first().click()
      await settle(page)
      expect(await width(page, '[data-detail-panel]')).toBe(360)
      expect(await page.locator('[data-kanji-layout] > div').first().evaluate((el) => el.getBoundingClientRect().width)).toBe(left)
      expect(await cls(page)).toBeLessThan(0.02)
    })

    test('bộ thủ: panel giữ chỗ khi chưa chọn, mở bộ không đổi độ rộng', async ({ page }) => {
      await page.goto('/kanji?tab=radicals&bai=2')
      await settle(page)
      await expect(page.locator('[data-empty-panel]')).toContainText('Chọn một bộ để xem chi tiết')
      expect(await width(page, '[data-detail-panel]')).toBe(360)
      const left = await page.locator('[data-kanji-layout] > div').first().evaluate((el) => el.getBoundingClientRect().width)
      for (const i of [0, 5, 12]) {
        await page.locator('[data-radical-card] button[aria-label^="Bộ "]').nth(i).click()
        await settle(page)
        expect(await width(page, '[data-detail-panel]')).toBe(360)
        expect(await page.locator('[data-kanji-layout] > div').first().evaluate((el) => el.getBoundingClientRect().width)).toBe(left)
      }
      // đổi tab Danh sách ↔ Flashcard: main không đổi độ rộng
      const main = await width(page, 'main')
      await page.getByRole('radio', { name: 'Flashcard' }).click()
      await settle(page)
      expect(await width(page, 'main')).toBe(main)
      expect(await cls(page)).toBeLessThan(0.02)
    })

    test('số bộ thủ đúng Khang Hy: bộ 36 夕, 37 大, 38 女; bộ không có chữ hiện "0 chữ"', async ({ page }) => {
      await page.goto('/kanji?tab=radicals&bai=2')
      await settle(page)
      for (const [no, ch] of [
        [36, '夕'],
        [37, '大'],
        [38, '女'],
      ] as const) {
        await expect(page.locator(`[data-radical-card="${no}"] [data-gridcell-glyph]`)).toHaveText(ch)
      }
      await page.locator('[data-radical-card="37"] button[aria-label^="Bộ "]').click()
      await settle(page)
      await expect(page.locator('[data-detail-radical="37"]')).toContainText('chữ Hán thuộc bộ này')
      await expect(page.locator('[data-detail-radical="37"] [data-radical-chars]')).toContainText('大')
      await page.goto('/kanji?tab=radicals')
      await settle(page)
      await page.getByPlaceholder('Tìm bộ theo tên, nghĩa hoặc số').fill('214')
      await expect(page.locator('[data-radical-card="214"]')).toContainText('0 chữ')
    })
  })
}

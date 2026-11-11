import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Thứ tự nét (KanjiVG): hoạt ảnh tự phát một lần khi mở chi tiết chữ Hán, không có thanh điều khiển,
 * chạm khung (là nút) để vẽ lại; reduced motion hiện đủ nét, chạm để thêm từng nét; chữ thiếu dữ liệu không lỗi.
 */
const WIDTHS = [390, 1280]

/** Vùng chi tiết: panel (≥ 1180px) hoặc bottom sheet. */
const detail = (page: Page, width: number) =>
  width >= 1180 ? page.getByRole('complementary', { name: 'Chi tiết chữ Hán' }) : page.getByRole('dialog', { name: 'Chi tiết' })

function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** Khung thứ tự nét (là một nút) và SVG của khung. */
const frame = (page: Page, width: number, ch: string) => detail(page, width).locator(`[data-stroke-order="${ch}"]`)
const svgOf = (box: Locator) => box.locator('> svg').first()
const step = async (box: Locator) => Number(await box.getAttribute('data-step'))

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('上: không còn nút điều khiển; tự phát xong đủ 3 nét có số; bấm khung thì vẽ lại', async ({ page }) => {
      const errors = trackErrors(page)
      await page.goto(`/kanji?k=${encodeURIComponent('上')}`)
      const box = frame(page, width, '上')
      await expect(box).toBeVisible()
      await expect(box).toHaveAttribute('aria-label', 'Vẽ lại thứ tự nét chữ 上')
      // Không còn thanh điều khiển, chữ "Nét x/y", tốc độ, Số nét, Nét mờ: khối chỉ có đúng một nút là khung.
      const section = detail(page, width).locator('section[aria-label="Thứ tự nét chữ 上"]')
      await expect(section.getByRole('button')).toHaveCount(1)
      await expect(section).not.toContainText(/Nét \d|0\.5×|Số nét|Nét mờ/)
      // Tự phát rồi dừng ở đủ 3 nét, đủ 3 số.
      await expect(box).toHaveAttribute('data-playing', 'false', { timeout: 5000 })
      await expect(box).toHaveAttribute('data-step', '3')
      await expect(svgOf(box).locator('[data-stroke-num]')).toHaveCount(3)
      // Bấm khung → vẽ lại từ đầu; bấm lần nữa khi đang vẽ dở cũng về nét 0.
      const before = await box.boundingBox()
      await box.click()
      await expect(box).toHaveAttribute('data-playing', 'true')
      expect(await step(box)).toBeLessThan(3)
      await box.click()
      expect(await step(box)).toBe(0)
      await expect(box).toHaveAttribute('data-step', '3', { timeout: 5000 })
      // Enter cũng vẽ lại; khung không đổi kích thước.
      await box.press('Enter')
      await expect(box).toHaveAttribute('data-playing', 'true')
      const after = await box.boundingBox()
      expect(Math.round(after!.width)).toBe(Math.round(before!.width))
      expect(Math.round(after!.height)).toBe(Math.round(before!.height))
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(errors).toEqual([])
    })

    test('chữ không có dữ liệu: hiện thông báo, không lỗi console', async ({ page }) => {
      const errors = trackErrors(page)
      await page.goto('/kanji?k=鬱')
      const box = frame(page, width, '鬱')
      await expect(box).toHaveAttribute('data-stroke-missing')
      await expect(box).toContainText('Chưa có dữ liệu thứ tự nét')
      expect(errors).toEqual([])
    })

    test('reduced motion: hiện ngay đủ nét có số; mỗi lần chạm thêm một nét, hết thì quay lại', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/kanji?k=日')
      const box = frame(page, width, '日')
      await expect(box).toHaveAttribute('data-playing', 'false')
      await expect(box).toHaveAttribute('data-step', '4')
      await expect(svgOf(box).locator('[data-stroke-num]')).toHaveCount(4)
      for (const n of [1, 2, 3, 4, 1]) {
        await box.click()
        await expect(box).toHaveAttribute('data-step', String(n))
        await expect(box).toHaveAttribute('data-playing', 'false')
        await expect(svgOf(box).locator('[data-stroke-num]')).toHaveCount(n)
      }
    })

    test('kana: chạm ô あ trong bảng chữ có thứ tự nét', async ({ page }) => {
      await page.goto('/kana')
      await page.locator('[data-kana-cell="h-a"]').click()
      await expect(page.locator('[data-stroke-order="あ"]').first()).toBeVisible()
      await expect(page.locator('[data-stroke-order="あ"] > svg').first()).toBeVisible()
    })

    test('事 8 nét, 年 6 nét, 曜 18 nét: mỗi <path> vẽ được (getTotalLength > 5)', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      for (const [ch, n] of [
        ['事', 8],
        ['年', 6],
        ['曜', 18],
      ] as const) {
        await page.goto(`/kanji?k=${encodeURIComponent(ch)}`)
        const box = frame(page, width, ch)
        await expect(box).toHaveAttribute('data-step', String(n))
        const lengths = await svgOf(box)
          .locator('path[data-stroke]')
          .evaluateAll((els) => els.map((e) => (e as SVGPathElement).getTotalLength()))
        expect(lengths).toHaveLength(n)
        for (const [i, l] of lengths.entries()) expect(l, `${ch} nét ${i + 1}`).toBeGreaterThan(5)
      }
    })

    test('ghi nguồn KanjiVG ở Cài đặt > Giới thiệu', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.locator('[data-about]')).toContainText('KanjiVG (Ulrich Apel), CC BY-SA')
    })
  })
}

/** Tâm các số (đơn vị viewBox) + bán kính vòng của nét hiện tại. */
const numCenters = (box: Locator) =>
  svgOf(box).evaluate((svg) => ({
    r: Number(svg.querySelector('[data-stroke-num] circle')?.getAttribute('r') ?? 0),
    pts: [...svg.querySelectorAll('[data-stroke-num]')].map((g) => [Number(g.getAttribute('data-cx')), Number(g.getAttribute('data-cy'))]),
  }))

for (const width of WIDTHS) {
  test.describe(`${width}px số thứ tự nét`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('合 hoàn chỉnh hiện đủ 6 số, chỉ 1 vòng đỏ; 合 書 曜 議 không chồng nhau; số trong vòng ≥ 11px', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      for (const ch of ['合', '書', '曜', '議']) {
        await page.goto(`/kanji?k=${encodeURIComponent(ch)}`)
        const box = frame(page, width, ch)
        await expect(box).toHaveAttribute('data-playing', 'false')
        const n = Number(await box.getAttribute('data-total'))
        await expect(box).toHaveAttribute('data-step', String(n))
        if (ch === '合') expect(n).toBe(6)
        await expect(svgOf(box).locator('[data-stroke-num]')).toHaveCount(n)
        // chỉ nét hiện tại (nét cuối) có vòng tròn đỏ
        await expect(svgOf(box).locator('[data-stroke-num] circle')).toHaveCount(1)
        await expect(svgOf(box).locator(`[data-stroke-num="${n}"] circle`)).toHaveAttribute('fill', 'var(--beni)')
        const { r, pts } = await numCenters(box)
        for (let i = 0; i < pts.length; i++)
          for (let j = i + 1; j < pts.length; j++)
            expect(Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]), `${ch} số ${i + 1}–${j + 1}`).toBeGreaterThan(2 * r)
        // cỡ chữ thật trong vòng = fontSize (đơn vị viewBox) × tỉ lệ khung
        const px = await svgOf(box).evaluate((svg) => {
          const t = svg.querySelector('[data-stroke-num][data-state="current"] text')!
          return Number(t.getAttribute('font-size')) * (svg.getBoundingClientRect().width / 109)
        })
        expect(px).toBeGreaterThanOrEqual(10.99)
      }
    })

    test('reduced motion, chạm từng nét: số của nét đó màu đỏ (current), số trước là done, nét sau chưa có số', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/kanji?k=合')
      const box = frame(page, width, '合')
      await expect(box).toHaveAttribute('data-step', '6')
      for (let k = 1; k <= 6; k++) {
        await box.click()
        await expect(box).toHaveAttribute('data-step', String(k))
        await expect(svgOf(box).locator(`[data-stroke-num="${k}"]`)).toHaveAttribute('data-state', 'current')
        await expect(svgOf(box).locator(`[data-stroke-num="${k}"] circle`)).toHaveAttribute('fill', 'var(--beni)')
        if (k > 1) {
          await expect(svgOf(box).locator(`[data-stroke-num="${k - 1}"]`)).toHaveAttribute('data-state', 'done')
          await expect(svgOf(box).locator(`[data-stroke-num="${k - 1}"] circle`)).toHaveCount(0)
        }
        if (k < 6) await expect(svgOf(box).locator(`[data-stroke-num="${k + 1}"]`)).toHaveCount(0)
        await expect(box.locator('[data-stroke-arrow]')).toHaveCount(1)
      }
    })

    for (const theme of ['light', 'dark']) {
      test(`ảnh chụp 事 ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('jla:theme', t), theme)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/kanji?k=事')
        const box = frame(page, width, '事')
        await expect(box).toHaveAttribute('data-step', '8')
        // nét 5/8 để thấy cả nét mờ: chạm 5 lần (1 → 5)
        for (let i = 0; i < 5; i++) await box.click()
        await expect(box).toHaveAttribute('data-step', '5')
        await box.screenshot({ path: `test-results/strokes-${width}-${theme}.png` })
      })
    }
  })
}

import { expect, test, type Page } from '@playwright/test'

/**
 * Thứ tự nét (KanjiVG): hoạt ảnh tự phát khi mở chi tiết chữ Hán, điều khiển từng nét,
 * chữ không có dữ liệu không lỗi, reduced motion không tự phát, kana có thứ tự nét.
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

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('日: hoạt ảnh tự phát, bấm › tới "Nét 4/4"', async ({ page }) => {
      const errors = trackErrors(page)
      await page.goto('/kanji?k=日')
      const box = detail(page, width).locator('[data-stroke-order="日"]')
      await expect(box).toBeVisible()
      await expect(box).toHaveAttribute('data-playing', 'true')
      // đang vẽ: số nét tăng dần
      await expect(box.locator('[data-stroke-step]')).not.toHaveText('Nét 0/4', { timeout: 5000 })
      await box.getByRole('button', { name: 'Tạm dừng' }).click()
      await expect(box).toHaveAttribute('data-playing', 'false')
      // về đầu rồi đi từng nét
      await toFirst(box)
      await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 1/4')
      for (const n of [2, 3, 4]) {
        await box.getByRole('button', { name: 'Nét sau' }).click()
        await expect(box.locator('[data-stroke-step]')).toHaveText(`Nét ${n}/4`)
      }
      await expect(box.getByRole('button', { name: 'Nét sau' })).toBeDisabled()
      // không còn dải hình nhỏ, không còn dòng ghi nguồn dưới khung (đã chuyển sang Cài đặt)
      await expect(box.locator('[data-stroke-strip]')).toHaveCount(0)
      await expect(box).not.toContainText('KanjiVG')
      // khung không tràn ngang
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(errors).toEqual([])
    })

    test('chữ không có dữ liệu: hiện thông báo, không lỗi console', async ({ page }) => {
      const errors = trackErrors(page)
      await page.goto('/kanji?k=鬱')
      const box = detail(page, width).locator('[data-stroke-order="鬱"]')
      await expect(box).toHaveAttribute('data-stroke-missing')
      await expect(box).toContainText('Chưa có dữ liệu thứ tự nét')
      expect(errors).toEqual([])
    })

    test('reduced motion: không tự phát, vẫn có nút từng nét', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/kanji?k=日')
      const box = detail(page, width).locator('[data-stroke-order="日"]')
      await expect(box).toHaveAttribute('data-playing', 'false')
      await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 4/4')
      await expect(box.getByRole('button', { name: 'Phát' })).toHaveCount(0)
      await box.getByRole('button', { name: 'Nét trước' }).click()
      await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 3/4')
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
        const box = detail(page, width).locator(`[data-stroke-order="${ch}"]`)
        await expect(box.locator('[data-stroke-step]')).toHaveText(`Nét ${n}/${n}`)
        // các path nét (không tính nét mờ / mũi tên): stroke-width mặc định, có màu
        const lengths = await box.locator('> svg path[data-stroke]').evaluateAll((els) => els.map((e) => (e as SVGPathElement).getTotalLength()))
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

/** Về nét 1: lùi hết rồi tiến một nét. */
async function toFirst(box: ReturnType<Page['locator']>) {
  const prev = box.getByRole('button', { name: 'Nét trước' })
  while (await prev.isEnabled()) await prev.click()
  await box.getByRole('button', { name: 'Nét sau' }).click()
}

/** Tâm các số (đơn vị viewBox) + bán kính vòng của nét hiện tại. */
const numCenters = (page: Page, ch: string) =>
  page.locator(`[data-stroke-order="${ch}"] > svg`).evaluate((svg) => ({
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
        const box = detail(page, width).locator(`[data-stroke-order="${ch}"]`)
        await expect(box.locator('[data-stroke-step]')).toHaveText(/Nét (\d+)\/\1/)
        const n = Number((await box.locator('[data-stroke-step]').textContent())!.match(/\/(\d+)/)![1])
        if (ch === '合') expect(n).toBe(6)
        await expect(box.locator('> svg [data-stroke-num]')).toHaveCount(n)
        // chỉ nét hiện tại (nét cuối) có vòng tròn đỏ
        await expect(box.locator('> svg [data-stroke-num] circle')).toHaveCount(1)
        await expect(box.locator(`> svg [data-stroke-num="${n}"] circle`)).toHaveAttribute('fill', 'var(--beni)')
        const { r, pts } = await numCenters(page, ch)
        for (let i = 0; i < pts.length; i++)
          for (let j = i + 1; j < pts.length; j++)
            expect(Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]), `${ch} số ${i + 1}–${j + 1}`).toBeGreaterThan(2 * r)
        // cỡ chữ thật trong vòng = fontSize (đơn vị viewBox) × tỉ lệ khung
        const px = await box.locator('> svg').evaluate((svg) => {
          const t = svg.querySelector('[data-stroke-num][data-state="current"] text')!
          return Number(t.getAttribute('font-size')) * (svg.getBoundingClientRect().width / 109)
        })
        expect(px).toBeGreaterThanOrEqual(10.99)
      }
    })

    test('bấm › từng nét: số của nét đó đổi màu đỏ (current), các số trước là done', async ({ page }) => {
      await page.goto('/kanji?k=合')
      const box = detail(page, width).locator('[data-stroke-order="合"]')
      await box.getByRole('button', { name: 'Tạm dừng' }).click()
      await toFirst(box)
      for (let k = 1; k <= 6; k++) {
        if (k > 1) await box.getByRole('button', { name: 'Nét sau' }).click()
        await expect(box.locator(`> svg [data-stroke-num="${k}"]`)).toHaveAttribute('data-state', 'current')
        await expect(box.locator(`> svg [data-stroke-num="${k}"] circle`)).toHaveAttribute('fill', 'var(--beni)')
        if (k > 1) {
          await expect(box.locator(`> svg [data-stroke-num="${k - 1}"]`)).toHaveAttribute('data-state', 'done')
          await expect(box.locator(`> svg [data-stroke-num="${k - 1}"] circle`)).toHaveCount(0)
        }
        // nét chưa vẽ không có số
        if (k < 6) await expect(box.locator(`> svg [data-stroke-num="${k + 1}"]`)).toHaveCount(0)
        await expect(box.locator('[data-stroke-arrow]')).toHaveCount(1)
      }
    })

    for (const theme of ['light', 'dark']) {
      test(`ảnh chụp 事 ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('jla:theme', t), theme)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/kanji?k=事')
        const box = detail(page, width).locator('[data-stroke-order="事"]')
        await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 8/8')
        // giữa chừng (nét 5/8) để thấy cả nét mờ
        await box.getByRole('button', { name: 'Nét trước' }).click({ clickCount: 1 })
        for (let i = 0; i < 2; i++) await box.getByRole('button', { name: 'Nét trước' }).click()
        await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 5/8')
        await box.screenshot({ path: `test-results/strokes-${width}-${theme}.png` })
      })
    }
  })
}

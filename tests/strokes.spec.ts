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

    test('日: hoạt ảnh tự phát, bấm › tới "Nét 4/4", dải hình tĩnh 4 ô', async ({ page }) => {
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
      await box.locator('[data-stroke-strip] button').first().click()
      await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 1/4')
      for (const n of [2, 3, 4]) {
        await box.getByRole('button', { name: 'Nét sau' }).click()
        await expect(box.locator('[data-stroke-step]')).toHaveText(`Nét ${n}/4`)
      }
      await expect(box.getByRole('button', { name: 'Nét sau' })).toBeDisabled()
      await expect(box.locator('[data-stroke-strip] button')).toHaveCount(4)
      await expect(detail(page, width)).toContainText('KanjiVG')
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

    test('reduced motion: không tự phát, vẫn có dải hình và nút từng nét', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/kanji?k=日')
      const box = detail(page, width).locator('[data-stroke-order="日"]')
      await expect(box).toHaveAttribute('data-playing', 'false')
      await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 4/4')
      await expect(box.getByRole('button', { name: 'Phát' })).toHaveCount(0)
      await box.getByRole('button', { name: 'Nét trước' }).click()
      await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 3/4')
      await expect(box.locator('[data-stroke-strip] button')).toHaveCount(4)
    })

    test('kana: chạm ô あ trong bảng chữ có thứ tự nét', async ({ page }) => {
      await page.goto('/kana')
      await page.locator('[data-kana-cell="h-a"]').click()
      await expect(page.locator('[data-stroke-order="あ"]').first()).toBeVisible()
      await expect(page.locator('[data-stroke-order="あ"] [data-stroke-strip] button').first()).toBeVisible()
    })
  })
}

/** Tâm + đường kính (px thật) các vòng số trong khung chính. */
const numCircles = (page: Page, ch: string) =>
  page
    .locator(`[data-stroke-order="${ch}"] > svg [data-stroke-num] circle`)
    .evaluateAll((els) => els.map((e) => {
      const b = e.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, d: b.width }
    }))

for (const width of WIDTHS) {
  test.describe(`${width}px số thứ tự nét`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('合 hoàn chỉnh hiện đủ 6 vòng số; 合 書 曜 議 không chồng nhau; chữ số ≥ 11px', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      for (const ch of ['合', '書', '曜', '議']) {
        await page.goto(`/kanji?k=${encodeURIComponent(ch)}`)
        const box = detail(page, width).locator(`[data-stroke-order="${ch}"]`)
        await expect(box.locator('[data-stroke-step]')).toHaveText(/Nét (\d+)\/\1/)
        const n = Number((await box.locator('[data-stroke-step]').textContent())!.match(/\/(\d+)/)![1])
        if (ch === '合') expect(n).toBe(6)
        await expect(box.locator('> svg [data-stroke-num]')).toHaveCount(n)
        const cs = await numCircles(page, ch)
        for (let i = 0; i < cs.length; i++)
          for (let j = i + 1; j < cs.length; j++) expect(Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y), `${ch} số ${i + 1}–${j + 1}`).toBeGreaterThan(cs[i].d)
        // cỡ chữ thật = fontSize (đơn vị viewBox) × tỉ lệ khung
        const px = await box.locator('> svg').evaluate((svg) => {
          const t = svg.querySelector('[data-stroke-num] text')!
          return Number(t.getAttribute('font-size')) * (svg.getBoundingClientRect().width / 109)
        })
        expect(px).toBeGreaterThanOrEqual(10.99)
      }
    })

    test('bấm › từng nét: số của nét đó đổi màu đỏ (current), các số trước là done', async ({ page }) => {
      await page.goto('/kanji?k=合')
      const box = detail(page, width).locator('[data-stroke-order="合"]')
      await box.getByRole('button', { name: 'Tạm dừng' }).click()
      await box.locator('[data-stroke-strip] button').first().click()
      for (let k = 1; k <= 6; k++) {
        if (k > 1) await box.getByRole('button', { name: 'Nét sau' }).click()
        await expect(box.locator(`> svg [data-stroke-num="${k}"]`)).toHaveAttribute('data-state', 'current')
        await expect(box.locator(`> svg [data-stroke-num="${k}"] circle`)).toHaveAttribute('fill', 'var(--beni)')
        if (k > 1) await expect(box.locator(`> svg [data-stroke-num="${k - 1}"]`)).toHaveAttribute('data-state', 'done')
        await expect(box.locator('[data-stroke-arrow]')).toHaveCount(1)
      }
    })

    for (const theme of ['light', 'dark']) {
      test(`ảnh chụp 合 ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('jla:theme', t), theme)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/kanji?k=合')
        const box = detail(page, width).locator('[data-stroke-order="合"]')
        await expect(box.locator('[data-stroke-step]')).toHaveText('Nét 6/6')
        await box.screenshot({ path: `test-results/strokes-${width}-${theme}.png` })
      })
    }
  })
}

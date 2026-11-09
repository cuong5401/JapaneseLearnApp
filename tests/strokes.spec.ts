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

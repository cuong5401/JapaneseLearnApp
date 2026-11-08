import { expect, test, type Page } from '@playwright/test'

/** Ngữ pháp N3 / N5: lọc theo nhóm, mẫu tự soạn có nhãn "chưa kiểm tra", bấm "Đã kiểm tra" (giữ sau F5). */

const WIDTHS = [390, 1280]

async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector('[aria-label^="Đang tải"]'), null, { timeout: 15_000 })
  await page.waitForTimeout(400)
}

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('N3: lọc nhóm "Thời điểm", có cả chương Excel và mẫu tự soạn', async ({ page }) => {
      await page.goto('/grammar/n3')
      await settle(page)
      await expect(page.getByText(/155 mẫu · 100 mẫu Kotonoha soạn, 100 chưa kiểm tra/)).toBeVisible()
      const chip = page.locator('[data-group-chip="Thời điểm"]')
      await chip.click()
      await expect(chip).toHaveAttribute('aria-pressed', 'true')
      await expect(page).toHaveURL(/nhom=/)
      const rows = page.locator('a[href*="/grammar/n3/gn3-"]')
      const count = Number((await chip.locator('span').textContent())?.trim())
      await expect(rows).toHaveCount(count)
      await expect(rows.filter({ hasText: '～うちに' }).first()).toBeVisible() // chương Excel
      await expect(rows.filter({ hasText: '～たとたん(に)' })).toBeVisible() // tự soạn
      await expect(page.locator('[data-auto-badge="unchecked"]').first()).toBeVisible()
      expect(await noOverflow(page)).toBe(true)

      // Chip "Chưa kiểm tra" chỉ còn mẫu tự soạn.
      await page.locator('[data-group-chip="chua-kiem-tra"]').click()
      await expect(rows).toHaveCount(100)
    })

    test('Mở 2 mẫu: tự soạn (Lưu ý, Xem thêm, Đã kiểm tra giữ sau F5) và chương Excel (liên kết ngược)', async ({ page }) => {
      await page.goto('/grammar/n3?nhom=Thời điểm')
      await settle(page)
      await page.locator('a[href*="/grammar/n3/gn3-"]').filter({ hasText: '～たとたん(に)' }).click()
      await settle(page)
      await expect(page.getByRole('heading', { name: '～たとたん(に)' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Ví dụ' })).toBeVisible()
      await expect(page.locator('ol > li')).toHaveCount(3)
      await expect(page.getByRole('heading', { name: 'Lưu ý' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Xem thêm' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Xem toàn bộ giải thích' })).toHaveCount(0)

      const badge = page.locator('[data-auto-badge]').first()
      await expect(badge).toHaveAttribute('data-auto-badge', 'unchecked')
      await page.getByRole('button', { name: 'Đã kiểm tra' }).click()
      await expect(badge).toHaveAttribute('data-auto-badge', 'checked')
      await page.reload()
      await settle(page)
      await expect(page.locator('[data-auto-badge]').first()).toHaveAttribute('data-auto-badge', 'checked')
      expect(await noOverflow(page)).toBe(true)

      // Liên kết "Xem thêm" sang mẫu khác, rồi sang chương Excel ～うちに: thấy mẫu tự soạn trỏ về nó.
      await page.goto('/grammar/n3?nhom=Thời điểm')
      await settle(page)
      await page.locator('a[href*="/grammar/n3/gn3-"]').filter({ hasText: /^\d+～うちに/ }).click()
      await settle(page)
      await expect(page.locator('[data-auto-badge]')).toHaveCount(0)
      await expect(page.locator('[data-related]').filter({ hasText: '～限り' })).toBeVisible()
      expect(await noOverflow(page)).toBe(true)
    })

    test('N5: 63 mẫu tự soạn, lọc "Trợ từ"', async ({ page }) => {
      await page.goto('/grammar/n5')
      await settle(page)
      await expect(page.getByText(/^63 mẫu/)).toBeVisible()
      await page.locator('[data-group-chip="Trợ từ"]').click()
      await expect(page.locator('a[href*="/grammar/n5/gn5-"]')).toHaveCount(13)
      expect(await noOverflow(page)).toBe(true)
    })
  })
}

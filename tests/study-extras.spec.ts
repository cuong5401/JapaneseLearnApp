import { expect, test, type Page } from '@playwright/test'

/**
 * Kanji/Bộ thủ chia bài + flashcard, ngăn xếp chi tiết (panel / bottom sheet theo URL), Sổ tay.
 */

const WIDTHS = [390, 1280]

async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector('[aria-label^="Đang tải"]'), null, { timeout: 15_000 })
  await page.waitForTimeout(500)
}

const cards = (page: Page) => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('jla:v1:cards') ?? '{}')))

/** Vùng chi tiết: panel bên phải (≥1180px) hoặc bottom sheet. */
const detail = (page: Page, width: number) =>
  width >= 1180 ? page.getByRole('complementary', { name: 'Chi tiết chữ Hán' }) : page.getByRole('dialog', { name: 'Chi tiết' })

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('jla:v1:lesson-size', '20'))
    })

    test('Kanji: lưới bài, Bài 2 flashcard chấm điểm vào SRS', async ({ page }) => {
      await page.goto('/kanji')
      await settle(page)
      await expect(page.getByRole('link', { name: /^Bài 2,/ })).toBeVisible()
      await page.getByRole('link', { name: /^Bài 2,/ }).click()
      await settle(page)
      await expect(page).toHaveURL(/bai=2/)
      await expect(page.locator('[data-kanji-cell]')).toHaveCount(20)
      await page.getByRole('radio', { name: 'Flashcard' }).click()
      await settle(page)
      const card = page.locator('[role=button][aria-label*="Chạm để lật"]').first()
      await card.click()
      await expect(page.locator('[role=button][aria-label*="mặt sau"]')).toBeVisible()
      await page.keyboard.press('ArrowRight')
      await expect.poll(async () => (await cards(page)).filter((id) => id.startsWith('kj-')).length).toBe(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })

    test('Kanji: chọn 日 → bấm 日本 → "← 日" quay lại; Back của trình duyệt lùi trong ngăn xếp', async ({ page }) => {
      await page.goto('/kanji?level=N5&bai=1')
      await settle(page)
      await page.locator('[data-kanji-cell="日"]').click()
      const panel = detail(page, width)
      await expect(panel.locator('[data-detail-kanji="日"]')).toBeVisible()
      await expect(page).toHaveURL(/k=%E6%97%A5/)

      await panel.getByRole('button', { name: /^日本/ }).first().click()
      await expect(panel.locator('[data-detail-word]')).toBeVisible()
      await expect(page).toHaveURL(/xem=w/)
      await expect(page).toHaveURL(/\/kanji\?/)

      // Nút "← 日" quay lại đúng chữ.
      await panel.locator('[data-stack-back]').click()
      await expect(panel.locator('[data-detail-kanji="日"]')).toBeVisible()
      await expect(page).not.toHaveURL(/xem=/)

      // Bấm lại từ rồi dùng Back của trình duyệt: lùi một bước, vẫn ở trang Kanji.
      await panel.getByRole('button', { name: /^日本/ }).first().click()
      await expect(panel.locator('[data-detail-word]')).toBeVisible()
      await page.goBack()
      await expect(panel.locator('[data-detail-kanji="日"]')).toBeVisible()
      await expect(page).toHaveURL(/\/kanji\?.*bai=1/)

      if (width < 1180) {
        // Back thêm lần nữa: đóng sheet, vẫn ở bài 1.
        await page.goBack()
        await expect(page.getByRole('dialog', { name: 'Chi tiết' })).toHaveCount(0)
        await expect(page).toHaveURL(/\/kanji\?level=N5&bai=1$/)
      }

      // F5 giữ đúng chữ và từ đang xem.
      if (width < 1180) await page.locator('[data-kanji-cell="日"]').click()
      await detail(page, width).getByRole('button', { name: /^日本/ }).first().click()
      await expect(detail(page, width).locator('[data-detail-word]')).toBeVisible()
      await page.reload()
      await settle(page)
      await expect(detail(page, width).locator('[data-detail-word]')).toBeVisible()
      await expect(detail(page, width).locator('[data-stack-back]')).toContainText('日')
    })

    test('Bộ thủ: bài 1 flashcard có tên và chữ thuộc bộ; quiz chọn tên', async ({ page }) => {
      await page.goto('/kanji?tab=radicals&bai=1&mode=flashcards')
      await settle(page)
      await page.locator('[role=button][aria-label*="Chạm để lật"]').first().click()
      const back = page.locator('[role=button][aria-label*="mặt sau"]')
      await expect(back).toBeVisible()
      await expect(back).toContainText('Bộ số 1')
      await expect(back).toContainText('Chữ Hán thuộc bộ này')
      await page.keyboard.press('ArrowRight')
      await expect.poll(async () => (await cards(page)).includes('rd-001')).toBe(true)

      await page.getByRole('radio', { name: 'Quiz' }).click()
      await expect(page.locator('[data-option]')).toHaveCount(4)
    })

    test('Sổ tay: lưu một từ vào sổ mới, mở sổ và học flashcard; nhấn giữ để lưu nhanh', async ({ page }) => {
      await page.goto('/vocab/n5/1')
      await settle(page)
      const first = page.locator('[data-bookmark]:visible').first()
      const ref = await first.getAttribute('data-bookmark')
      await first.click()
      const sheet = page.getByRole('dialog', { name: 'Lưu vào sổ tay' })
      await expect(sheet).toBeVisible()
      await sheet.getByRole('button', { name: /Tạo sổ tay mới/ }).click()
      await sheet.getByLabel('Tên sổ tay').fill('Thử')
      await sheet.getByRole('radio', { name: 'Xanh tùng' }).click()
      await sheet.getByRole('button', { name: 'Tạo và lưu' }).click()
      // Sổ mới được chọn sẵn.
      await expect(sheet.getByRole('checkbox').nth(1)).toBeChecked()
      await sheet.getByRole('button', { name: 'Xong' }).click()
      await expect(first).toHaveAttribute('aria-pressed', 'true')
      await expect(sheet).toHaveCount(0)

      // Nhấn giữ nút của từ thứ hai: lưu nhanh vào sổ dùng gần nhất ("Thử").
      const second = page.locator('[data-bookmark]:visible').nth(1)
      const box = (await second.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(700)
      await page.mouse.up()
      await expect(page.locator('[data-toast]')).toContainText('Đã lưu vào Thử')

      await page.goto('/notebooks')
      await settle(page)
      const book = page.locator('[data-notebook="Thử"]')
      await expect(book).toContainText('2 mục')
      await book.click()
      await settle(page)
      await expect(page.locator(`[data-notebook-item="${ref}"]`)).toBeVisible()
      await page.getByRole('link', { name: /^Bài 1,/ }).click()
      await page.getByRole('radio', { name: 'Flashcard' }).click()
      await settle(page)
      for (let i = 0; i < 2; i++) {
        // Bấm vào thẻ (lật) để focus rời nút tab, rồi chấm bằng phím →.
        await page.locator('[role=button][aria-label*="Chạm để lật"]').first().click()
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(500)
      }
      await expect(page.getByText('Xong một lượt')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  })
}

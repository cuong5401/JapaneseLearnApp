import { expect, test, type Page } from '@playwright/test'

/**
 * Mặt sau flashcard chữ Hán và kana không còn nút "Xem cách viết" / khung thứ tự nét (thứ tự nét ở panel chi tiết,
 * bảng kana, phiếu Luyện viết). Mặt sau cùng kích thước mặt trước: lật thẻ không làm đổi khung.
 */
/** Cỡ khung hai mặt theo layout (offset*, không bị transform / hiệu ứng scale của thẻ ảnh hưởng). */
async function box(page: Page, _selector: string) {
  return page.locator('.flip').first().evaluate((e) => ({ w: (e as HTMLElement).offsetWidth, h: (e as HTMLElement).offsetHeight }))
}

for (const width of [390, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('flashcard chữ Hán: mặt sau không có cách viết, khung không đổi cỡ khi lật', async ({ page }) => {
      await page.goto('/kanji?level=N5&bai=1&mode=flashcards')
      const card = page.locator('[role=button][aria-label*="Chạm để lật thẻ"]').first()
      await expect(card).toBeVisible()
      const before = await box(page, '[role=button][aria-label*="Chạm để lật thẻ"]')
      await card.click()
      const back = page.locator('[role=button][aria-label*="mặt sau"]')
      await expect(back).toBeVisible()
      // Nội dung mặt thẻ nằm cạnh nút lật (không lồng nút trong nút): đọc từ khung thẻ trên cùng.
      const face = page.locator('[data-flashcard-top]')
      await expect(face).not.toContainText('cách viết')
      await expect(face.locator('[data-stroke-toggle], svg[aria-label*="thứ tự nét"]')).toHaveCount(0)
      await expect.poll(() => box(page, '[role=button][aria-label*="mặt sau"]')).toEqual(before)
    })

    test('flashcard kana: mặt sau không có cách viết', async ({ page }) => {
      await page.addInitScript(`(() => {
        localStorage.setItem('jla:v1:kana-chart', JSON.stringify({ script: 'hiragana', rows: ['h-basic-a'] }));
        localStorage.setItem('jla:v1:kana-practice', JSON.stringify({ mode: 'flashcard', count: 'each' }));
      })()`)
      await page.goto('/kana')
      await page.getByRole('button', { name: 'Luyện 5 chữ đã chọn' }).click()
      await page.getByRole('button', { name: 'Bắt đầu' }).click()
      await expect(page.locator('[data-kana-front="h-a"]')).toBeVisible()
      const before = await box(page, '[role=button][aria-label*="Chạm để lật thẻ"]')
      await page.keyboard.press(' ')
      const back = page.locator('[data-kana-back="h-a"]')
      await expect(back).toBeVisible()
      await expect(back).not.toContainText('cách viết')
      await expect(page.locator('[data-stroke-toggle]')).toHaveCount(0)
      await expect.poll(() => box(page, '[role=button][aria-label*="mặt sau"]')).toEqual(before)
    })
  })
}

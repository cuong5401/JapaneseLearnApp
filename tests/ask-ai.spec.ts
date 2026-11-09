import { expect, test, type Page } from '@playwright/test'

/**
 * "Hỏi AI" với nhà cung cấp giả (mock, chỉ có ở bản dev): không gọi mạng, không dùng key thật.
 * Mock trả lời dần ~12 mẩu, có furigana và khối từ vựng; "#429" giả lỗi hết hạn mức.
 */
const WIDTHS = [390, 1280]

const useMock = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('jla:v1:ai-settings', JSON.stringify({ provider: 'mock' }))
  })

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

async function ask(page: Page, text: string) {
  const input = page.locator('[data-ai-input]')
  await input.fill(text)
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('Gửi câu hỏi → trả lời hiện dần (furigana, Markdown) → lưu từ vào sổ tay', async ({ page }) => {
      await useMock(page)
      await page.goto('/ai')
      // Điện thoại: Hỏi AI không còn trên thanh đáy (đã có khung chat nổi); trang /ai không hiện khung nổi.
      if (width < 768) await expect(page.locator('[data-bottom-nav]').getByRole('link', { name: /Hỏi AI/ })).toHaveCount(0)
      await expect(page.locator('[data-ai-dock]')).toHaveCount(0)
      await ask(page, '日本語')

      // Tra từ: dữ liệu sẵn có hiện ngay.
      await expect(page.locator('[data-local-hits]')).toContainText('日本語')
      // Đang hiện dần rồi xong.
      const streaming = page.locator('[data-msg="assistant"][data-streaming="true"]')
      await expect(streaming).toBeVisible()
      await expect(streaming).toContainText('nghĩa là')
      await expect(page.getByRole('button', { name: 'Dừng' })).toBeVisible()
      await expect(streaming).toHaveCount(0, { timeout: 10_000 })
      const answer = page.locator('[data-msg="assistant"]').last()
      await expect(answer).toContainText('Tôi đang học tiếng Nhật')
      await expect(answer.locator('ruby').first()).toBeVisible()
      await expect(answer.locator('rt').first()).toHaveText('にほんご')
      // Khối JSON không hiện ra, thay bằng thẻ từ.
      await expect(answer).not.toContainText('kotonoha-words')
      const card = page.locator('[data-ai-word="勉強"]')
      await expect(card).toBeVisible()

      await card.locator('[data-bookmark]').click()
      const sheet = page.getByRole('dialog', { name: 'Lưu vào sổ tay' })
      await sheet.getByRole('checkbox').first().check()
      await sheet.getByRole('button', { name: 'Xong' }).click()
      await expect(card.locator('[data-bookmark]')).toHaveAttribute('aria-pressed', 'true')
      expect(await noOverflow(page)).toBe(true)

      await page.goto('/notebooks/default')
      await expect(page.locator('[data-notebook-item]').filter({ hasText: '勉強' })).toBeVisible()

      // Lịch sử còn sau khi tải lại.
      await page.goto('/ai')
      if (width < 1024) await page.getByRole('button', { name: /^Lịch sử/ }).click()
      await expect(page.locator('[data-chat]').first()).toContainText('日本語')
    })

    test('Nút Dừng; lỗi 429 báo hết lượt và Thử lại', async ({ page }) => {
      await useMock(page)
      await page.goto('/ai')
      await ask(page, 'câu dài')
      await expect(page.locator('[data-streaming="true"]')).toContainText('nghĩa là')
      await page.getByRole('button', { name: 'Dừng' }).click()
      await expect(page.locator('[data-msg="assistant"]').last()).toContainText('Đã dừng.')

      await ask(page, 'thử #429')
      await expect(page.getByRole('alert').last()).toContainText('Đã hết lượt miễn phí, thử lại sau ít phút')
      await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible()
    })

    test('Chưa có key: hướng dẫn thiết lập; Cài đặt lưu / xóa key (không dùng key thật)', async ({ page }) => {
      await page.goto('/ai')
      await expect(page.locator('[data-ai-setup]')).toBeVisible()
      await page.getByRole('link', { name: 'Mở Cài đặt AI' }).click()
      await expect(page).toHaveURL(/\/settings/)
      const keyInput = page.locator('#ai-key')
      await expect(keyInput).toHaveAttribute('type', 'password')
      await keyInput.fill('test-key')
      await page.getByRole('button', { name: 'Hiện' }).click()
      await expect(keyInput).toHaveAttribute('type', 'text')
      await page.getByRole('button', { name: 'Lưu key' }).click()
      await expect(page.locator('[data-ai-key-state]')).toHaveText('Đã có key trên máy này.')
      // Key không vào file xuất tiến độ.
      const exported = await page.evaluate(async () => {
        const m = await import('/src/lib/backup.ts')
        return JSON.stringify(m.createBackup({}, 20))
      })
      expect(exported).not.toContain('test-key')
      await page.getByRole('button', { name: 'Xóa key' }).click()
      await expect(page.locator('[data-ai-key-state]')).toHaveText('Chưa có key.')
      expect(await noOverflow(page)).toBe(true)
    })

    test('"Hỏi AI" từ chi tiết chữ Hán mở khung chat nổi có sẵn câu hỏi và tự gửi, không rời trang', async ({ page }) => {
      await useMock(page)
      await page.goto(`/kanji?k=${encodeURIComponent('日')}`)
      await page.locator('[data-detail-kanji="日"]').first().waitFor()
      await page.locator('[data-ask-ai]').first().click()
      await expect(page.locator('[data-ai-dock]')).toHaveAttribute('data-ai-dock', 'open')
      expect(new URL(page.url()).pathname).toBe('/kanji')
      const panel = page.locator('[data-ai-panel]')
      await expect(panel.locator('[data-msg="user"]').first()).toContainText('Giải thích chữ Hán 日')
      await expect(panel.locator('[data-msg="assistant"]').last()).toContainText('tiếng Nhật', { timeout: 10_000 })
    })
  })
}

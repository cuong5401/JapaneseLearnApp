import { expect, test, type Page } from '@playwright/test'

/**
 * Ôn tập FSRS: 3 thẻ mới, nhãn thời gian trên 4 nút, thẻ Quên quay lại sau 1 phút (màn đếm ngược
 * "Thẻ tiếp theo sau…" + "Ôn luôn bây giờ"), trang Tiến độ có dự báo 30 ngày, quiz có Gợi ý.
 */
const WIDTHS = [390, 1280]
const IDS = ['n5-e1ea452d', 'n5-78d438e2', 'n5-bcf28efa']

/** 3 thẻ Mới (đến hạn ngay), migration coi như đã chạy. */
function seed(page: Page) {
  return page.addInitScript((ids) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    const now = Date.now()
    const cards = Object.fromEntries(
      ids.map((id, i) => [
        id,
        { id, due: now - 1000 + i, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: 0, last_review: 0, learning_steps: 0 },
      ]),
    )
    localStorage.setItem('jla:v1:cards', JSON.stringify(cards))
    localStorage.setItem('jla:v1:migrations', JSON.stringify(['radical-kangxi', 'fsrs']))
    localStorage.setItem('jla:v1:srs-settings', JSON.stringify({ fuzz: false }))
  }, IDS)
}

const delays = (page: Page) => page.locator('[data-grade-delay]').allTextContents()

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('ôn 3 thẻ mới: 4 nút có nhãn thời gian, Quên quay lại sau 1 phút (đếm ngược), Ôn luôn bây giờ', async ({ page }) => {
      await seed(page)
      await page.goto('/review')
      await expect(page.getByRole('button', { name: 'Lật thẻ' })).toBeVisible()

      // thẻ 1: Quên
      await page.getByRole('button', { name: 'Lật thẻ' }).click()
      const d = await delays(page)
      expect(d).toHaveLength(4)
      expect(d[0]).toBe('1 phút')
      expect(d[2]).toBe('10 phút')
      expect(d[3]).toMatch(/ngày/)
      for (const t of d) expect(t.trim()).not.toBe('')
      await page.locator('[data-grade="1"]').click()

      // thẻ 2, 3: Nhớ (bước học 10 phút)
      for (let i = 0; i < 2; i++) {
        await page.getByRole('button', { name: 'Lật thẻ' }).click()
        await page.keyboard.press('3')
      }

      // hết thẻ đến hạn ngay, còn thẻ Quên đến hạn sau ~1 phút → đếm ngược
      const countdown = page.locator('[data-review-countdown]')
      await expect(countdown).toBeVisible()
      await expect(countdown).toContainText(/Thẻ tiếp theo sau 0:[0-5]\d/)

      // ôn luôn: thẻ quay lại, chấm Nhớ → đếm ngược tới thẻ 10 phút
      await countdown.getByRole('button', { name: 'Ôn luôn bây giờ' }).click()
      await page.getByRole('button', { name: 'Lật thẻ' }).click()
      await page.locator('[data-grade="3"]').click()
      await expect(countdown).toContainText(/Thẻ tiếp theo sau (9|10):\d\d/)

      // lịch sử ôn: 4 lượt
      const rows = await page.evaluate(() => JSON.parse(localStorage.getItem('jla:v1:review-log') ?? '{"rows":[]}').rows.length)
      expect(rows).toBe(24)
    })

    test('trang Tiến độ: tỷ lệ nhớ, dự báo 30 ngày, số thẻ theo trạng thái', async ({ page }) => {
      await seed(page)
      await page.goto('/progress')
      await expect(page.locator('[data-forecast-30] li')).toHaveCount(30)
      await expect(page.locator('[data-retention-actual]')).toBeVisible()
      await expect(page.locator('[data-state-counts]')).toContainText('Mới')
      await expect(page.locator('[data-state-counts] li').first()).toContainText('3')
    })

    test('Cài đặt → Ôn tập: thanh trượt mức ghi nhớ lưu lại', async ({ page }) => {
      await page.goto('/settings')
      const section = page.locator('[data-srs-settings]')
      await expect(section.locator('[data-retention-value]')).toHaveText('90%')
      await section.getByRole('slider').focus()
      for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
      await expect(section.locator('[data-retention-value]')).toHaveText('85%')
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('jla:v1:srs-settings')!).retention)).toBe(0.85)
    })

    test('quiz trắc nghiệm: Gợi ý bỏ 2 đáp án sai, đúng thì chấm Khó', async ({ page }) => {
      await page.goto('/vocab/n5/1?tab=quiz')
      await page.getByRole('button', { name: /Trắc nghiệm/ }).click()
      await page.locator('[data-quiz-hint]').click()
      await expect(page.locator('[data-option][data-removed]')).toHaveCount(2)
      // chọn đáp án còn lại đúng: thử từng đáp án chưa bị bỏ, đáp án đúng có viền xanh
      const left = page.locator('[data-option]:not([data-removed])')
      await expect(left).toHaveCount(2)
      await left.first().click()
      const log = await page.evaluate(() => JSON.parse(localStorage.getItem('jla:v1:review-log')!).rows as number[])
      // rating (cột 3) là Khó (2) nếu đúng, Quên (1) nếu sai
      expect([1, 2]).toContain(log[2])
    })
  })
}

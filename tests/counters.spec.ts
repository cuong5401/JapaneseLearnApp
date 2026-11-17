import { expect, test, type Page } from '@playwright/test'

/**
 * Điều hướng 5 mục, trang chủ gọn, trang Học và bộ "Cách đếm" (助数詞) ở 390 và 1280px:
 *  - trang chủ desktop 1280×800 không cuộn; điện thoại 390×844 tối đa ~2 màn;
 *  - /kanji làm mục "Học" sáng; /settings làm "Cá nhân" sáng;
 *  - trang Cách đếm: chi tiết 本 (bảng 1–10 + 何, ô bất quy tắc), một câu quiz.
 */

const SIZES = [
  { name: '390', width: 390, height: 844 },
  { name: '1280', width: 1280, height: 800 },
] as const

/** Điều hướng chính đang hiện: sidebar (desktop) hoặc thanh đáy (điện thoại). */
const mainNav = (page: Page, phone: boolean) => (phone ? page.locator('[data-bottom-nav]') : page.locator('aside').getByRole('navigation', { name: 'Điều hướng chính' }))

const settle = (page: Page) => page.waitForFunction(() => !document.querySelector('[aria-label^="Đang tải"]'), null, { timeout: 15_000 })

for (const size of SIZES) {
  const phone = size.width < 768
  test.describe(`${size.name}px`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test('điều hướng đúng 5 mục, mục cha sáng theo trang con, không có Hỏi AI', async ({ page }) => {
      await page.goto('/kanji')
      const nav = mainNav(page, phone)
      await expect(nav.getByRole('link')).toHaveText([/Trang chủ/, /Học/, /Ôn tập/, /Sổ tay/, /Cá nhân/])
      await expect(nav.getByRole('link', { name: /Học$/ })).toHaveAttribute('aria-current', 'page')
      await expect(nav.getByRole('link', { name: /Hỏi AI/ })).toHaveCount(0)
      await page.goto('/settings')
      await expect(mainNav(page, phone).getByRole('link', { name: /Cá nhân/ })).toHaveAttribute('aria-current', 'page')
      await page.goto('/learn/counters')
      await expect(mainNav(page, phone).getByRole('link', { name: /Học$/ })).toHaveAttribute('aria-current', 'page')
    })

    test('trang chủ gọn: hàng 1 cùng chiều cao, chiều cao trang trong giới hạn', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('[data-random-kanji]')).toBeVisible()
      await settle(page)
      const due = (await page.locator('[data-due-card]').boundingBox())!
      const cont = (await page.locator('[data-continue-card]').boundingBox())!
      expect(Math.abs(due.height - cont.height)).toBeLessThan(1)
      expect(Math.abs(due.y - cont.y)).toBeLessThan(1)
      const h = await page.evaluate(() => document.documentElement.scrollHeight)
      // Desktop: nằm trọn một màn hình. Điện thoại: tối đa ~2 màn.
      if (phone) expect(h).toBeLessThanOrEqual(size.height * 2)
      else expect(h).toBeLessThanOrEqual(size.height)
      // Lối tắt: điện thoại cuộn ngang một hàng, desktop lưới (không cuộn ngang).
      const row = page.locator('[data-shortcuts] ul')
      const scroll = await row.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, snap: getComputedStyle(el).scrollSnapType }))
      if (phone) {
        expect(scroll.sw).toBeGreaterThan(scroll.cw)
        expect(scroll.snap).toContain('x')
      } else expect(scroll.sw).toBeLessThanOrEqual(scroll.cw)
      await expect(page.locator('[data-shortcuts] a[href="/learn/counters"]')).toHaveCount(1)
      await expect(page.locator('[data-shortcuts] a[href="/learn"]').filter({ visible: true })).toHaveCount(1)
    })

    test('trang Học: Từ vựng JLPT là 1 thẻ 5 dòng, có Cách đếm', async ({ page }) => {
      await page.goto('/learn')
      const jlpt = page.getByRole('region', { name: 'Từ vựng JLPT' })
      await expect(jlpt.locator('[data-deck-row]')).toHaveCount(5)
      await page.locator('[data-hub="/learn/counters"] a').first().click()
      await expect(page).toHaveURL(/\/learn\/counters$/)
      await expect(page.getByRole('heading', { name: 'Cách đếm', level: 1 })).toBeVisible()
    })

    test('Cách đếm: đủ 49 + 58 mục, tìm kiếm, chi tiết 本 với ô bất quy tắc', async ({ page }) => {
      await page.goto('/learn/counters')
      await settle(page)
      await expect(page.locator('[data-counter-card]')).toHaveCount(107)
      await expect(page.locator('[data-counter-more] [data-counter-card]')).toHaveCount(58)

      // Quy tắc thu gọn được.
      const rules = page.locator('[data-counter-rules] button[aria-expanded]')
      await rules.click()
      await expect(page.locator('#counter-rules-body li')).toHaveCount(6)
      await rules.click()
      await expect(page.locator('#counter-rules-body')).toHaveCount(0)

      // Tìm "đôi" ra 足.
      await page.locator('[data-counter-search]').fill('đôi')
      await expect(page.locator('[data-counter-card="soku"]')).toBeVisible()
      await page.locator('[data-counter-search]').fill('')

      await page.locator('[data-counter-card="hon"]').click()
      const detail = page.locator('[data-detail-counter="hon"]').filter({ visible: true })
      await expect(detail).toBeVisible()
      if (phone) await expect(page.getByRole('dialog', { name: 'Chi tiết trợ số từ' })).toBeVisible()
      else await expect(page.locator('[data-detail-panel] [data-detail-counter="hon"]')).toBeVisible()
      const cells = detail.locator('[data-counter-table] [data-cell]')
      await expect(cells).toHaveCount(11)
      await expect(detail.locator('[data-cell][data-irregular]')).toHaveCount(6)
      await expect(detail.locator('[data-cell="3"]')).toContainText('さんぼん')
      await expect(detail.locator('[data-cell="3"]')).toHaveAttribute('data-irregular', 'true')
      await detail.locator('[data-cell="3"] button[aria-pressed]').click()
      await expect(detail.locator('[data-cell-reason]')).toContainText('ほ → ぼ sau 3')
      await expect(detail.locator('[data-counter-example]').first()).toContainText('ペンを一本')
      await expect(detail.getByRole('button', { name: /Lưu trợ số từ 本 vào sổ tay/ })).toBeVisible()
    })

    test('一日: ついたち (ngày mùng 1) ở 日, いちにち (1 ngày) ở 日間', async ({ page }) => {
      await page.goto('/learn/counters?xem=c:hi')
      const day = page.locator('[data-detail-counter="hi"]').filter({ visible: true })
      await expect(day.locator('[data-cell="1"]')).toContainText('ついたち')
      await page.goto('/learn/counters?xem=c:nichikan')
      const days = page.locator('[data-detail-counter="nichikan"]').filter({ visible: true })
      await expect(days.locator('[data-cell="1"]')).toContainText('いちにち')
    })

    test('quiz chọn cách đọc: 1 câu, đáp án không trùng, chấm và hiện lý do', async ({ page }) => {
      await page.goto('/learn/counters?mode=quiz&ct=hiki')
      await page.getByRole('radio', { name: 'Chọn cách đọc' }).click()
      const q = page.locator('[data-quiz-kind="reading"]')
      await expect(q).toBeVisible()
      await expect(q.locator('[data-number-counter]')).toContainText('匹')
      const options = await q.locator('[data-option]').evaluateAll((els) => els.map((e) => e.getAttribute('data-option')))
      expect(options.length).toBeGreaterThanOrEqual(3)
      expect(new Set(options).size).toBe(options.length)
      await q.locator('[data-option]').first().click()
      await expect(q.locator('[data-correct]')).toHaveCount(1)
      await expect(page.locator('[data-quiz-feedback]')).toContainText(/Chính xác|Chưa đúng/)
      await expect(page.locator('[data-quiz-reason]')).toBeVisible()
    })

    test('quiz chọn trợ số từ cho câu', async ({ page }) => {
      await page.goto('/learn/counters?mode=quiz&ct=hon')
      await page.getByRole('radio', { name: 'Chọn trợ số từ' }).click()
      const q = page.locator('[data-quiz-kind="choose"]')
      await expect(q.locator('[data-blank-sentence]')).toContainText('＿＿')
      await q.locator('[data-option="本"]').click()
      await expect(page.locator('[data-quiz-feedback]')).toContainText('Chính xác')
    })
  })
}

test('flashcard Cách đếm: mặt trước 3 + 本 dạng, lật ra cách đọc và lý do; chấm ô bất quy tắc vào lịch ôn', async ({ page }) => {
  await page.goto('/learn/counters?mode=flashcards&ct=hon')
  const front = page.locator('[data-pair-front]').first()
  await expect(front).toBeVisible()
  const id = (await front.getAttribute('data-pair-front'))!
  await page.keyboard.press('Space')
  await expect(page.locator(`[data-pair-back="${id.replace(/^ct-/, '')}"] [data-pair-reason]`)).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  // "Chưa nhớ" luôn vào lịch ôn.
  await expect.poll(() => page.evaluate((cid) => Boolean(JSON.parse(localStorage.getItem('jla:v1:cards') ?? '{}')[cid]), id)).toBe(true)
})

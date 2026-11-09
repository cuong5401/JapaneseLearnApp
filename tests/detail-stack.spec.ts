import { expect, test, type Page } from '@playwright/test'

/**
 * Quy tắc ngăn xếp panel chi tiết:
 *  - bấm mục ở danh sách chính (lưới bộ thủ / chữ Hán) = THAY ngăn xếp bằng đúng mục đó,
 *  - bấm chữ/từ bên trong panel = đẩy thêm, tối đa 8 khung (URL cũng tối đa 8), nút ‹ lùi đúng.
 */
test.use({ viewport: { width: 1280, height: 900 } })

const frameCount = (page: Page) => {
  const u = new URL(page.url())
  return (u.searchParams.get('xem')?.split('~').filter(Boolean).length ?? 0) + (u.searchParams.get('k') ? 1 : 0)
}

async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector('[aria-label^="Đang tải"]'), null, { timeout: 15_000 })
}

test('bấm 30 bộ thủ trong danh sách: URL chỉ có 1 khung, Back không đi qua 30 mục', async ({ page }) => {
  await page.goto('/kanji?tab=radicals')
  await settle(page)
  // ô tìm kiếm "1" cho ra danh sách nhiều bộ cùng lúc; dùng lọc rỗng → lưới bài: mở bài 1..
  await page.getByPlaceholder('Tìm bộ theo tên, nghĩa hoặc số').fill('n')
  const cards = page.locator('[data-radical-card] button[aria-label^="Bộ "]')
  await expect(cards.nth(29)).toBeVisible()
  const historyStart = await page.evaluate(() => history.length)
  for (let i = 0; i < 30; i++) {
    await cards.nth(i).click()
    await expect(page.locator('[data-detail-radical]')).toBeVisible()
    expect(frameCount(page)).toBe(1)
  }
  // Mở lần đầu đẩy 1 mục (desktop: replace), các lần sau đều replace.
  expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(historyStart + 1)
})

test('bấm 12 lần trong panel: tối đa 8 khung, ‹ lùi đúng khung trước', async ({ page }) => {
  await page.goto('/kanji?k=日')
  await settle(page)
  const panel = page.getByRole('complementary', { name: 'Chi tiết chữ Hán' })
  await expect(panel.locator('[data-detail-kanji="日"]')).toBeVisible()
  await page.waitForTimeout(400)
  const seen: string[] = []
  for (let i = 0; i < 12; i++) {
    // xen kẽ: chữ → từ đầu tiên chứa chữ; từ → chữ Hán đầu tiên trong từ (khác chữ vừa xem nếu có)
    const kanjiView = panel.locator('[data-detail-kanji]')
    if (await kanjiView.count()) {
      await panel.locator('[data-kanji-words] button').first().click()
    } else {
      const chars = panel.getByRole('button', { name: /^Chữ / })
      const n = await chars.count()
      await chars.nth(n > 1 ? 1 : 0).click()
    }
    await settle(page)
    // chờ hiệu ứng chuyển khung trong panel xong (khung cũ còn trong DOM khi đang thoát)
    await page.waitForTimeout(400)
    seen.push(new URL(page.url()).searchParams.get('xem') ?? '')
    expect(frameCount(page)).toBeLessThanOrEqual(8)
  }
  expect(frameCount(page)).toBe(8)
  // ‹ lùi đúng về khung trước (URL trước đó)
  const before = seen[seen.length - 2]
  await panel.locator('[data-stack-back]').click()
  await expect.poll(() => new URL(page.url()).searchParams.get('xem') ?? '').toBe(before)
})

import { expect, test, type Page } from '@playwright/test'

/**
 * Thẻ "Chữ Hán ngẫu nhiên" trên trang chủ: chọn chữ mới mỗi lần vào trang, không trùng 5 chữ gần nhất,
 * có từ đi kèm, bấm từ mở chi tiết tại chỗ. API Mazii luôn được giả lập để test không phụ thuộc mạng.
 */
const MAZII = 'https://mazii.net/api/search'

/** Mazii giả: trả 6 từ chứa đúng chữ được hỏi. */
async function fakeMazii(page: Page) {
  await page.route(MAZII, async (route) => {
    const { query } = route.request().postDataJSON() as { query: string }
    const data = Array.from({ length: 6 }, (_, i) => ({ word: `${query}${'あいうえおか'[i]}`, phonetic: `よみ${i}`, short_mean: `nghĩa ${i}`, level: null }))
    await route.fulfill({ json: { status: 200, found: true, data } })
  })
}

const card = (page: Page) => page.locator('[data-random-kanji]')
const currentKanji = async (page: Page) => (await card(page).getAttribute('data-random-kanji')) ?? ''

test('tiêu đề "Chữ Hán ngẫu nhiên", 6 lần vào trang liên tiếp không lặp chữ, luôn có 3–5 từ', async ({ page }) => {
  await fakeMazii(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Chữ Hán ngẫu nhiên' })).toBeVisible()
  const seen: string[] = []
  for (let i = 0; i < 6; i++) {
    if (i) await page.reload()
    await expect(card(page)).toBeVisible()
    const ch = await currentKanji(page)
    expect(seen.slice(-5)).not.toContain(ch)
    seen.push(ch)
    const words = card(page).locator('[data-kanji-word]')
    await expect(words.first()).toBeVisible()
    await expect(page.getByRole('status', { name: 'Đang tải từ đi kèm' })).toHaveCount(0)
    const n = await words.count()
    expect(n).toBeGreaterThanOrEqual(3)
    expect(n).toBeLessThanOrEqual(5)
  }
  const recent = await page.evaluate(() => JSON.parse(sessionStorage.getItem('jla:random-kanji:recent') ?? '[]') as string[])
  expect(recent).toHaveLength(5)
})

test('mất mạng: chỉ hiện từ có sẵn, không gọi được API vẫn không lỗi', async ({ page }) => {
  await page.route(MAZII, (route) => route.abort('internetdisconnected'))
  await page.goto('/')
  await expect(card(page)).toBeVisible()
  await expect(page.getByRole('status', { name: 'Đang tải từ đi kèm' })).toHaveCount(0)
  // Từ local có id dạng n5-…, cp-…; không có từ online (aw-…).
  const ids = await card(page).locator('[data-kanji-word]').evaluateAll((els) => els.map((e) => e.getAttribute('data-kanji-word')))
  expect(ids.length).toBeGreaterThanOrEqual(1)
  expect(ids.every((id) => !id?.startsWith('aw-'))).toBe(true)
})

test('nút "Chữ khác" đổi chữ; bấm từ mở chi tiết mà không rời trang chủ', async ({ page }) => {
  await fakeMazii(page)
  await page.goto('/')
  await expect(card(page)).toBeVisible()
  const first = await currentKanji(page)
  await page.getByRole('button', { name: 'Chữ khác' }).click()
  await expect.poll(() => currentKanji(page)).not.toBe(first)

  const word = card(page).locator('[data-kanji-word] button').first()
  await word.click()
  await expect(page).toHaveURL(/\/\?xem=w%3A|\/\?xem=w:/)
  expect(new URL(page.url()).pathname).toBe('/')
  await expect(page.getByRole('dialog', { name: 'Chi tiết' })).toBeVisible()
  await expect(page.locator('[data-detail-word]')).toBeVisible()
})

test('từ tra online mở được chi tiết và lưu sổ tay giữ lại sau phiên', async ({ page }) => {
  await fakeMazii(page)
  await page.goto('/')
  // Bấm "Chữ khác" tới khi gặp chữ có từ online (chữ ít hơn 5 từ trong dữ liệu).
  const online = card(page).locator('[data-kanji-word^="aw-"] button')
  const settle = async () => {
    await expect(card(page)).toHaveCount(1) // hiệu ứng chuyển chữ đã xong
    await expect(page.getByRole('status', { name: 'Đang tải từ đi kèm' })).toHaveCount(0)
  }
  await settle()
  for (let i = 0; i < 40 && !(await online.count()); i++) {
    const before = await currentKanji(page)
    await page.getByRole('button', { name: 'Chữ khác' }).click()
    await expect.poll(() => currentKanji(page)).not.toBe(before)
    await settle()
  }
  await expect(online.first()).toBeVisible()
  await online.first().click()
  const detail = page.locator('[data-detail-word^="aw-"]')
  await expect(detail).toBeVisible()
  const id = await detail.getAttribute('data-detail-word')
  await detail.getByRole('button', { name: /Lưu .* vào sổ tay/ }).dispatchEvent('pointerdown')
  const saved = await page.evaluate((wid) => Boolean(JSON.parse(localStorage.getItem('jla:v1:ai-words') ?? '{}')[wid!]), id)
  expect(saved).toBe(true)
})

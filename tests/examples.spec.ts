import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Câu ví dụ (Tatoeba, mock bằng page.route) trong chi tiết từ vựng: 2–3 câu, tô đậm từ, nguồn Tatoeba,
 * cache IndexedDB (mở lại không gọi mạng), "Ví dụ khác", lưu câu vào sổ tay, fallback AI / "Chưa tìm thấy", không CLS.
 */
const WORD = '/word/n2-f05d7729' // 遺伝

const s = (id: number, text: string, tr: { vie?: string; eng?: string }, audio = false) => ({
  id,
  text,
  lang: 'jpn',
  license: 'CC BY 2.0 FR',
  owner: 'tester',
  is_unapproved: false,
  translations: [...(tr.vie ? [{ id: id * 10, text: tr.vie, lang: 'vie' }] : []), ...(tr.eng ? [{ id: id * 10 + 1, text: tr.eng, lang: 'eng' }] : [])],
  ...(audio ? { audios: [{ id: 500 + id, author: 'yomi' }] } : {}),
})

const PAGE1 = [
  s(1, 'この犯罪者は遺伝の犠牲者だ。', { eng: 'This criminal is a victim of his heredity.' }, true),
  s(2, '彼の才能は遺伝だと思う。', { vie: 'Tôi nghĩ tài năng của anh ấy là do di truyền.' }),
  s(3, 'この病気は遺伝しません。', { vie: 'Bệnh này không di truyền.' }),
  s(4, '彼の才能は遺伝だと思う!', { vie: 'Trùng gần giống câu 2.' }),
  s(5, '目の色は遺伝で決まる。', { vie: 'Màu mắt do di truyền quyết định.' }),
  s(6, '遺伝子の研究は面白い。', { vie: 'Nghiên cứu gen rất thú vị.' }),
]

/** Mock Tatoeba: đếm số request; có thể trả lỗi hoặc chậm. */
async function mockTatoeba(page: Page, opts: { fail?: boolean; delay?: number } = {}) {
  const calls: string[] = []
  await page.route('https://api.tatoeba.org/**', async (route: Route) => {
    calls.push(route.request().url())
    if (opts.delay) await new Promise((r) => setTimeout(r, opts.delay))
    if (opts.fail) return route.fulfill({ status: 500, json: { message: 'error' } })
    return route.fulfill({ json: { data: PAGE1, paging: { total: PAGE1.length, has_next: false, next: null } } })
  })
  return calls
}

const block = (page: Page) => page.locator('[data-examples]').first()

test.describe('1280px', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('遺伝: 3 ví dụ, tô đậm từ, câu có tiếng Việt trước, nguồn Tatoeba; mở lại dùng cache', async ({ page }) => {
    const calls = await mockTatoeba(page)
    await page.goto(WORD)
    await expect(block(page)).toHaveAttribute('data-examples-status', 'ready')
    const items = block(page).locator('[data-example]')
    await expect(items).toHaveCount(3)
    // từ được tô đậm (mark màu --beni) trong mọi câu
    for (let i = 0; i < 3; i++) await expect(items.nth(i).locator('mark')).toHaveText(/遺伝/)
    expect(await items.first().locator('mark').evaluate((el) => getComputedStyle(el).color)).not.toBe('')
    // ưu tiên câu có dịch tiếng Việt; câu gần giống (số 4) bị bỏ
    await expect(items.first().locator('[data-example-vi]')).toBeVisible()
    await expect(block(page).locator('[data-example="t:4"]')).toHaveCount(0)
    await expect(items.first().locator('[data-example-source]')).toHaveAttribute('href', /tatoeba\.org\/vi\/sentences\/show\/\d+/)
    const before = calls.length
    expect(before).toBeGreaterThan(0)

    // Mở lại (trang khác rồi quay về): lấy từ cache IndexedDB, không gọi mạng.
    await page.goto('/kanji')
    await page.goto(WORD)
    await expect(block(page).locator('[data-example]')).toHaveCount(3)
    expect(calls.length).toBe(before)
  })

  test('"Ví dụ khác" đổi sang bộ câu tiếp theo; câu chỉ có tiếng Anh có nhãn EN', async ({ page }) => {
    await mockTatoeba(page)
    await page.goto(WORD)
    const items = block(page).locator('[data-example]')
    await expect(items).toHaveCount(3)
    const first = await items.evaluateAll((els) => els.map((e) => e.getAttribute('data-example')))
    await block(page).getByRole('button', { name: 'Ví dụ khác' }).click()
    await expect.poll(() => items.evaluateAll((els) => els.map((e) => e.getAttribute('data-example')))).not.toEqual(first)
    await expect(block(page).locator('[data-example-en]').first()).toContainText('EN')
  })

  test('lưu câu vào sổ tay (gắn với từ) và thấy ở trang Sổ tay', async ({ page }) => {
    await mockTatoeba(page)
    await page.goto(WORD)
    await block(page).locator('[data-example]').first().getByRole('button', { name: 'Lưu câu vào sổ tay' }).click()
    await expect(page.getByText(/Đã lưu câu vào/)).toBeVisible()
    await page.goto('/notebooks/default')
    await expect(page.locator('[data-notebook-item="n2-f05d7729"] [data-saved-examples]')).toContainText('遺伝')
  })

  test('Tatoeba lỗi + có AI (mock): 3 câu "AI tạo"; không có key: "Chưa tìm thấy ví dụ"', async ({ page }) => {
    await mockTatoeba(page, { fail: true })
    await page.addInitScript(() => localStorage.setItem('jla:v1:ai-settings', JSON.stringify({ provider: 'mock' })))
    await page.goto(WORD)
    await expect(block(page).locator('[data-example-ai]')).toHaveCount(3, { timeout: 10_000 })
  })

  test('Tatoeba lỗi, chưa có key AI: "Chưa tìm thấy ví dụ"', async ({ page }) => {
    await mockTatoeba(page, { fail: true })
    await page.goto(WORD)
    await expect(block(page)).toHaveAttribute('data-examples-status', 'empty')
    await expect(block(page)).toContainText('Chưa tìm thấy ví dụ')
  })

  test('panel chi tiết trên trang Chữ Hán cũng có ví dụ; dữ liệu về không làm nhảy bố cục (CLS < 0.02)', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number }
      w.__cls = 0
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await mockTatoeba(page, { delay: 1200 })
    await page.goto('/kanji?xem=w:n2-f05d7729')
    const panel = page.locator('[data-detail-panel]')
    await expect(panel.locator('[data-examples]')).toHaveAttribute('data-examples-status', 'loading')
    const h0 = (await panel.locator('[data-examples]').boundingBox())!.height
    await page.evaluate(() => ((window as unknown as { __cls: number }).__cls = 0))
    await expect(panel.locator('[data-examples] [data-example]')).toHaveCount(3, { timeout: 10_000 })
    const h1 = (await panel.locator('[data-examples]').boundingBox())!.height
    expect(Math.abs(h1 - h0)).toBeLessThan(2)
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.02)
  })
})

test.describe('390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('điện thoại: sheet chi tiết từ có ví dụ, không tràn ngang', async ({ page }) => {
    await mockTatoeba(page)
    await page.goto('/kanji?xem=w:n2-f05d7729')
    const sheet = page.getByRole('dialog', { name: 'Chi tiết' })
    await expect(sheet.locator('[data-example]')).toHaveCount(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

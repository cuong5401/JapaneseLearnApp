import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Cấu trúc giao diện:
 *  - nút "‹ …" theo cây cha – con (src/lib/routeTree.ts), mục điều hướng sáng theo cùng cây;
 *  - trang Học: tiêu đề nhóm không bấm được, mục con là cả dòng có ›; Cách đếm trong "Bộ từ khác";
 *  - trang chủ: không có lối tắt, chữ Hán ngẫu nhiên 5 từ, khối giữ chiều cao khi đổi chữ;
 *  - phiếu luyện viết cho Bộ thủ; Hỏi AI: thẻ chọn chế độ (Hỗn hợp mặc định), nút cuộc mới, chế độ theo cuộc.
 * UI_SHOTS=<thư mục>: chụp các màn đã sửa ở 390 / 1280px, tiếng Việt và 日本語.
 */

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForFunction(() => !document.querySelector('main [role="status"][aria-busy="true"]'), null, { timeout: 15_000 })
  await page.waitForTimeout(300)
}

const BACK: [string, string, string][] = [
  ['/kanji', 'Học', '/learn'],
  ['/kanji?tab=radicals', 'Học', '/learn'],
  ['/grammar/n5', 'Học', '/learn'],
  ['/grammar/n5/gn5-604df51c', 'Ngữ pháp N5', '/grammar/n5'],
  ['/kana', 'Học', '/learn'],
  ['/learn/counters', 'Học', '/learn'],
  ['/vocab/n5', 'Học', '/learn'],
  ['/vocab/compounds', 'Học', '/learn'],
  ['/vocab/n5/3', 'N5 Nhập môn', '/vocab/n5'],
  ['/terms/it', 'Học', '/learn'],
  ['/terms/it/quiz', 'Công nghệ thông tin', '/terms/it'],
  ['/writing', 'Học', '/learn'],
  ['/progress', 'Cá nhân', '/me'],
  ['/settings', 'Cá nhân', '/me'],
  ['/ai', 'Cá nhân', '/me'],
]

test('nút quay lại theo đúng cha trực tiếp; mục điều hướng sáng theo cây', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const [path, label, to] of BACK) {
    await page.goto(path)
    const back = page.locator('main [data-back-link]').first()
    await expect(back, path).toHaveText(label)
    await expect(back, path).toHaveAttribute('href', to)
    const section = to === '/me' ? 'Cá nhân' : 'Học'
    await expect(page.locator('aside').getByRole('link', { name: new RegExp(`${section}$`) }), path).toHaveAttribute('aria-current', 'page')
  }
  // Bấm thật: bài 3 → danh sách bài N5.
  await page.goto('/vocab/n5/3')
  await page.locator('main [data-back-link]').click()
  await expect(page).toHaveURL(/\/vocab\/n5$/)
})

test('trang Học: tiêu đề nhóm không bấm được, mục con là cả dòng có ›, vùng chạm ≥ 48px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/learn')
  await settle(page)
  const groups = page.locator('[data-learn-group]')
  await expect(groups).toHaveCount(7)
  for (const g of await groups.all()) {
    const h = g.locator('h2')
    // Tiêu đề: không phải link, không có ô glyph, con trỏ thường.
    await expect(h.locator('a, [data-grid-cell], button')).toHaveCount(0)
    expect(await h.evaluate((el) => getComputedStyle(el).cursor)).not.toBe('pointer')
    expect(await h.evaluate((el) => el.closest('a'))).toBeNull()
  }
  const rows = page.locator('a[data-learn-row]')
  expect(await rows.count()).toBeGreaterThanOrEqual(18)
  for (const r of await rows.all()) {
    const box = (await r.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(48)
    await expect(r.locator('svg path[d="m9 18 6-6-6-6"]')).toHaveCount(1)
  }
  await expect(page.getByRole('region', { name: 'Bộ từ khác' }).locator('a[data-learn-row="/learn/counters"]')).toHaveCount(1)
})

test('trang chủ: không có lối tắt; chữ Hán ngẫu nhiên 5 từ, đổi chữ không đổi chiều cao khối', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await settle(page)
  await expect(page.locator('[data-shortcuts]')).toHaveCount(0)
  const card = page.locator('section[aria-labelledby="random-kanji"]')
  await expect(page.locator('[data-kanji-words] > li')).toHaveCount(5)
  const h0 = (await card.boundingBox())!.height
  for (let i = 0; i < 4; i++) {
    await page.locator('[data-next-kanji]').click()
    await page.waitForTimeout(700)
    await expect(page.locator('[data-kanji-words] > li')).toHaveCount(5)
    expect(Math.abs((await card.boundingBox())!.height - h0)).toBeLessThan(2)
  }
  // Nghĩa dài cắt một dòng.
  const meaning = page.locator('[data-kanji-word] button span.truncate').last()
  expect(await meaning.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('nowrap')
})

test('phiếu luyện viết Bộ thủ: nút ở tab Bộ thủ, nguồn theo bài / theo số bộ, tiêu đề "Bộ 1 · NHẤT"', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/kanji?tab=radicals&bai=1')
  await settle(page)
  await page.getByRole('link', { name: 'Tạo phiếu luyện viết' }).click()
  await expect(page).toHaveURL(/\/writing\?src=radical&bai=1/)
  await settle(page)
  const sheet = page.locator('[data-sheet-page]')
  await expect(sheet).toContainText('Bộ 1 · NHẤT')
  await expect(sheet).toContainText('Bộ thủ · Bài 1')
  await page.getByRole('radiogroup', { name: 'Cách chọn bộ thủ' }).getByRole('radio', { name: 'Theo số bộ' }).click()
  const input = page.locator('[data-writing-radical-nos]')
  await input.fill('9')
  await expect(page).toHaveURL(/so=9/)
  await expect(sheet).toContainText('Bộ 9 · NHÂN')
  await expect(sheet).toContainText('亻')
})

test('Hỏi AI: thẻ chọn chế độ (Hỗn hợp mặc định), nút cuộc mới, chế độ cố định theo cuộc, nút Hỏi AI mở cuộc mới', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__s')) return
    sessionStorage.setItem('__s', '1')
    localStorage.setItem('jla:v1:ai-settings', JSON.stringify({ provider: 'mock' }))
  })
  await page.goto('/learn')
  await page.locator('[data-ai-tab]').click()
  const panel = page.locator('[data-ai-panel]')
  await expect(panel.locator('[data-mode="mixed"]')).toHaveAttribute('aria-checked', 'true')
  await expect(panel.locator('[data-mode]')).toHaveCount(5)
  // Chọn Sửa câu rồi gõ luôn: cuộc mới với chế độ Sửa câu, nhãn cạnh tên cuộc.
  await panel.locator('[data-mode="correct"]').click()
  await panel.locator('[data-ai-input]').fill('私は学生です')
  await panel.locator('[data-ai-input]').press('Enter')
  await expect(panel.locator('[data-conversation-title] [data-mode-badge="correct"]')).toBeVisible()
  await expect(panel.locator('[data-mode-picker]')).toHaveCount(0)
  // Cuộc mới: về màn chọn, Hỗn hợp chọn sẵn.
  await panel.locator('[data-dock-new]').click()
  await expect(panel.locator('[data-mode="mixed"]')).toHaveAttribute('aria-checked', 'true')
  await panel.locator('[data-dock-collapse]').click()
  // Nút "Hỏi AI" ở chi tiết chữ: mở thẳng cuộc mới chế độ Tra từ.
  await page.goto('/kanji?k=%E6%97%A5')
  await page.locator('[data-detail-kanji="日"]').first().waitFor()
  await page.locator('[data-ask-ai]').first().click()
  await expect(panel.locator('[data-conversation-title] [data-mode-badge="lookup"]')).toBeVisible()
  await expect(panel.locator('[data-msg="user"]').last()).toContainText('Giải thích chữ Hán 日')
  // Trang /ai cũng có nút cuộc mới.
  await page.goto('/ai')
  await page.locator('[data-ai-new]').click()
  await expect(page.locator('main [data-mode="mixed"]')).toHaveAttribute('aria-checked', 'true')
})

const SHOTS: { id: string; path: string; act?: (p: Page) => Promise<unknown> }[] = [
  { id: 'home', path: '/' },
  { id: 'learn', path: '/learn' },
  { id: 'kanji', path: '/kanji' },
  { id: 'grammar-detail', path: '/grammar/n5/gn5-604df51c' },
  { id: 'writing-radical', path: '/writing?src=radical&bai=1' },
  { id: 'ai-dock-new', path: '/learn', act: (p) => p.locator('[data-ai-tab]').click() },
  { id: 'ai-page', path: '/ai' },
]

for (const locale of ['vi', 'ja'] as const)
  for (const width of [390, 1280]) {
    test(`chụp các màn đã sửa: ${locale} ${width}px, không tràn ngang`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 800 })
      await page.addInitScript(
        ({ l }) => {
          if (sessionStorage.getItem('__s')) return
          sessionStorage.setItem('__s', '1')
          localStorage.setItem('jla:v1:locale', JSON.stringify(l))
          localStorage.setItem('jla:v1:ai-settings', JSON.stringify({ provider: 'mock' }))
        },
        { l: locale },
      )
      const dir = process.env.UI_SHOTS
      if (dir) mkdirSync(dir, { recursive: true })
      for (const s of SHOTS) {
        await page.goto(s.path)
        await settle(page)
        if (s.act) {
          await s.act(page)
          await page.waitForTimeout(800)
        }
        const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }))
        expect(sw, `${s.id}: tràn ngang`).toBeLessThanOrEqual(iw)
        if (dir) await page.screenshot({ path: `${dir}/${locale}-${s.id}-${width}.png`, fullPage: !s.id.startsWith('ai-dock') })
      }
    })
  }

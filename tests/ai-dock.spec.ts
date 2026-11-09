import { expect, test, type Page } from '@playwright/test'

/**
 * Khung chat "Hỏi AI" nổi ở mọi trang (nhà cung cấp mock, không gọi mạng):
 * tab thu gọn ở lề phải, mở / thu gọn, kéo tab, giữ hội thoại khi chuyển trang,
 * không che thanh điều hướng đáy, Back / Esc thu gọn, tab thu nhỏ ở màn flashcard.
 */
const WIDTHS = [390, 1280]
const THEMES = ['light', 'dark'] as const

function seed(page: Page, theme: string, opts: { mock?: boolean } = {}) {
  return page.addInitScript(
    ([t, mock]) => {
      localStorage.setItem('jla:theme', t as string)
      if (mock) localStorage.setItem('jla:v1:ai-settings', JSON.stringify({ provider: 'mock' }))
    },
    [theme, opts.mock ?? true] as const,
  )
}

const dock = (page: Page) => page.locator('[data-ai-dock]')
const tab = (page: Page) => page.locator('[data-ai-tab]')
const panel = (page: Page) => page.locator('[data-ai-panel]')
const box = async (page: Page, sel: string) => (await page.locator(sel).boundingBox())!
const viewport = (page: Page) => page.viewportSize()!

/** Khung đã trượt hết vào trong màn hình (hết hiệu ứng). */
async function expectOpen(page: Page) {
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'open')
  await expect
    .poll(async () => {
      const b = await panel(page).boundingBox()
      return b ? Math.round(b.x + b.width) : 0
    })
    .toBeLessThanOrEqual(viewport(page).width)
  await settled(page, '[data-ai-panel]')
}

/** Chờ hiệu ứng trượt (spring) dừng hẳn: vị trí không đổi qua hai lần đo. */
async function settled(page: Page, sel: string) {
  let last = ''
  await expect
    .poll(async () => {
      const b = await page.locator(sel).boundingBox()
      const now = b ? `${b.x.toFixed(1)},${b.y.toFixed(1)}` : ''
      const same = now === last
      last = now
      return same
    }, { intervals: [100] })
    .toBe(true)
}

async function expectClosed(page: Page) {
  await expect(dock(page)).toHaveAttribute('data-ai-dock', 'closed')
  // Tab dính sát lề phải, khung nằm ngoài màn hình.
  await expect.poll(async () => Math.round((await tab(page).boundingBox())!.x + (await tab(page).boundingBox())!.width)).toBe(viewport(page).width)
  await expect.poll(async () => Math.round((await panel(page).boundingBox())!.x)).toBeGreaterThanOrEqual(viewport(page).width)
  // Khung nằm ngoài lề phải nhưng bị cắt: trang không cuộn ngang được.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function ask(page: Page, text: string) {
  await panel(page).locator('[data-ai-input]').fill(text)
  await panel(page).getByRole('button', { name: 'Gửi', exact: true }).click()
}

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    test.describe(`${width}px ${theme}`, () => {
      test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

      test('tab thu gọn ở lề phải; mở, thu gọn; khung không che thanh điều hướng đáy', async ({ page }) => {
        await seed(page, theme)
        await page.goto('/')
        await expectClosed(page)
        const t = await box(page, '[data-ai-tab]')
        expect(t.width).toBeCloseTo(28, 0)
        expect(t.height).toBeCloseTo(64, 0)

        await tab(page).click()
        await expectOpen(page)
        const p = await box(page, '[data-ai-panel]')
        if (width < 768) {
          expect(p.width).toBeCloseTo(width - 16, 0)
          const nav = await box(page, '[data-bottom-nav]')
          // Cách thanh đáy ~8px, không đè lên.
          expect(p.y + p.height).toBeLessThanOrEqual(nav.y)
          expect(nav.y - (p.y + p.height)).toBeGreaterThan(6)
          // Thanh đáy không còn mục Hỏi AI (đã có tab nổi).
          await expect(page.locator('[data-bottom-nav]').getByRole('link', { name: /Hỏi AI/ })).toHaveCount(0)
        } else {
          expect(p.width).toBeCloseTo(400, 0)
          expect(p.height).toBeCloseTo(600, 0)
          expect(width - (p.x + p.width)).toBeCloseTo(24, 0)
          expect(900 - (p.y + p.height)).toBeCloseTo(24, 0)
        }
        await expect(panel(page).getByRole('heading', { name: 'Hỏi AI' })).toBeVisible()
        await expect(panel(page).locator('[data-mode="lookup"]')).toHaveAttribute('aria-pressed', 'true')

        await panel(page).getByRole('button', { name: 'Thu gọn' }).click()
        await expectClosed(page)
        expect(new URL(page.url()).pathname).toBe('/')
        // Nhớ trạng thái sau khi tải lại.
        await tab(page).click()
        await expectOpen(page)
        await page.reload()
        await expectOpen(page)
      })

      test('kéo tab dọc lề phải, nhớ vị trí, không đè header / thanh đáy', async ({ page }) => {
        await seed(page, theme)
        await page.goto('/')
        await expectClosed(page)
        const t = await box(page, '[data-ai-tab]')
        const cx = t.x + t.width / 2
        const drag = async (toY: number) => {
          const b = await box(page, '[data-ai-tab]')
          await page.mouse.move(cx, b.y + b.height / 2)
          await page.mouse.down()
          await page.mouse.move(cx, b.y + b.height / 2 + 10, { steps: 2 })
          await page.mouse.move(cx, toY, { steps: 6 })
          await page.mouse.up()
        }
        await drag(t.y + t.height / 2 - 150)
        await expect.poll(async () => Math.round((await box(page, '[data-ai-tab]')).y)).toBeLessThan(Math.round(t.y) - 100)
        // Kéo chỉ di chuyển, không mở khung.
        await expect(dock(page)).toHaveAttribute('data-ai-dock', 'closed')

        // Kéo quá đỉnh / đáy: dừng ở mép header và thanh đáy.
        await drag(0)
        const top = await box(page, '[data-ai-tab]')
        const header = width < 1024 ? await box(page, '[data-app-header]') : { y: 0, height: 0 }
        expect(top.y).toBeGreaterThanOrEqual(header.y + header.height)
        await drag(2000)
        await page.waitForTimeout(300)
        const bottom = await box(page, '[data-ai-tab]')
        const limit = width < 768 ? (await box(page, '[data-bottom-nav]')).y : viewport(page).height
        expect(bottom.y + bottom.height).toBeLessThanOrEqual(limit)

        await page.reload()
        await expect.poll(async () => Math.round((await box(page, '[data-ai-tab]')).y)).toBe(Math.round(bottom.y))
      })

      test('đang trả lời mà thu gọn: stream chạy tiếp, xong thì có chấm đỏ trên tab', async ({ page }) => {
        await seed(page, theme)
        await page.goto('/')
        await tab(page).click()
        await expectOpen(page)
        await ask(page, '日本語')
        await expect(panel(page).locator('[data-streaming="true"]')).toBeVisible()
        await panel(page).getByRole('button', { name: 'Thu gọn' }).click()
        await expectClosed(page)
        await expect(page.locator('[data-ai-unread]')).toHaveCount(0)
        await expect(page.locator('[data-ai-unread]')).toBeVisible({ timeout: 10_000 })
        await expect(tab(page)).toHaveAccessibleName('Mở Hỏi AI (có câu trả lời mới)')

        await tab(page).click()
        await expectOpen(page)
        await expect(page.locator('[data-ai-unread]')).toHaveCount(0)
        await expect(panel(page).locator('[data-msg="user"]').first()).toContainText('日本語')
        await expect(panel(page).locator('[data-msg="assistant"]').last()).toContainText('Tôi đang học tiếng Nhật')
      })

      test('chuyển trang bằng liên kết trong app không reset cuộc trò chuyện', async ({ page }) => {
        await seed(page, theme)
        await page.goto('/')
        await tab(page).click()
        await expectOpen(page)
        await ask(page, '日本語')
        await panel(page).getByRole('button', { name: 'Thu gọn' }).click()
        await expectClosed(page)
        // Điều hướng trong app (không tải lại trang): stream vẫn chạy tiếp.
        const nav = width < 768 ? page.locator('[data-bottom-nav]') : page.getByRole('navigation', { name: 'Điều hướng chính' }).first()
        await nav.getByRole('link', { name: /Ngữ pháp/ }).click()
        await expect(page).toHaveURL(/\/grammar/)
        await expect(page.locator('[data-ai-unread]')).toBeVisible({ timeout: 10_000 })
        await tab(page).click()
        await expect(panel(page).locator('[data-msg="assistant"]').last()).toContainText('Tôi đang học tiếng Nhật')
        await expect(panel(page).locator('[data-ai-word="勉強"]')).toBeVisible()
      })

      test('Back và Esc thu gọn khung, không rời trang', async ({ page }) => {
        await seed(page, theme)
        await page.goto('/grammar/n5')
        await tab(page).click()
        await expectOpen(page)
        await page.goBack()
        await expectClosed(page)
        expect(new URL(page.url()).pathname).toBe('/grammar/n5')

        await tab(page).click()
        await expectOpen(page)
        await page.keyboard.press('Escape')
        await expectClosed(page)
        expect(new URL(page.url()).pathname).toBe('/grammar/n5')
        // Esc đã lùi đúng mục lịch sử của khung: Back tiếp theo không bị "nuốt".
        await page.goBack()
        await expect.poll(() => new URL(page.url()).pathname).not.toBe('/grammar/n5')
      })

      test('màn flashcard: tab thu nhỏ, mờ, không đè vùng vuốt thẻ; khung mở không bị đóng khi vuốt', async ({ page }) => {
        await seed(page, theme)
        await page.goto('/vocab/n5/1?tab=flashcards')
        await expect(tab(page)).toHaveAttribute('data-quiet', 'true')
        await expect.poll(async () => Math.round((await box(page, '[data-ai-tab]')).width)).toBe(16)
        expect(Number(await tab(page).evaluate((el) => getComputedStyle(el).opacity))).toBeCloseTo(0.5, 1)
        const t = await box(page, '[data-ai-tab]')
        const card = page.locator('.flip').first()
        await expect(card).toBeVisible()
        const c = (await card.boundingBox())!
        expect(c.x + c.width).toBeLessThanOrEqual(t.x)

        // Mở khung rồi vuốt thẻ bên dưới (desktop): khung vẫn mở.
        await tab(page).click()
        await expectOpen(page)
        if (width >= 768) {
          await page.mouse.move(c.x + 40, c.y + c.height / 2)
          await page.mouse.down()
          await page.mouse.move(c.x + 200, c.y + c.height / 2, { steps: 8 })
          await page.mouse.up()
          await page.waitForTimeout(400)
          await expect(dock(page)).toHaveAttribute('data-ai-dock', 'open')
        }
        // Khung mở thì tab trở lại cỡ thường (để thu gọn lại thấy rõ).
        await panel(page).getByRole('button', { name: 'Thu gọn' }).click()
        await expectClosed(page)
        await expect(tab(page)).toHaveAttribute('data-quiet', 'true')
      })

      test('đang xem chữ Hán: chip "Hỏi về 日" điền sẵn câu hỏi; nút Hỏi AI trong trang mở khung nổi', async ({ page }) => {
        await seed(page, theme)
        await page.goto(`/kanji?k=${encodeURIComponent('日')}`)
        await page.locator('[data-detail-kanji="日"]').first().waitFor()
        await tab(page).click()
        await expectOpen(page)
        const chip = panel(page).locator('[data-ai-context]')
        await expect(chip).toHaveText(/Hỏi về\s*日/)
        await chip.click()
        await expect(panel(page).locator('[data-ai-input]')).toHaveValue(/Giải thích chữ Hán 日/)
        await panel(page).getByRole('button', { name: 'Thu gọn' }).click()
        await expectClosed(page)

        await page.locator('[data-ask-ai]').first().click()
        await expectOpen(page)
        expect(new URL(page.url()).pathname).toBe('/kanji')
        await expect(panel(page).locator('[data-msg="user"]').last()).toContainText('Giải thích chữ Hán 日')
        await expect(panel(page).locator('[data-msg="assistant"]').last()).toContainText('tiếng Nhật', { timeout: 10_000 })
      })

      test('chưa có key: hướng dẫn ngắn và nút Mở Cài đặt', async ({ page }) => {
        await seed(page, theme, { mock: false })
        await page.goto('/')
        await tab(page).click()
        await expectOpen(page)
        await expect(panel(page).locator('[data-ai-setup]')).toContainText('Chưa có API key')
        await panel(page).getByRole('link', { name: 'Mở Cài đặt' }).click()
        await expect(page).toHaveURL(/\/settings/)
        await expect(dock(page)).toHaveAttribute('data-ai-dock', 'closed')
      })

      test('mở rộng toàn màn hình sang trang /ai cùng cuộc trò chuyện', async ({ page }) => {
        await seed(page, theme)
        await page.goto('/')
        await tab(page).click()
        await ask(page, '日本語')
        await expect(panel(page).locator('[data-msg="assistant"]').last()).toContainText('Tôi đang học tiếng Nhật', { timeout: 10_000 })
        await panel(page).getByRole('button', { name: 'Mở rộng toàn màn hình' }).click()
        await expect(page).toHaveURL(/\/ai\?c=/)
        await expect(dock(page)).toHaveCount(0)
        await expect(page.locator('[data-msg="user"]').first()).toContainText('日本語')
      })
    })
  }
}

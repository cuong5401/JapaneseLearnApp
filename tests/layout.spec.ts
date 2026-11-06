import { expect, test, type Page } from '@playwright/test'

/**
 * Kiểm tra bố cục ở các độ rộng dễ lỗi (đặc biệt 1024–1200px khi có sidebar):
 *  - chữ trong mọi ô GridCell nằm trọn trong khung ô, ô luôn vuông;
 *  - nhãn Hán Việt ở trang Kanji nằm trên 1 dòng, không bị cắt, không lấn sang ô bên cạnh;
 *  - không phần tử nào tràn ra ngoài chiều ngang màn hình.
 */

const WIDTHS = [390, 768, 1024, 1112, 1180, 1280, 1440]
const THEMES = ['light', 'dark'] as const
const PAGES = [
  '/',
  '/kana',
  '/vocab/n5',
  '/vocab/n5/1',
  '/vocab/n5/1?tab=flashcards',
  '/vocab/n1/153',
  '/word/n1-be312b26',
  '/kanji',
  '/kanji?tab=radicals',
  '/grammar/n4',
  '/grammar/n2/gn2-03d5e797',
  '/review',
  '/khong-co-trang-nay',
]

/** Thẻ ôn đến hạn để trang Ôn tập có ô chữ Hán. */
function seedScript(theme: string) {
  return `(() => {
    const now = Date.now();
    const card = (id) => ({ id, ease: 2.5, interval: 1, repetitions: 1, due: now - 1000, lastReviewed: now - 86400000 });
    localStorage.setItem('jla:v1:cards', JSON.stringify({ 'kj-1cb63f35': card('kj-1cb63f35'), 'n5-e1ea452d': card('n5-e1ea452d') }));
    localStorage.setItem('jla:v1:lesson-size', '20');
    localStorage.setItem('jla:theme', '${theme}');
  })()`
}

async function settle(page: Page) {
  // Dữ liệu tải từ public/data: chờ hết skeleton rồi chờ hiệu ứng chuyển trang / stagger kết thúc.
  await page.waitForFunction(() => !document.querySelector('[aria-label="Đang tải dữ liệu"], [aria-label^="Đang tải"]'), null, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(900)
}

/** Danh sách ô có chữ vượt viền hoặc không vuông. */
function gridCellProblems(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = []
    for (const cell of document.querySelectorAll<HTMLElement>('[data-gridcell]')) {
      const glyph = cell.querySelector('[data-gridcell-glyph]')
      if (!glyph) continue
      const c = cell.getBoundingClientRect()
      if (c.width === 0) continue
      // Range đo theo hộp chữ thật (ascent/descent của font), chặt hơn hộp của span.
      const range = document.createRange()
      range.selectNodeContents(glyph)
      const g = range.getBoundingClientRect()
      const tol = 0.5
      const label = `"${glyph.textContent}" ô ${Math.round(c.width)}×${Math.round(c.height)}`
      if (g.left < c.left - tol || g.right > c.right + tol || g.top < c.top - tol || g.bottom > c.bottom + tol) {
        problems.push(`${label}: chữ ${Math.round(g.width)}×${Math.round(g.height)} vượt viền`)
      }
      if (Math.abs(c.width - c.height) > 1) problems.push(`${label}: ô không vuông`)
    }
    return problems
  })
}

function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth
    const bad: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (el.closest('[aria-hidden="true"].fixed')) continue // hiệu ứng ăn mừng
      const r = el.getBoundingClientRect()
      if (r.width && (r.right > w + 1 || r.left < -1)) bad.push(`${el.tagName}.${String(el.className).slice(0, 50)}`)
    }
    return bad.slice(0, 5)
  })
}

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`${width}px ${theme}`, () => {
      test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })
      test.beforeEach(async ({ page }) => {
        await page.addInitScript(seedScript(theme))
      })

      for (const path of PAGES) {
        test(`GridCell & tràn ngang: ${path}`, async ({ page }) => {
          await page.goto(path)
          await settle(page)
          expect(await gridCellProblems(page), 'chữ trong GridCell').toEqual([])
          expect(await horizontalOverflow(page), 'tràn ngang').toEqual([])
        })
      }

      test('Kanji: nhãn Hán Việt 1 dòng, panel/bottom sheet đúng mốc', async ({ page }) => {
        await page.goto('/kanji?level=N5')
        await settle(page)

        const labels = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('main ul button > span:not([data-gridcell])')]
            .filter((s) => s.textContent?.trim())
            .map((s) => {
              const r = s.getBoundingClientRect()
              const b = s.parentElement!.getBoundingClientRect()
              return {
                text: s.textContent,
                oneLine: r.height < parseFloat(getComputedStyle(s).fontSize) * 1.8,
                clipped: s.scrollWidth > s.clientWidth + 1,
                inside: r.left >= b.left - 0.5 && r.right <= b.right + 0.5,
              }
            }),
        )
        expect(labels.length).toBeGreaterThanOrEqual(20)
        expect(labels.filter((l) => !l.oneLine || l.clipped || !l.inside)).toEqual([])

        const panel = page.getByRole('complementary', { name: 'Chi tiết chữ Hán' })
        if (width >= 1180) {
          await expect(panel).toBeVisible()
        } else {
          await expect(panel).toHaveCount(0)
          await page.locator('main ul button').nth(4).click()
          const sheet = page.getByRole('dialog')
          await expect(sheet).toBeVisible()
          await page.waitForTimeout(500)
          expect(await gridCellProblems(page), 'GridCell trong bottom sheet').toEqual([])
        }
      })
    })
  }
}

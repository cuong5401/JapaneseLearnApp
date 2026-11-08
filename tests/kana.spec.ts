import { expect, test, type Page } from '@playwright/test'

/**
 * Luyện kana: bảng chữ, phiên gõ romaji (1 câu đúng, 1 câu sai), trắc nghiệm, màn kết thúc.
 * Mỗi phiên dùng hàng あ行 (5 chữ) để chạy hết tới màn kết thúc.
 */

const ROMAJI: Record<string, string> = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o' }
const WIDTHS = [390, 1280]
const THEMES = ['light', 'dark'] as const

function seed(theme: string, mode: string) {
  return `(() => {
    localStorage.setItem('jla:theme', '${theme}');
    localStorage.setItem('jla:v1:kana-chart', JSON.stringify({ script: 'hiragana', rows: ['h-basic-a'] }));
    localStorage.setItem('jla:v1:kana-practice', JSON.stringify({ mode: '${mode}', count: 'each' }));
  })()`
}

/** Chữ của câu hỏi hiện tại (đợi hiệu ứng chuyển câu xong để chỉ còn một câu). */
async function currentKana(page: Page): Promise<string> {
  await expect(page.locator('[data-kana-question]')).toHaveCount(1)
  // Đúng thì tiến độ tăng ngay nhưng câu mới hiện sau ~650ms: chờ tới khi ô nhập trống và gõ được.
  const input = page.locator('#kana-answer')
  if (await input.count()) {
    await expect(input).toBeEditable()
    await expect(input).toHaveValue('')
  } else {
    await expect(page.locator('[data-option]').first()).toBeEnabled()
  }
  return (await page.locator('[data-kana-question] [data-gridcell-glyph]').textContent())!.trim()
}

async function startSession(page: Page) {
  await page.goto('/kana')
  await page.getByRole('button', { name: 'Luyện 5 chữ đã chọn' }).click()
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.locator('[data-kana-progress]')).toHaveText(/0 \/ 5/)
}

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`${width}px ${theme}`, () => {
      test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

      test('bảng chữ: 5 cột vừa màn, ô đủ lớn, chi tiết chữ', async ({ page }) => {
        await page.addInitScript(seed(theme, 'typing'))
        await page.goto('/kana')
        await expect(page.locator('[data-kana-mastered]')).toContainText('0/104')
        const widths = await page.locator('[data-kana-cell]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))
        expect(widths).toHaveLength(104)
        expect(Math.min(...widths)).toBeGreaterThanOrEqual(56)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        // Ô trống ở や行: hàng có đúng 3 chữ.
        await expect(page.getByRole('row').filter({ has: page.getByLabel('Chọn hàng や行') }).locator('[data-kana-cell]')).toHaveCount(3)
        // Ô chọn hàng và nút luyện đủ lớn để chạm.
        const rowHeader = await page.getByRole('rowheader').first().boundingBox()
        expect(rowHeader!.width).toBeGreaterThanOrEqual(48)
        expect((await page.getByRole('button', { name: 'Luyện 5 chữ đã chọn' }).boundingBox())!.height).toBeGreaterThanOrEqual(48)

        await page.locator('[data-kana-cell="h-shi"]').click()
        const detail = width >= 1024 ? page.getByRole('complementary', { name: 'Chi tiết chữ kana' }) : page.getByRole('dialog')
        await expect(detail).toBeVisible()
        await expect(detail.getByRole('article', { name: 'Chữ し' })).toBeVisible()
        await expect(detail.getByRole('button', { name: 'シ, shi' })).toBeVisible()

        // Đổi bảng: Katakana
        if (width < 1024) await page.keyboard.press('Escape')
        await page.getByRole('radio', { name: /Katakana/ }).click()
        await expect(page.locator('[data-kana-cell="k-a"]')).toBeVisible()
      })

      test('gõ romaji: 1 câu đúng, 1 câu sai được hỏi lại, chạy hết tới màn kết thúc', async ({ page }) => {
        await page.addInitScript(seed(theme, 'typing'))
        await startSession(page)

        // Câu 1: đúng, tự chấm và chuyển câu.
        const first = await currentKana(page)
        await page.locator('#kana-answer').fill(ROMAJI[first])
        await expect(page.locator('[data-kana-progress]')).toHaveText(/1 \/ 5/)

        // Câu 2: gõ sai đủ dài, không tự chấm; Enter mới chấm.
        const second = await currentKana(page)
        expect(second).not.toBe(first)
        await page.locator('#kana-answer').fill('zz')
        await expect(page.getByText('Đáp án:')).toHaveCount(0)
        await page.locator('#kana-answer').press('Enter')
        await expect(page.getByText('Đáp án:')).toBeVisible()
        await expect(page.locator('[data-kana-progress]')).toHaveText(/1 \/ 5/)
        await page.screenshot({ path: `test-results/kana-typing-wrong-${width}-${theme}.png` })
        await page.locator('#kana-answer').press('Enter')

        // Trả lời đúng các câu còn lại (kể cả câu hỏi lại).
        let asked = 2
        while ((await page.locator('[data-kana-result]').count()) === 0 && asked < 12) {
          const k = await currentKana(page)
          await page.locator('#kana-answer').fill(ROMAJI[k])
          asked++
          await expect(page.locator('[data-kana-progress], [data-kana-result]').first()).toBeVisible()
          await page.waitForTimeout(900)
        }
        expect(asked).toBe(6) // 5 chữ + 1 câu hỏi lại
        const result = page.locator('[data-kana-result]')
        await expect(result).toBeVisible()
        await expect(result).toContainText('4/5')
        await expect(result).toContainText('83%') // 5 đúng / 6 lần trả lời
        await expect(result.getByRole('button', { name: new RegExp(`^${second}, ${ROMAJI[second]}, sai 1 lần`) })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Luyện lại các chữ sai (1)' })).toBeVisible()
        await page.screenshot({ path: `test-results/kana-result-${width}-${theme}.png`, fullPage: true })

        // Luyện lại chữ sai: phiên 1 chữ.
        await page.getByRole('button', { name: 'Luyện lại các chữ sai (1)' }).click()
        await expect(page.locator('[data-kana-progress]')).toHaveText(/0 \/ 1/)
        expect(await currentKana(page)).toBe(second)
        await page.locator('#kana-answer').fill(ROMAJI[second])
        await expect(page.locator('[data-kana-result]')).toContainText('Hoàn hảo')

        // Về bảng: mức thuộc đã lưu (4 chữ đang học vì mới đúng 1 lần).
        await page.getByRole('button', { name: 'Về bảng chữ cái' }).click()
        await expect(page.locator(`[data-kana-cell]`).first()).toBeVisible()
        expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('jla:v1:kana')!)).length)).toBe(5)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      })

      test('trắc nghiệm: 4 lựa chọn, phím 1–4, sai hiện đáp án và nút Tiếp, hết phiên có kết quả', async ({ page }) => {
        await page.addInitScript(seed(theme, 'choice'))
        await startSession(page)

        let wrongDone = false
        for (let i = 0; i < 12 && (await page.locator('[data-kana-result]').count()) === 0; i++) {
          const k = await currentKana(page)
          const options = page.locator('[data-option]')
          await expect(options).toHaveCount(4)
          const values = await options.evaluateAll((els) => els.map((e) => e.getAttribute('data-option')))
          expect(new Set(values).size).toBe(4)
          expect(values).toContain(ROMAJI[k])
          if (!wrongDone) {
            // Câu đầu: chọn sai bằng phím số.
            const wrongIndex = values.findIndex((v) => v !== ROMAJI[k])
            await page.keyboard.press(String(wrongIndex + 1))
            await expect(page.getByText('Đáp án:')).toBeVisible()
            await expect(options.nth(wrongIndex)).toBeDisabled()
            await page.screenshot({ path: `test-results/kana-choice-wrong-${width}-${theme}.png` })
            await page.getByRole('button', { name: 'Tiếp', exact: true }).click()
            wrongDone = true
          } else {
            await page.locator(`[data-option="${ROMAJI[k]}"]`).click()
            await page.waitForTimeout(900)
          }
        }
        await expect(page.locator('[data-kana-result]')).toContainText('4/5')
      })

      test('thoát phiên sau 3 câu cần xác nhận', async ({ page }) => {
        await page.addInitScript(seed(theme, 'typing'))
        await startSession(page)
        for (let i = 0; i < 3; i++) {
          const k = await currentKana(page)
          await page.locator('#kana-answer').fill(ROMAJI[k])
          await expect(page.locator('[data-kana-progress]')).toHaveText(new RegExp(`${i + 1} / 5`))
        }
        await page.getByRole('button', { name: 'Thoát phiên luyện' }).click()
        const dialog = page.getByRole('alertdialog')
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Luyện tiếp' }).click()
        await expect(dialog).toHaveCount(0)
        await page.getByRole('button', { name: 'Thoát phiên luyện' }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Thoát' }).click()
        await expect(page.getByRole('button', { name: 'Luyện 5 chữ đã chọn' })).toBeVisible()
      })
    })
  }
}

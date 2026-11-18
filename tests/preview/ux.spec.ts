import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

/**
 * Kiểm tra UX trên bản build (base '/JapaneseLearnApp/'), desktop 1280 + Pixel 7:
 *  - không tràn ngang, không console error / lỗi JS / request lỗi trên các trang chính;
 *  - điện thoại: nút / link ≥ 44×44 (trừ tab Hỏi AI dính mép, link nằm giữa câu, "stretched link", ô chọn trong nhãn);
 *  - Back khôi phục vị trí cuộn, vào trang mới từ điều hướng thì lên đầu; trang của lưới bài nằm trên URL (?trang=);
 *  - phiên học dở: lưu sau mỗi câu, mở lại hỏi "Tiếp tục từ câu x/y?", rời trang khi đã làm ≥ 3 câu hỏi xác nhận.
 * Rà soát đầy đủ (axe, CLS, bàn phím, 4 độ rộng × sáng/tối): `node scripts/ux-audit.mjs`.
 */
const BASE = '/JapaneseLearnApp/'
const UNLOCK = (process.env.VITE_UNLOCK_CODE ?? '').trim()
const UNLOCK_HASH = UNLOCK ? createHash('sha256').update(`kotonoha-unlock:${UNLOCK}`).digest('hex') : ''
const EXTERNAL = /fonts\.googleapis|fonts\.gstatic|mazii\.net|api\.tatoeba\.org/

test.beforeEach(async ({ page }) => {
  await page.addInitScript((hash) => {
    if (hash) localStorage.setItem('jla:unlock', hash)
    localStorage.setItem('jla:v1:swipe-hint-seen', 'true')
  }, UNLOCK_HASH)
})

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForFunction(() => !document.querySelector('main [role="status"][aria-label^="Đang tải"]'), null, { timeout: 15_000 })
  await page.waitForTimeout(300)
}

const PAGES = [
  '',
  'learn',
  'learn/counters',
  'me',
  'kana',
  'vocab/n5',
  'vocab/n5/1',
  'vocab/n5/1?tab=flashcards',
  'vocab/n5/1?tab=quiz',
  'word/n5-e1ea452d',
  'kanji?bai=1',
  'kanji?tab=radicals&bai=2',
  'grammar',
  'terms/it',
  'review',
  'notebooks',
  'writing?src=kanji&level=N5&bai=1',
  'progress',
  'settings',
  'ai',
]

/** Nút / link nhỏ hơn 44×44 trên trang hiện tại (cùng quy tắc với scripts/ux-audit.mjs). */
function smallTargets() {
  const out: string[] = []
  const vis = (el: Element) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > 0.05 && !el.closest('[inert],[aria-hidden="true"],.sr-only')
  }
  for (const el of document.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"], [role="tab"]')) {
    if (!vis(el) || (el as HTMLButtonElement).disabled || el.matches('[data-ai-tab]')) continue
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && (el.closest('p, li, dd, td')?.textContent?.trim().length ?? 0) > (el.textContent?.trim().length ?? 0) + 3) continue
    const after = getComputedStyle(el, '::after')
    if (after.position === 'absolute' && after.content !== 'none') continue
    let { width, height } = el.getBoundingClientRect()
    const label = el.tagName === 'INPUT' ? el.closest('label') : null
    if (label) {
      const l = label.getBoundingClientRect()
      width = Math.max(width, l.width)
      height = Math.max(height, l.height)
    }
    if (width < 43.5 || height < 43.5) out.push(`${Math.round(width)}×${Math.round(height)} ${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}"`)
  }
  return out
}

test('các trang chính: không tràn ngang, không lỗi console / request; điện thoại không có vùng chạm nhỏ', async ({ page, isMobile }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && !EXTERNAL.test(m.text() + (m.location().url ?? '')) && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('response', (r) => r.status() >= 400 && !EXTERNAL.test(r.url()) && errors.push(`HTTP ${r.status()} ${r.url()}`))
  const problems: string[] = []
  for (const p of PAGES) {
    await page.goto(BASE + p)
    await settle(page)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    if (sw > iw) problems.push(`/${p}: tràn ngang ${sw} > ${iw}`)
    if (isMobile) for (const s of await page.evaluate(smallTargets)) problems.push(`/${p}: vùng chạm nhỏ ${s}`)
  }
  expect(problems, problems.join('\n')).toEqual([])
  expect(errors, errors.join('\n')).toEqual([])
})

test('Back khôi phục vị trí cuộn; vào trang mới thì lên đầu; trang lưới bài nằm trên URL', async ({ page }) => {
  await page.goto(`${BASE}vocab/compounds`)
  await settle(page)
  // Sang trang 2 của lưới bài: ?trang=2, Back / F5 vẫn ở trang 2.
  await page.getByRole('button', { name: /^Bài 41–/ }).click()
  await expect(page).toHaveURL(/[?&]trang=2/)
  // Cuộn xuống cuối lưới rồi mở bài cuối.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(400)
  const y = await page.evaluate(() => Math.round(window.scrollY))
  expect(y).toBeGreaterThan(100)
  await page.getByRole('link', { name: /^Bài 72,/ }).click()
  await expect(page).toHaveURL(/compounds\/72/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.goBack()
  await expect(page).toHaveURL(/compounds\?trang=2/)
  await expect(page.getByRole('button', { name: /^Bài 41–/ })).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 8000 }).toBeGreaterThanOrEqual(y - 2)
  expect(Math.abs((await page.evaluate(() => Math.round(window.scrollY))) - y)).toBeLessThanOrEqual(2)
  // F5 giữ trang 2 và vị trí cuộn.
  await page.reload()
  await settle(page)
  await expect(page.getByRole('button', { name: /^Bài 41–/ })).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 8000 }).toBeGreaterThanOrEqual(y - 2)
  // Bấm điều hướng sang trang khác: lên đầu trang.
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: /Sổ tay/ }).click()
  await expect(page).toHaveURL(/notebooks$/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

/** Trả lời câu trắc nghiệm đang hiện rồi sang câu sau. */
async function answerOne(page: Page) {
  await page.locator('[data-option]:not([disabled])').first().click()
  await page.getByRole('button', { name: /Câu tiếp theo|Xem kết quả/ }).click()
}

test('phiên quiz dở: rời trang hỏi xác nhận, mở lại "Tiếp tục từ câu 4/10?", tiếp tục đúng câu', async ({ page }) => {
  // Có một mục lịch sử trong app phía trước (danh sách bài) để thử nút Back.
  await page.goto(`${BASE}vocab/n5/1`)
  await settle(page)
  await page.getByRole('link', { name: 'Học bằng flashcard' }).click()
  await page.getByRole('radio', { name: 'Quiz' }).click()
  await expect(page).toHaveURL(/tab=quiz/)
  await page.getByRole('button', { name: /Trắc nghiệm/ }).click()
  for (let i = 0; i < 3; i++) await answerOne(page)

  // Đã làm 3 câu: bấm điều hướng → hộp xác nhận của app (không phải window.confirm), nói rõ tiến độ đã lưu.
  let nativeDialog = false
  page.on('dialog', (d) => {
    nativeDialog = true
    void d.dismiss()
  })
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: /Trang chủ/ }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Rời phiên học?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('đã được lưu')
  expect(nativeDialog).toBe(false)
  // Học tiếp: ở lại đúng trang.
  await dialog.getByRole('button', { name: 'Học tiếp' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/tab=quiz/)
  // Nút Back của trình duyệt cũng hỏi; Esc = học tiếp.
  await page.evaluate(() => history.back())
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/tab=quiz/)
  await expect(page.locator('[data-option]').first()).toBeVisible()
  // Bấm lại, lần này rời trang.
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: /Trang chủ/ }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Rời trang' }).click()
  await expect(page).toHaveURL(new RegExp(`${BASE}$`))
  await expect(page.locator('main')).toContainText('Ôn tập hôm nay')

  // Mở lại bài: hỏi tiếp tục từ câu 4/10.
  await page.goBack()
  const resume = page.locator('[data-session-resume]')
  await expect(resume).toContainText('Tiếp tục từ câu 4/10?')
  // F5 vẫn còn.
  await page.reload()
  await expect(resume).toContainText('Tiếp tục từ câu 4/10?')
  await resume.getByRole('button', { name: 'Tiếp tục' }).click()
  for (let i = 0; i < 7; i++) await answerOne(page)
  // Đúng 7 câu nữa là hết lượt 10 câu.
  await expect(page.getByRole('heading', { name: 'Kết quả' })).toBeVisible()
  await expect(page.getByText(/\/10$/).first()).toBeVisible()
  // Xong lượt: mở lại không hỏi nữa.
  await page.reload()
  await settle(page)
  await expect(resume).toHaveCount(0)
})

test('flashcard dở: F5 hỏi tiếp tục; "Làm lại" bắt đầu từ thẻ đầu', async ({ page }) => {
  await page.goto(`${BASE}vocab/n5/1?tab=flashcards`)
  await settle(page)
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Đã nhớ' }).click()
    await page.waitForTimeout(450)
  }
  await page.reload()
  const resume = page.locator('[data-session-resume]')
  await expect(resume).toContainText('Tiếp tục từ thẻ 3/20?')
  await resume.getByRole('button', { name: 'Làm lại' }).click()
  await expect(resume).toHaveCount(0)
  await expect(page.locator('[role=button][aria-label*="Chạm để lật thẻ"]').first()).toBeVisible()
  await page.reload()
  await settle(page)
  await expect(resume).toHaveCount(0)
})

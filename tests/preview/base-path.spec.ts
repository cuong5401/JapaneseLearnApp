import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

/**
 * Bản build có base '/JapaneseLearnApp/' (như GitHub Pages): khung chat AI đang mở mà chuyển trang
 * thì URL phải luôn đúng một lần /JapaneseLearnApp/ (lỗi cũ: /JapaneseLearnApp/JapaneseLearnApp/… → NotFound).
 */
const BASE = '/JapaneseLearnApp/'

/** CI build kèm mã mở khóa (secret VITE_UNLOCK_CODE): đặt sẵn mã băm như khi đã nhập đúng mã. */
const UNLOCK = (process.env.VITE_UNLOCK_CODE ?? '').trim()
const UNLOCK_HASH = UNLOCK ? createHash('sha256').update(`kotonoha-unlock:${UNLOCK}`).digest('hex') : ''

test.beforeEach(async ({ page }) => {
  await page.addInitScript((hash) => {
    if (hash) localStorage.setItem('jla:unlock', hash)
  }, UNLOCK_HASH)
})

const path = (page: Page) => new URL(page.url()).pathname

/** URL có đúng một basename, trang không phải NotFound. */
async function expectPage(page: Page, expected: string | RegExp) {
  await expect.poll(() => path(page)).toMatch(typeof expected === 'string' ? new RegExp(`^${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : expected)
  const p = path(page)
  expect(p.startsWith(BASE)).toBe(true)
  expect(p).not.toContain(`${BASE}JapaneseLearnApp`)
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang này' })).toHaveCount(0)
}

const dockState = (page: Page) => page.locator('[data-ai-dock]').getAttribute('data-ai-dock')

async function openDock(page: Page) {
  await page.locator('[data-ai-tab]').click()
  await expect(page.locator('[data-ai-dock]')).toHaveAttribute('data-ai-dock', 'open')
}

/** Điều hướng chính: sidebar (desktop) hoặc thanh đáy (điện thoại). */
const nav = (page: Page, phone: boolean) => (phone ? page.locator('[data-bottom-nav]') : page.locator('aside').getByRole('navigation', { name: 'Điều hướng chính' }))

test('khung AI mở: chuyển qua Chữ Hán, Ngữ pháp, bài từ vựng, Sổ tay → URL đúng một basename; Back thu gọn khung rồi mới lùi trang; F5 vẫn đúng', async ({ page }, info) => {
  const phone = info.project.name === 'preview-phone'
  await page.goto(BASE)
  await expectPage(page, BASE)
  await openDock(page)

  const visited: string[] = []
  // Desktop: khung giữ nguyên khi chuyển trang. Điện thoại: bấm điều hướng thì khung thu gọn trong cùng lần bấm
  // (mở lại để kiểm tra lần chuyển trang kế tiếp cũng với khung đang mở).
  const go = async (name: RegExp, expected: string | RegExp, reopen = true) => {
    await nav(page, phone).getByRole('link', { name }).click()
    await expectPage(page, expected)
    if (phone) {
      await expect(page.locator('[data-ai-dock]')).toHaveAttribute('data-ai-dock', 'closed')
      if (reopen) await openDock(page)
    } else expect(await dockState(page)).toBe('open')
    visited.push(path(page))
  }

  await go(/Chữ Hán/, `${BASE}kanji`)
  await go(/Ngữ pháp/, /^\/JapaneseLearnApp\/grammar(\/n5)?$/)
  if (phone) {
    // Điện thoại: sheet che nội dung trang, đi tới bài từ vựng qua Trang chủ → thẻ N5 khi khung đã thu gọn.
    await go(/Trang chủ/, BASE, false)
    await page.getByRole('link', { name: /Từ vựng N5|N5/ }).first().click()
    await expectPage(page, `${BASE}vocab/n5`)
    await page.getByRole('link', { name: /^Bài 1,/ }).first().click()
    await expectPage(page, `${BASE}vocab/n5/1`)
    await openDock(page)
  } else {
    await go(/Trang chủ/, BASE)
    await page.getByRole('link', { name: /N5/ }).first().click()
    await expectPage(page, `${BASE}vocab/n5`)
    await page.getByRole('link', { name: /^Bài 1,/ }).first().click()
    await expectPage(page, `${BASE}vocab/n5/1`)
  }
  expect(await dockState(page)).toBe('open')
  visited.push(path(page))
  await go(/Sổ tay/, `${BASE}notebooks`)

  // Back: thu gọn khung trước, vẫn ở Sổ tay; Back lần nữa mới về bài từ vựng.
  await page.goBack()
  await expect(page.locator('[data-ai-dock]')).toHaveAttribute('data-ai-dock', 'closed')
  await expectPage(page, `${BASE}notebooks`)
  await page.goBack()
  await expectPage(page, `${BASE}vocab/n5/1`)

  // F5 ở từng trang đã qua: vẫn đúng đường dẫn, không NotFound.
  for (const p of visited) {
    await page.goto(p)
    await page.reload()
    await expectPage(page, p)
  }
})

test('link / bookmark hỏng có basename lặp được tự sửa khi mở app', async ({ page }) => {
  await page.goto(`${BASE}JapaneseLearnApp/kanji?tab=radicals`)
  await expectPage(page, `${BASE}kanji`)
  expect(new URL(page.url()).search).toBe('?tab=radicals')
  await expect(page.getByRole('heading', { name: 'Chữ Hán', level: 1 })).toBeVisible()

  await page.goto(`${BASE}JapaneseLearnApp/JapaneseLearnApp/grammar/n5`)
  await expectPage(page, `${BASE}grammar/n5`)
})

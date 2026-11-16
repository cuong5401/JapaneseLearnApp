import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/**
 * Luyện viết trên bản build (base '/JapaneseLearnApp/'): chunk pdf / docx tải lười và font .ttf (import ?url)
 * phải có đúng đường dẫn dưới base; tải được PDF và Word.
 */
const BASE = '/JapaneseLearnApp/'
const UNLOCK = (process.env.VITE_UNLOCK_CODE ?? '').trim()
const UNLOCK_HASH = UNLOCK ? createHash('sha256').update(`kotonoha-unlock:${UNLOCK}`).digest('hex') : ''

test.beforeEach(async ({ page }) => {
  await page.addInitScript((hash) => {
    if (hash) localStorage.setItem('jla:unlock', hash)
  }, UNLOCK_HASH)
})

test('xuất phiếu N5 bài 1: PDF và Word', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
  })
  await page.goto(`${BASE}writing?src=kanji&level=N5&bai=1`)
  await expect(page.locator('[data-writing-list] > li')).toHaveCount(20)
  await expect(page.locator('[data-sheet-page] path').first()).toBeAttached()

  const [pdf] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-pdf]').click()])
  expect(pdf.suggestedFilename()).toBe('Kotonoha-luyen-viet-N5-bai1.pdf')
  expect(readFileSync(await pdf.path()).subarray(0, 5).toString()).toBe('%PDF-')

  const [docx] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-docx]').click()])
  expect(docx.suggestedFilename()).toBe('Kotonoha-luyen-viet-N5-bai1.docx')
  expect(failed).toEqual([])
})

import { createHash } from 'node:crypto'
import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'

/**
 * Console sạch trên bản build (base '/JapaneseLearnApp/'): đi qua các trang chính, fail nếu có error
 * (console.error hoặc lỗi JS chưa bắt). Warning được ghi ra để rà, không làm fail.
 */
const BASE = '/JapaneseLearnApp/'
const UNLOCK = (process.env.VITE_UNLOCK_CODE ?? '').trim()
const UNLOCK_HASH = UNLOCK ? createHash('sha256').update(`kotonoha-unlock:${UNLOCK}`).digest('hex') : ''

const PAGES = ['', 'kanji', 'kanji?bai=1', 'kanji?tab=radicals&bai=2', 'vocab/n5', 'vocab/n5/1', 'vocab/n5/1?tab=flashcards', 'grammar', 'kana', 'review', 'progress', 'notebooks', 'settings', 'ai']

/** Trình duyệt tự báo khi mạng ngoài bị chặn / offline (font Google, Mazii): không phải lỗi của app. */
const EXTERNAL = /fonts\.googleapis|fonts\.gstatic|mazii\.net/

function collect(page: Page) {
  const errors: string[] = []
  const warnings: string[] = []
  page.on('console', (m: ConsoleMessage) => {
    const where = m.location().url ?? ''
    const text = `${m.text()} (${where})`
    if (EXTERNAL.test(text)) return
    if (m.type() === 'error') errors.push(text)
    else if (m.type() === 'warning') warnings.push(text)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  return { errors, warnings }
}

test('không có console error trên các trang chính', async ({ page }, info) => {
  await page.addInitScript((hash) => {
    if (hash) localStorage.setItem('jla:unlock', hash)
  }, UNLOCK_HASH)
  const { errors, warnings } = collect(page)
  for (const p of PAGES) {
    await page.goto(BASE + p)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  }
  if (warnings.length) info.annotations.push({ type: 'console warnings', description: warnings.join('\n') })
  console.log(`[${info.project.name}] warnings:\n${warnings.join('\n') || '(không có)'}`)
  expect(errors, errors.join('\n')).toEqual([])
})

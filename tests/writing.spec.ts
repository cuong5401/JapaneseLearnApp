import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Luyện viết: chọn N5 bài 1 → xem trước → tải PDF và DOCX ở 390 và 1280px; On/Kun trong panel chi tiết chữ Hán.
 * WRITING_SHOT=<file.png>: render trang 1 của PDF vừa tải thành ảnh (pdf.js trong trình duyệt) để kiểm tra bằng mắt;
 * WRITING_OUT=<thư mục>: lưu bản PDF / DOCX vừa tải (mở bằng Word để so bố cục).
 */
const WIDTHS = [390, 1280]

function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } })

    test('N5 bài 1: xem trước, tải PDF và Word', async ({ page }, info) => {
      const errors = trackErrors(page)
      await page.goto('/writing?src=kanji&level=N5&bai=1')
      await expect(page.getByRole('heading', { name: 'Luyện viết', level: 1 })).toBeVisible()

      // Danh sách 20 chữ của bài 1, tất cả đã tích.
      const list = page.locator('[data-writing-list] > li')
      await expect(list).toHaveCount(20)
      await expect(page.locator('[data-writing-count]')).toHaveText('20/20')

      // Xem trước: trang 1/4 (5 chữ/trang), có nét KanjiVG và hàng tiêu đề.
      const sheet = page.locator('[data-sheet-page]')
      await expect(sheet).toBeVisible()
      await expect(page.locator('[data-preview-page]')).toHaveText('Trang 1/4')
      await expect(sheet.locator('path').first()).toBeAttached()
      await expect(sheet).toContainText('LUYỆN VIẾT · N5 · Bài 1')
      await expect(sheet).toContainText(/: Số 1/)

      // Lật trang
      await page.getByRole('button', { name: 'Trang sau' }).click()
      await expect(page.locator('[data-preview-page]')).toHaveText('Trang 2/4')
      await expect(sheet).toContainText(/: Số 6/)

      // Bỏ tích một chữ → còn 19 chữ, vẫn 4 trang.
      await list.first().getByRole('checkbox').uncheck()
      await expect(page.locator('[data-writing-count]')).toHaveText('19/20')
      await list.first().getByRole('checkbox').check()

      // Đổi tùy chọn → xem trước cập nhật ngay (6 chữ/trang → 4 trang vẫn, 4 chữ/trang → 5 trang).
      await page.getByRole('radiogroup', { name: 'Số chữ mỗi trang' }).getByRole('radio', { name: '4' }).click()
      await expect(page.locator('[data-preview-page]')).toHaveText(/\/5$/)
      await page.getByRole('radiogroup', { name: 'Số chữ mỗi trang' }).getByRole('radio', { name: '5' }).click()
      await expect(page.locator('[data-preview-page]')).toHaveText(/\/4$/)

      // Tải PDF
      const [pdf] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-pdf]').click()])
      expect(pdf.suggestedFilename()).toBe('Kotonoha-luyen-viet-N5-bai1.pdf')
      const pdfPath = await pdf.path()
      const bytes = readFileSync(pdfPath)
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
      await expect(page.locator('[data-export-status]')).toContainText('Đã tạo Kotonoha-luyen-viet-N5-bai1.pdf')

      // Tải Word
      const [docx] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-docx]').click()])
      expect(docx.suggestedFilename()).toBe('Kotonoha-luyen-viet-N5-bai1.docx')
      const dbytes = readFileSync(await docx.path())
      expect(dbytes.subarray(0, 2).toString()).toBe('PK')

      if (process.env.WRITING_OUT && width === 1280) {
        await pdf.saveAs(`${process.env.WRITING_OUT}/${pdf.suggestedFilename()}`)
        await docx.saveAs(`${process.env.WRITING_OUT}/${docx.suggestedFilename()}`)
      }

      // Ảnh trang 1 của PDF (tùy chọn)
      const shot = process.env.WRITING_SHOT
      if (shot && width === 1280 && info.project.name === 'desktop') {
        const dataUrl = await page.evaluate(async (b64) => {
          const pdfjs = await import(/* @vite-ignore */ '/node_modules/pdfjs-dist/build/pdf.min.mjs')
          pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
          const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
          const doc = await pdfjs.getDocument({ data }).promise
          const pg = await doc.getPage(1)
          const vp = pg.getViewport({ scale: 2 })
          const canvas = document.createElement('canvas')
          canvas.width = vp.width
          canvas.height = vp.height
          await pg.render({ canvas, viewport: vp }).promise
          return canvas.toDataURL('image/png')
        }, bytes.toString('base64'))
        writeFileSync(shot, Buffer.from(dataUrl.split(',')[1], 'base64'))
      }

      expect(errors).toEqual([])
    })
  })
}

test('nút "Tạo phiếu luyện viết" ở trang bài Chữ Hán và bảng kana; On/Kun trong panel chi tiết', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/kanji?level=N5&bai=2')
  await page.locator('[data-writing-link]').click()
  await expect(page).toHaveURL(/\/writing\?src=kanji&level=N5&bai=2/)
  await expect(page.locator('[data-writing-list] > li')).toHaveCount(20)

  await page.goto(`/kanji?k=${encodeURIComponent('一')}`)
  const panel = page.getByRole('complementary', { name: 'Chi tiết chữ Hán' })
  await expect(panel.locator('[data-reading-on]')).toHaveText('イチ、イツ')
  await expect(panel.locator('[data-reading-kun]')).toHaveText('ひと-、ひと.つ')

  await page.goto('/kana')
  await page.locator('[data-writing-link]').click()
  await expect(page).toHaveURL(/\/writing\?src=kana/)
  await expect(page.locator('[data-sheet-page]')).toContainText('Hiragana')
})

test('tự nhập: bỏ chữ trùng và ký tự không có nét', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/writing?src=custom')
  await page.locator('[data-writing-custom]').fill('日本語 日本!? ABC')
  await expect(page.locator('[data-writing-list] > li')).toHaveCount(3)
  await expect(page.getByText(/Đã bỏ 5 ký tự/)).toBeVisible()
})

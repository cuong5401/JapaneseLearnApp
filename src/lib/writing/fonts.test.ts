import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { describe, expect, it } from 'vitest'

/**
 * Font nhúng phiếu luyện viết (scripts/build-pdf-fonts.mjs). Bộ subset của @pdf-lib/fontkit chép nguyên byte glyph và
 * ghi loca dạng ngắn (offset / 2): glyph độ dài lẻ làm lệch mọi glyph sau nó → mất chữ trong PDF. Script đệm glyph
 * thành bội số 4 byte; test này chặn việc quên bước đó khi sinh lại font.
 */
const DIR = resolve(__dirname, '../../assets/fonts')
const FILES = ['noto-sans-jp-bold.ttf', 'be-vietnam-pro-regular.ttf', 'be-vietnam-pro-bold.ttf', 'klee-one-semibold.ttf']

describe('font nhúng PDF', () => {
  for (const file of FILES) {
    it(`${file}: glyph đệm bội số 4 byte`, () => {
      const font = fontkit.create(readFileSync(resolve(DIR, file))) as unknown as { loca: { offsets: number[] } }
      const offsets = font.loca.offsets
      expect(offsets.length).toBeGreaterThan(1)
      expect(offsets.filter((o) => o % 4 !== 0)).toEqual([])
    })
  }

  it('Noto Sans JP có đủ kana và chữ Hán thường gặp', () => {
    const font = fontkit.create(readFileSync(resolve(DIR, 'noto-sans-jp-bold.ttf')))
    for (const ch of 'あいうえおがぎゃゅょっアイウエオガギャュョッー、・一二三事曜') expect(font.hasGlyphForCodePoint(ch.codePointAt(0)!), ch).toBe(true)
  })
})

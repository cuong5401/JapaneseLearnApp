import fontkit from '@pdf-lib/fontkit'
import { LineCapStyle, LineJoinStyle, PDFDocument, grayscale, setLineJoin, type PDFFont, type PDFPage } from 'pdf-lib'
import type { StrokeData } from '../strokes'
import { FALLBACK_SCALE, GRAY, STROKE_WIDTH, VIEWBOX, buildScene, glyphParts, pageTitle, type FontKey, type Prim, type Sheet } from './layout'
import { LEADER_WIDTH, numberLabels, numberSize } from './numbers'
import type { WritingOptions } from './options'

/**
 * Phiếu luyện viết dạng PDF vector (pdf-lib + fontkit). Chỉ nạp khi bấm xuất (dynamic import).
 *  - Chữ mẫu / chữ mờ: path KanjiVG (vector, nét tròn đầu như file gốc).
 *  - Text: font nhúng dạng subset (chỉ ký tự có dùng) nên file nhẹ và chọn / copy chữ được.
 *  - Chữ không có dữ liệu nét: vẽ bằng Klee One (kiểu chữ viết tay sách giáo khoa), thiếu nữa thì Noto Sans JP.
 */

export interface FontFiles {
  vi: Uint8Array
  viBold: Uint8Array
  jp: Uint8Array
  klee: Uint8Array
}

const cps = (s: string) => [...s].map((c) => c.codePointAt(0)!)

export async function buildPdf(sheet: Sheet, o: WritingOptions, strokes: ReadonlyMap<string, StrokeData | null>, files: FontFiles): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const [vi, viBold, jp, klee] = await Promise.all([
    doc.embedFont(files.vi, { subset: true }),
    doc.embedFont(files.viBold, { subset: true }),
    doc.embedFont(files.jp, { subset: true }),
    doc.embedFont(files.klee, { subset: true }),
  ])
  const fonts: Record<FontKey, PDFFont> = { vi, 'vi-bold': viBold, jp }
  // Kiểm tra font có chữ không (fontkit đọc riêng, pdf-lib không có API này).
  const kleeFk = fontkit.create(files.klee)
  const jpFk = fontkit.create(files.jp)
  const fallbackFont = (ch: string): PDFFont | null => {
    const has = (f: typeof kleeFk) => cps(ch).every((c) => f.hasGlyphForCodePoint(c))
    return has(kleeFk) ? klee : has(jpFk) ? jp : null
  }

  doc.setTitle(pageTitle(sheet))
  doc.setAuthor('Kotonoha')
  doc.setCreator('Kotonoha')
  doc.setProducer('Kotonoha (pdf-lib)')
  doc.setLanguage('vi')
  doc.setCreationDate(new Date())

  const measure = (text: string, font: FontKey, size: number) => fonts[font].widthOfTextAtSize(text, size)
  const pages = buildScene(sheet, o, measure)

  for (const sp of pages) {
    const page = doc.addPage([sp.w, sp.h])
    page.pushOperators(setLineJoin(LineJoinStyle.Round))
    for (const p of sp.prims) drawPrim(page, sp.h, p)
  }

  function drawPrim(page: PDFPage, h: number, p: Prim) {
    if (p.t === 'line') {
      page.drawLine({
        start: { x: p.x1, y: h - p.y1 },
        end: { x: p.x2, y: h - p.y2 },
        thickness: p.w,
        color: grayscale(p.gray),
        dashArray: p.dash,
        // Nét liền: đầu vuông để góc khung kín; nét đứt: đầu phẳng.
        lineCap: p.dash ? LineCapStyle.Butt : LineCapStyle.Projecting,
      })
      return
    }
    if (p.t === 'text') {
      const width = p.runs.reduce((s, r) => s + measure(r.text, r.font, p.size), 0)
      let x = p.anchor === 'middle' ? p.x - width / 2 : p.anchor === 'end' ? p.x - width : p.x
      for (const r of p.runs) {
        page.drawText(r.text, { x, y: h - p.y, size: p.size, font: fonts[r.font], color: grayscale(r.gray ?? p.gray) })
        x += measure(r.text, r.font, p.size)
      }
      return
    }
    for (const part of glyphParts(p.ch, p.x, p.y, p.size)) {
      const data = strokes.get(part.ch)
      const scale = part.size / VIEWBOX
      if (data) {
        for (const s of data.strokes) {
          page.drawSvgPath(s.d, {
            x: part.x,
            y: h - part.y,
            scale,
            borderColor: grayscale(p.gray),
            borderWidth: STROKE_WIDTH,
            borderLineCap: LineCapStyle.Round,
          })
        }
        if (p.numbers) {
          const f = numberSize(part.size)
          for (const l of numberLabels(data.strokes, f)) {
            if (l.leader) {
              const [x1, y1, x2, y2] = l.leader
              page.drawLine({
                start: { x: part.x + x1 * scale, y: h - (part.y + y1 * scale) },
                end: { x: part.x + x2 * scale, y: h - (part.y + y2 * scale) },
                thickness: LEADER_WIDTH,
                color: grayscale(GRAY.number),
                lineCap: LineCapStyle.Round,
              })
            }
            page.drawText(String(l.n), {
              x: part.x + l.x * scale,
              y: h - (part.y + l.y * scale),
              size: f * scale,
              font: vi,
              color: grayscale(GRAY.number),
            })
          }
        }
        continue
      }
      const font = fallbackFont(part.ch)
      if (!font) continue
      const size = part.size * FALLBACK_SCALE
      const w = font.widthOfTextAtSize(part.ch, size)
      page.drawText(part.ch, {
        x: part.x + (part.size - w) / 2,
        y: h - (part.y + part.size / 2 + size * 0.36),
        size,
        font,
        color: grayscale(p.gray),
      })
    }
  }

  return doc.save()
}

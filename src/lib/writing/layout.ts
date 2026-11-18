import { displayKun, kunSegments } from '../readings'
import { fadeCount, type WritingOptions } from './options'
import { formatShortDate, t } from '../../i18n'

/**
 * Bố cục phiếu luyện viết (hàm thuần, đơn vị point = 1/72 inch, gốc tọa độ góc trên trái).
 * Một "scene" mô tả từng trang bằng nét kẻ, chữ mẫu và text: bản xem trước (SVG), PDF và Word cùng đọc từ đây
 * nên bản in khớp với bản xem trước.
 */

/** Một chữ trên phiếu. */
export interface WritingItem {
  /** 1 chữ Hán / kana, hoặc 2 kana (âm ghép きゃ) */
  char: string
  kind: 'kanji' | 'kana'
  hanViet?: string
  /** Âm On (katakana) */
  on?: string[]
  /** Âm Kun theo ký hiệu KANJIDIC2 (ひと.つ) */
  kun?: string[]
  romaji?: string
  /** Chữ tương ứng ở bảng kia (あ ↔ ア) */
  counterpart?: string
  examples?: { word: string; reading: string; meaning: string }[]
}

export interface Sheet {
  /** "N5 · Bài 1" (đầu trang: "LUYỆN VIẾT · N5 · Bài 1") */
  title: string
  /** Ngày tạo đã định dạng */
  date: string
  items: WritingItem[]
}

/* ───────────── Khổ giấy và kích thước ───────────── */

const MM = 72 / 25.4
export const PAPER_SIZE: Record<WritingOptions['paper'], [number, number]> = {
  A4: [595.28, 841.89],
  // B5 của Nhật (JIS, 182 × 257 mm): khổ vở / sách bài tập thông dụng ở Nhật.
  B5: [Math.round(182 * MM * 100) / 100, Math.round(257 * MM * 100) / 100],
  Letter: [612, 792],
}

export const MARGIN = { side: 36, top: 54, bottom: 46 }
/** Đường kẻ: khung khối chữ, đường kẻ ô, đường hướng dẫn (nét đứt). */
export const LINE = { frame: 0.75, cell: 0.5, guide: 0.3 }
/** okurigana: phần sau dấu "." của âm Kun, xám đậm vừa phải (vẫn rõ khi in đen trắng). */
export const GRAY = { frame: 0, cell: 0.25, guide: 0.6, number: 0.45, fadeFrom: 0.62, fadeTo: 0.88, fade: 0.72, meta: 0.35, okurigana: 0.42 }
export const GUIDE_DASH: [number, number] = [2, 2]
/** Nét chữ KanjiVG: độ dày 3 trên khung 109 (như file gốc). */
export const STROKE_WIDTH = 3
export const VIEWBOX = 109
/** Số thứ tự nét: cỡ chữ trên khung 109 (như KanjiVG). */
export const NUMBER_SIZE = 8
/** Chữ không có dữ liệu nét (vẽ bằng font): tỉ lệ cỡ chữ so với ô. */
export const FALLBACK_SCALE = 0.78
const GAP_MAX = 24

export interface Geometry {
  pageW: number
  pageH: number
  /** Lề trái thật (khối chữ căn giữa) */
  x0: number
  /** Mép trên vùng nội dung */
  top: number
  /** Cạnh một ô tập viết */
  cell: number
  blockW: number
  /** Hàng tiêu đề (0 nếu không hiện gì) */
  headH: number
  /** Dòng từ ví dụ (0 nếu tắt) */
  exH: number
  /** Chiều cao một khối chữ */
  blockH: number
  /** Khoảng cách giữa hai khối */
  gap: number
  rows: number
  cols: number
}

const floorTo = (v: number, step: number) => Math.floor(v / step + 1e-9) * step
const round2 = (v: number) => Math.round(v * 100) / 100

/** Có hàng tiêu đề không (kana luôn có: romaji + chữ bảng kia). */
export const hasHeader = (o: WritingOptions, items: readonly WritingItem[]) =>
  o.showHanViet || o.showOn || o.showKun || items.some((i) => i.kind === 'kana')

export function geometry(o: WritingOptions, items: readonly WritingItem[] = []): Geometry {
  const [pageW, pageH] = PAPER_SIZE[o.paper]
  const headH = hasHeader(o, items) ? 20 : 0
  const exH = o.examples > 0 && items.some((i) => i.kind === 'kanji') ? 15 : 0
  const contentW = pageW - 2 * MARGIN.side
  // Chừa 4pt cuối trang cho đoạn trống bắt buộc sau bảng cuối cùng của Word.
  const availH = pageH - MARGIN.top - MARGIN.bottom - 4
  const n = o.perPage
  const byWidth = contentW / (o.rows + o.cols)
  const byHeight = (availH - n * (headH + exH) - (n - 1) * 8) / (n * o.rows)
  // Bội số 0.05pt = 1 twip: kích thước ô trong Word khớp tuyệt đối với PDF.
  const cell = round2(floorTo(Math.min(byWidth, byHeight), 0.05))
  const blockW = round2(cell * (o.rows + o.cols))
  const blockH = round2(headH + exH + cell * o.rows)
  const gap = round2(floorTo(Math.min(GAP_MAX, (availH - n * blockH) / Math.max(1, n - 1)), 0.05))
  const x0 = round2(floorTo((pageW - blockW) / 2, 0.05))
  return { pageW, pageH, x0, top: MARGIN.top, cell, blockW, headH, exH, blockH, gap, rows: o.rows, cols: o.cols }
}

/** Chia danh sách thành các trang. */
export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += perPage) out.push(items.slice(i, i + perPage))
  return out
}

/**
 * Ranh giới các ô tiêu đề, tính theo đơn vị ô (0 … rows+cols). Ô đầu luôn chứa trọn cột chữ mẫu,
 * ranh giới trùng đường kẻ cột để bảng Word ghép ô được.
 */
export function headerSplit(n: number, rows: number, cols: number): number[] {
  const u = rows + cols
  const out = [0]
  for (let i = 1; i < n; i++) out.push(Math.min(u - (n - i), Math.max(rows + i - 1, Math.round((u * i) / n))))
  out.push(u)
  return out
}

/* ───────────── Nội dung chữ ───────────── */

export type FontKey = 'vi' | 'vi-bold' | 'jp'
export interface TextRun {
  text: string
  font: FontKey
  /** Độ xám riêng của đoạn (mặc định theo cả dòng text) */
  gray?: number
}
/** Đo độ rộng (pt) của một đoạn text với font và cỡ chữ cho trước. */
export type Measure = (text: string, font: FontKey, size: number) => number

const JP_CHAR = /[⺀-鿿豈-﫿＀-￯　-〿]/

/** Tách text thành các đoạn theo font: chữ Nhật dùng Noto Sans JP, còn lại Be Vietnam Pro. */
export function splitRuns(text: string, font: 'vi' | 'vi-bold', gray?: number): TextRun[] {
  const out: TextRun[] = []
  for (const ch of text.normalize('NFC')) {
    const f: FontKey = JP_CHAR.test(ch) ? 'jp' : font
    const last = out[out.length - 1]
    if (last && last.font === f) last.text += ch
    else out.push(gray === undefined ? { text: ch, font: f } : { text: ch, font: f, gray })
  }
  return out
}

/** Nối các đoạn (text + độ xám riêng) thành run; gộp đoạn liền nhau cùng font và độ xám. */
function segmentRuns(segs: readonly { text: string; gray?: number }[], font: 'vi' | 'vi-bold'): TextRun[] {
  const out: TextRun[] = []
  for (const seg of segs) {
    for (const r of splitRuns(seg.text, font, seg.gray)) {
      const last = out[out.length - 1]
      if (last && last.font === r.font && last.gray === r.gray) last.text += r.text
      else out.push(r)
    }
  }
  return out
}

/** Ước lượng độ rộng khi chưa có font thật (test, xem trước lúc font chưa tải). */
export const estimateMeasure: Measure = (text, font, size) => {
  let w = 0
  for (const ch of text) {
    if (font === 'jp' || JP_CHAR.test(ch)) w += 1
    else if (/[A-ZĐ]/.test(ch.normalize('NFD')[0])) w += font === 'vi-bold' ? 0.7 : 0.66
    else if (/[\s.,:·'-]/.test(ch)) w += 0.3
    else w += font === 'vi-bold' ? 0.58 : 0.55
  }
  return w * size
}

const runsWidth = (runs: readonly TextRun[], size: number, m: Measure) => runs.reduce((s, r) => s + m(r.text, r.font, size), 0)

export interface HeaderCell {
  /** Các phần (âm đọc), nối bằng `joiner`; không đủ chỗ thì bỏ bớt từ cuối */
  parts: string[]
  joiner: string
  font: 'vi' | 'vi-bold'
  /** Âm Kun theo ký hiệu KANJIDIC2: phần okurigana (sau dấu ".") in xám */
  kun?: boolean
}

/** Nội dung hàng tiêu đề của chữ thứ `n` (1…). */
export function headerCells(item: WritingItem, n: number, o: WritingOptions): HeaderCell[] {
  if (item.kind === 'kana') {
    return [
      { parts: [item.romaji ?? ''], joiner: '', font: 'vi-bold' },
      { parts: [item.counterpart ?? ''], joiner: '', font: 'vi-bold' },
    ]
  }
  const cells: HeaderCell[] = []
  if (o.showHanViet) cells.push({ parts: [item.hanViet ? t('layout.so2', { toUpperCase: item.hanViet.toUpperCase(), n }) : t('layout.so', { n })], joiner: '', font: 'vi-bold' })
  if (o.showOn) cells.push({ parts: item.on?.length ? item.on : ['—'], joiner: '、', font: 'vi-bold' })
  if (o.showKun) {
    const kun = displayKun(item.kun ?? [])
    cells.push(kun.length ? { parts: kun, joiner: '、', font: 'vi-bold', kun: true } : { parts: ['—'], joiner: '、', font: 'vi-bold' })
  }
  return cells
}

/**
 * Cỡ chữ lớn nhất (từ `size` giảm dần tới `min`) để text vừa `maxW`; vẫn không vừa thì bỏ bớt phần cuối
 * (thêm "…"), cuối cùng cắt ký tự.
 */
export function fitText(cell: HeaderCell, maxW: number, size: number, min: number, m: Measure): { runs: TextRun[]; size: number } {
  const segs = (part: string) =>
    cell.kun ? kunSegments(part).map((s) => (s.okurigana ? { text: s.text, gray: GRAY.okurigana } : { text: s.text })) : [{ text: part }]
  const build = (parts: string[], more: boolean) =>
    segmentRuns([...parts.flatMap((part, i) => (i ? [{ text: cell.joiner }, ...segs(part)] : segs(part))), ...(more ? [{ text: '…' }] : [])], cell.font)
  for (let s = size; s >= min - 1e-9; s -= 0.5) {
    const runs = build(cell.parts, false)
    if (runsWidth(runs, s, m) <= maxW) return { runs, size: s }
  }
  for (let k = cell.parts.length - 1; k >= 1; k--) {
    const runs = build(cell.parts.slice(0, k), true)
    if (runsWidth(runs, min, m) <= maxW) return { runs, size: min }
  }
  const chars = [...cell.parts[0]]
  for (let k = chars.length - 1; k >= 1; k--) {
    const runs = splitRuns(chars.slice(0, k).join('') + '…', cell.font)
    if (runsWidth(runs, min, m) <= maxW) return { runs, size: min }
  }
  return { runs: [], size: min }
}

/** Dòng từ ví dụ: "一つ（ひとつ） một cái   ·   一人（ひとり） một người". */
export function exampleRuns(item: WritingItem, count: number): TextRun[][] {
  return (item.examples ?? []).slice(0, count).map((e) => {
    const runs: TextRun[] = [{ text: e.word, font: 'jp' }]
    if (e.reading && e.reading !== e.word) runs.push({ text: `（${e.reading}）`, font: 'jp' })
    runs.push(...splitRuns(` ${e.meaning}`, 'vi'))
    return runs
  })
}

/* ───────────── Scene ───────────── */

export type Prim =
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; gray: number; dash?: [number, number] }
  /** Chữ trong khung vuông `size` (góc trên trái x, y): nét KanjiVG, hoặc font nếu không có dữ liệu nét */
  | { t: 'glyph'; ch: string; x: number; y: number; size: number; gray: number; numbers: boolean }
  /** Text: (x, y) là đường chân chữ; anchor theo x */
  | { t: 'text'; x: number; y: number; size: number; gray: number; anchor: 'start' | 'middle' | 'end'; runs: TextRun[] }

export interface ScenePage {
  w: number
  h: number
  prims: Prim[]
}

export const pageTitle = (sheet: Pick<Sheet, 'title'>) => t('layout.luyenViet', { title: sheet.title })
export const pageFooter = (page: number, total: number) => `${t('writing.footerPrefix')}${page}/${total}${t('writing.footerSuffix')}`
export const PAGE_TEXT = { titleSize: 11, dateSize: 9, footerSize: 8, titleY: 32, footerFromBottom: 22 }

/** Đường chân chữ để text cỡ `size` nằm giữa dải [top, top+h]. */
export const baselineIn = (top: number, h: number, size: number) => top + h / 2 + size * 0.36

/** Ô mờ thứ i (0…) ở hàng đầu: độ xám (càng về phải càng nhạt nếu bật). */
export function fadeGray(i: number, count: number, gradient: boolean): number {
  if (!gradient || count <= 1) return GRAY.fade
  return round2(GRAY.fadeFrom + ((GRAY.fadeTo - GRAY.fadeFrom) * i) / (count - 1))
}

/** Đường hướng dẫn trong một ô vuông. */
export function guideLines(x: number, y: number, s: number, guide: WritingOptions['guide']): Prim[] {
  if (guide === 'none') return []
  const dash = guide === 'cross' ? GUIDE_DASH : undefined
  const gray = guide === 'cross' ? GRAY.guide : 0.75
  return [
    { t: 'line', x1: x + s / 2, y1: y, x2: x + s / 2, y2: y + s, w: LINE.guide, gray, dash },
    { t: 'line', x1: x, y1: y + s / 2, x2: x + s, y2: y + s / 2, w: LINE.guide, gray, dash },
  ]
}

/** Các phần nét (âm ghép きゃ: hai chữ thu nhỏ đặt cạnh nhau) trong khung vuông. */
export function glyphParts(ch: string, x: number, y: number, size: number): { ch: string; x: number; y: number; size: number }[] {
  const chars = [...ch]
  if (chars.length < 2) return [{ ch, x, y, size }]
  const s = size * 0.56
  return chars.slice(0, 2).map((c, i) => ({ ch: c, x: x - size * 0.03 + i * size * 0.47, y: y + (size - s) / 2, size: s }))
}

/** Dựng scene của cả phiếu. `measure` đo text bằng font thật (PDF) hoặc trình duyệt (xem trước). */
export function buildScene(sheet: Sheet, o: WritingOptions, measure: Measure = estimateMeasure): ScenePage[] {
  const g = geometry(o, sheet.items)
  const pages = paginate(sheet.items, o.perPage)
  const fades = fadeCount(o)
  const total = pages.length
  return pages.map((chunk, p) => {
    const prims: Prim[] = []
    const line = (x1: number, y1: number, x2: number, y2: number, w: number, gray: number) => prims.push({ t: 'line', x1, y1, x2, y2, w, gray })

    // Đầu trang, chân trang
    prims.push({ t: 'text', x: g.x0, y: PAGE_TEXT.titleY, size: PAGE_TEXT.titleSize, gray: 0, anchor: 'start', runs: splitRuns(pageTitle(sheet), 'vi-bold') })
    prims.push({ t: 'text', x: g.x0 + g.blockW, y: PAGE_TEXT.titleY, size: PAGE_TEXT.dateSize, gray: GRAY.meta, anchor: 'end', runs: splitRuns(sheet.date, 'vi') })
    prims.push({
      t: 'text',
      x: g.pageW / 2,
      y: g.pageH - PAGE_TEXT.footerFromBottom,
      size: PAGE_TEXT.footerSize,
      gray: GRAY.meta,
      anchor: 'middle',
      runs: splitRuns(pageFooter(p + 1, total), 'vi'),
    })

    chunk.forEach((item, i) => {
      const n = p * o.perPage + i + 1
      const top = round2(g.top + i * (g.blockH + g.gap))
      const left = g.x0
      const right = left + g.blockW
      let y = top

      // Hàng tiêu đề
      if (g.headH) {
        const cells = headerCells(item, n, o)
        const split = headerSplit(Math.max(1, cells.length), o.rows, o.cols)
        cells.forEach((c, k) => {
          const x1 = left + split[k] * g.cell
          const x2 = left + split[k + 1] * g.cell
          if (k > 0) line(x1, y, x1, y + g.headH, LINE.cell, GRAY.cell)
          const fit = fitText(c, x2 - x1 - 8, 11, 7, measure)
          if (fit.runs.length) prims.push({ t: 'text', x: (x1 + x2) / 2, y: baselineIn(y, g.headH, fit.size), size: fit.size, gray: 0, anchor: 'middle', runs: fit.runs })
        })
        y += g.headH
        line(left, y, right, y, LINE.cell, GRAY.cell)
      }

      // Từ ví dụ
      if (g.exH) {
        const ex = item.kind === 'kanji' ? exampleRuns(item, o.examples) : []
        const sep: TextRun = { text: '   ·   ', font: 'vi' }
        let runs: TextRun[] = []
        let size = 8
        for (let k = ex.length; k >= 1 && !runs.length; k--) {
          const joined = ex.slice(0, k).flatMap((r, j) => (j ? [sep, ...r] : r))
          for (let s = 8; s >= 6.5; s -= 0.5) {
            if (runsWidth(joined, s, measure) <= g.blockW - 12) {
              runs = joined
              size = s
              break
            }
          }
        }
        if (runs.length) prims.push({ t: 'text', x: left + 6, y: baselineIn(y, g.exH, size), size, gray: 0.15, anchor: 'start', runs })
        y += g.exH
        line(left, y, right, y, LINE.cell, GRAY.cell)
      }

      // Ô chữ mẫu (cao bằng các hàng tập viết)
      const model = g.cell * o.rows
      prims.push({ t: 'glyph', ch: item.char, x: left, y, size: model, gray: 0, numbers: o.numbers })
      line(left + model, y, left + model, y + model, LINE.cell, GRAY.cell)

      // Lưới tập viết
      const gx = left + model
      for (let r = 1; r < o.rows; r++) line(gx, y + r * g.cell, right, y + r * g.cell, LINE.cell, GRAY.cell)
      for (let c = 1; c < o.cols; c++) line(gx + c * g.cell, y, gx + c * g.cell, y + model, LINE.cell, GRAY.cell)
      for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) prims.push(...guideLines(gx + c * g.cell, y + r * g.cell, g.cell, o.guide))
      for (let c = 0; c < fades; c++) {
        prims.push({ t: 'glyph', ch: item.char, x: gx + c * g.cell, y, size: g.cell, gray: fadeGray(c, fades, o.fadeGradient), numbers: false })
      }

      // Khung khối chữ (vẽ sau cùng, đè lên đường kẻ ô)
      const bottom = top + g.blockH
      line(left, top, right, top, LINE.frame, GRAY.frame)
      line(left, bottom, right, bottom, LINE.frame, GRAY.frame)
      line(left, top, left, bottom, LINE.frame, GRAY.frame)
      line(right, top, right, bottom, LINE.frame, GRAY.frame)
    })
    return { w: g.pageW, h: g.pageH, prims }
  })
}

/* ───────────── Tên file, tiêu đề ───────────── */

/** "Tiếng Việt có dấu" → "tieng-viet-co-dau". */
export function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Kotonoha-luyen-viet-N5-bai1.pdf */
export function fileName(fileKey: string, ext: 'pdf' | 'docx') {
  return `Kotonoha-luyen-viet-${fileKey || 'phieu'}.${ext}`
}

/** Ngày in trên phiếu, theo ngôn ngữ giao diện (Intl): 18/11/2026 (vi) · 2026/11/18 (ja). */
export const formatDate = (d: Date): string => formatShortDate(d)

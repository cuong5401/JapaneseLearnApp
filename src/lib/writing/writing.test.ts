import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import type { KanjiEntry } from '../../types'
import { displayKun, kunParts, kunSegments, parseReadings } from '../readings'
import { parseStrokeData, pathErrors, type StrokeData } from '../strokes'
import { buildDocx, type CellPng } from './docx'
import { GRAY, NUMBER_SIZE, buildScene, fileName, fitText, geometry, headerCells, headerSplit, paginate, slug, splitRuns, type Sheet } from './layout'
import { MIN_NUMBER_PT, numberLabels, numberSize } from './numbers'
import { DEFAULT_OPTIONS, fadeCount, sanitizeOptions, type WritingOptions } from './options'
import { buildPdf } from './pdf'
import { formatRanges, kanaRowChars, makeItem, makeRadicalItem, notebookChars, parseCustom, parseRanges, parseSource, sourceParams, sourceTitle } from './sources'

const ROOT = resolve(__dirname, '../../..')
const json = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'))
const kanji: KanjiEntry[] = json('public/data/kanji/kanji.json')
const byChar = new Map(kanji.map((k) => [k.kanji, k]))
const readings = parseReadings(json('public/data/kanji/kanji-readings.json'))
const strokeOf = (ch: string): StrokeData | null => {
  try {
    return parseStrokeData(json(`public/data/strokes/${ch.codePointAt(0)!.toString(16)}.json`))
  } catch {
    return null
  }
}
const font = (f: string) => new Uint8Array(readFileSync(resolve(ROOT, 'src/assets/fonts', f)))
const FONTS = {
  vi: font('be-vietnam-pro-regular.ttf'),
  viBold: font('be-vietnam-pro-bold.ttf'),
  jp: font('noto-sans-jp-bold.ttf'),
  klee: font('klee-one-semibold.ttf'),
}

const sheetOf = (chars: string[], o: WritingOptions = DEFAULT_OPTIONS): Sheet => ({
  title: 'N5 · Bài 1',
  date: '16/11/2026',
  items: chars.map((c) => makeItem(c, { kanji: byChar, readings, examples: o.examples })),
})
const strokesFor = (chars: string[]) => new Map([...new Set(chars.flatMap((c) => [...c]))].map((c) => [c, strokeOf(c)]))

async function pdfText(bytes: Uint8Array): Promise<{ pages: number; text: string[] }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false }).promise
  const text: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    text.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '))
  }
  return { pages: doc.numPages, text }
}

async function pdfItems(bytes: Uint8Array): Promise<{ items: string[] }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false }).promise
  const items: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    for (const it of content.items) if ('str' in it) items.push(it.str)
  }
  return { items }
}

describe('số thứ tự nét trên ô chữ mẫu', () => {
  // Hộp chữ số xấp xỉ (cùng công thức với numbers.ts): rộng 0.58 em mỗi chữ số, cao 0.72 em.
  const box = (l: { n: number; x: number; y: number }, f: number) => ({ x0: l.x, x1: l.x + 0.58 * f * String(l.n).length, y0: l.y - 0.72 * f, y1: l.y })
  const overlap = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

  it('cỡ số không nhỏ hơn mức đọc được khi in', () => {
    expect(numberSize(200)).toBe(NUMBER_SIZE)
    for (const cellPt of [60, 74.7, 87.1]) expect((numberSize(cellPt) * cellPt) / 109).toBeGreaterThanOrEqual(MIN_NUMBER_PT - 1e-9)
  })

  it('không có hai số đè nhau; 想: số 5–9 không dồn sát nhau, nằm trong ô', () => {
    const f = numberSize(87.1)
    for (const ch of '想曜事書働聞鬱議') {
      const d = strokeOf(ch)
      if (!d) continue
      const labels = numberLabels(d.strokes, f)
      expect(labels.map((l) => l.n), ch).toEqual(d.strokes.map((s) => s.n))
      const boxes = labels.map((l) => box(l, f))
      for (let i = 0; i < boxes.length; i++) {
        expect(boxes[i].x0, `${ch} ${i + 1}`).toBeGreaterThanOrEqual(0)
        expect(boxes[i].x1, `${ch} ${i + 1}`).toBeLessThanOrEqual(109)
        for (let j = 0; j < i; j++) expect(overlap(boxes[i], boxes[j]), `${ch}: ${j + 1} và ${i + 1}`).toBe(false)
      }
    }
    // Đường dẫn chỉ có khi số đặt xa điểm đặt bút.
    const so = numberLabels(strokeOf('想')!.strokes, f)
    for (const l of so) if (l.leader) expect(Math.hypot(l.leader[2] - l.leader[0], l.leader[3] - l.leader[1])).toBeGreaterThan(f * 0.4)
  })
})

const TWELVE =[...'一二三四五六七八九十事曜']

describe('âm đọc KANJIDIC2', () => {
  it('âm Kun giữ ký hiệu KANJIDIC2: "." ngăn okurigana, "-" tiền tố / hậu tố', () => {
    expect(displayKun(readings.get('想')!.kun)).toEqual(['おも.う'])
    expect(displayKun(readings.get('上')!.kun)).toEqual(expect.arrayContaining(['あ.げる', 'うえ', '-あ.がる']))
    expect(displayKun(readings.get('一')!.kun)).toEqual(['ひと-', 'ひと.つ'])
    expect(displayKun(['う.まれ', 'う.まれ', 'うまれ'])).toEqual(['う.まれ', 'うまれ'])
    expect(kunParts('つか.える')).toEqual({ before: '', stem: 'つか', okurigana: 'える', after: '' })
    expect(kunSegments('おも.う')).toEqual([
      { text: 'おも.', okurigana: false },
      { text: 'う', okurigana: true },
    ])
    expect(kunSegments('-あ.がる')).toEqual([
      { text: '-あ.', okurigana: false },
      { text: 'がる', okurigana: true },
    ])
    expect(kunSegments('ひと-')).toEqual([{ text: 'ひと-', okurigana: false }])
  })

  it('dữ liệu có cho chữ cơ bản, bỏ mục sai định dạng', () => {
    expect(readings.get('一')).toMatchObject({ on: ['イチ', 'イツ'], kun: ['ひと-', 'ひと.つ'], s: 1 })
    expect(readings.get('曜')?.s).toBe(18)
    const m = parseReadings({ chars: { 一: { on: ['イチ', 3], kun: 'x', s: 1.5 }, 二: null } })
    expect(m.get('一')).toEqual({ on: ['イチ'], kun: [] })
    expect(m.has('二')).toBe(false)
  })
})

describe('bố cục phiếu', () => {
  it('chia trang: 12 chữ, 5 chữ/trang → 3 trang', () => {
    expect(paginate(TWELVE, 5).map((p) => p.length)).toEqual([5, 5, 2])
    const pages = buildScene(sheetOf(TWELVE), DEFAULT_OPTIONS)
    expect(pages).toHaveLength(3)
    expect(pages.map((p) => p.prims.filter((x) => x.t === 'glyph' && x.gray === 0).length)).toEqual([5, 5, 2])
  })

  it('khối chữ vừa trang với mọi tổ hợp tùy chọn, ô vuông là bội số 1 twip', () => {
    for (const paper of ['A4', 'B5', 'Letter'] as const)
      for (const perPage of [4, 5, 6] as const)
        for (const rows of [2, 3, 4] as const)
          for (const cols of [8, 10, 12] as const)
            for (const examples of [0, 2] as const) {
              const o = { ...DEFAULT_OPTIONS, paper, perPage, rows, cols, examples }
              const g = geometry(o, sheetOf(['一'], o).items)
              const bottom = g.top + perPage * g.blockH + (perPage - 1) * g.gap
              expect(bottom).toBeLessThanOrEqual(g.pageH - 46 - 3.9)
              expect(g.x0 + g.blockW).toBeLessThanOrEqual(g.pageW - 35.9)
              expect(Math.abs(g.cell * 20 - Math.round(g.cell * 20))).toBeLessThan(1e-6)
              expect(g.gap).toBeGreaterThanOrEqual(8)
            }
  })

  it('A4 mặc định: ô ~15 mm, cỡ đủ để viết tay', () => {
    const g = geometry(DEFAULT_OPTIONS)
    expect(g.cell).toBeGreaterThan(42)
    expect(g.cell).toBeLessThan(45)
  })

  it('ô tiêu đề chia theo đường kẻ cột, ô đầu chứa trọn cột chữ mẫu', () => {
    expect(headerSplit(3, 2, 10)).toEqual([0, 4, 8, 12])
    expect(headerSplit(2, 2, 10)).toEqual([0, 6, 12])
    expect(headerSplit(1, 3, 8)).toEqual([0, 11])
    for (const [n, r, c] of [[3, 4, 8], [3, 4, 12], [2, 4, 8], [3, 3, 8]])
      for (const b of headerSplit(n, r, c).slice(1, -1)) expect(b).toBeGreaterThanOrEqual(r)
  })

  it('hàng tiêu đề chữ Hán và kana', () => {
    const [ichi] = sheetOf(['一']).items
    const cells = headerCells(ichi, 1, DEFAULT_OPTIONS)
    expect(cells.map((c) => c.parts.join(c.joiner))).toEqual(['NHẤT: Số 1', 'イチ、イツ', 'ひと-、ひと.つ'])
    // Ô Kun: okurigana sau dấu "." là run xám riêng, dấu chấm vẫn ở phần đậm.
    const fit = fitText(cells[2], 200, 11, 7, (t, _f, s) => [...t].length * s)
    expect(fit.runs.map((r) => r.text).join('')).toBe('ひと-、ひと.つ')
    expect(fit.runs.filter((r) => r.gray === GRAY.okurigana).map((r) => r.text)).toEqual(['つ'])
    const a = makeItem('あ', { kanji: byChar, examples: 0 })
    expect(headerCells(a, 3, DEFAULT_OPTIONS).map((c) => c.parts[0])).toEqual(['a', 'ア'])
    expect(headerCells(ichi, 1, { ...DEFAULT_OPTIONS, showOn: false }).length).toBe(2)
  })

  it('text dài: thu nhỏ rồi bỏ bớt âm cuối', () => {
    const sei = makeItem('生', { kanji: byChar, readings, examples: 0 })
    const kun = headerCells(sei, 1, DEFAULT_OPTIONS)[2]
    const fit = fitText(kun, 140, 11, 7, (t, _f, s) => [...t].length * s)
    expect(fit.size).toBe(7)
    expect(fit.runs.map((r) => r.text).join('')).toMatch(/…$/)
    expect(splitRuns('LUYỆN VIẾT · あ行', 'vi-bold').map((r) => r.font)).toEqual(['vi-bold', 'jp'])
  })

  it('ô chữ mờ: mặc định cả hàng, nhạt dần', () => {
    expect(fadeCount(DEFAULT_OPTIONS)).toBe(10)
    expect(fadeCount({ fade: 3, cols: 8 })).toBe(3)
    const [page] = buildScene(sheetOf(['一']), DEFAULT_OPTIONS)
    const fades = page.prims.filter((p) => p.t === 'glyph' && p.gray > 0).map((p) => (p.t === 'glyph' ? p.gray : 0))
    expect(fades).toHaveLength(10)
    expect(fades[0]).toBeLessThan(fades[9])
  })

  it('tùy chọn lạ trong localStorage → mặc định', () => {
    expect(sanitizeOptions({ paper: 'A3', perPage: 7, fade: 99, guide: 'x' })).toEqual(DEFAULT_OPTIONS)
    expect(sanitizeOptions({ fade: 3, cols: 8 })).toMatchObject({ fade: 3, cols: 8 })
  })
})

describe('nguồn chữ', () => {
  it('URL ↔ nguồn, tiêu đề và tên file', () => {
    const s = parseSource(new URLSearchParams('src=kanji&level=N5&bai=1'))
    expect(s).toEqual({ kind: 'kanji', level: 'N5', lessons: [1] })
    expect(fileName(sourceTitle(s).fileKey, 'pdf')).toBe('Kotonoha-luyen-viet-N5-bai1.pdf')
    expect(sourceTitle(s).title).toBe('N5 · Bài 1')
    expect(sourceTitle({ kind: 'kanji', level: 'N4', lessons: [2, 3, 4] })).toEqual({ title: 'N4 · Bài 2–4', fileKey: 'N4-bai2-4' })
    expect(sourceTitle({ kind: 'kanji', level: 'all', lessons: [1, 3] }).fileKey).toBe('tat-ca-bai1_3')
    expect(sourceTitle({ kind: 'notebook', id: 'x' }, { notebookName: 'Từ khó' }).fileKey).toBe('so-tay-tu-kho')
    expect(sourceTitle({ kind: 'kana', script: 'hiragana', rows: ['h-basic-a', 'h-basic-k'] })).toEqual({ title: 'Hiragana · あ行, か行', fileKey: 'hiragana-a-k' })
    expect(slug('Đường Ơi')).toBe('duong-oi')
  })

  it('tự nhập: bỏ trùng, bỏ ký tự không phải chữ / không có nét', () => {
    const index = new Set([...'日本語勉強しま'])
    const r = parseCustom('日本語を 勉強します。日本 ABC', (c) => index.has(c))
    expect(r.chars).toEqual([...'日本語勉強しま'])
    expect(r.dropped).toEqual(['を', 'す', '。', 'A', 'B', 'C'])
  })

  it('kana theo hàng (cả âm ghép), sổ tay lấy chữ Hán trong từ', () => {
    expect(kanaRowChars(['h-basic-a'])).toEqual([...'あいうえお'])
    expect(kanaRowChars(['k-yoon-ky'])).toEqual(['キャ', 'キュ', 'キョ'])
    const chars = notebookChars([
      { kind: 'kanji', item: byChar.get('日')! },
      { kind: 'word', item: { id: 'n5-x', word: '日本語', reading: 'にほんご', meaning: 'tiếng Nhật' }, deck: { kind: 'ai' } },
      { kind: 'char', item: { id: 'ch-7483', char: '璃' } },
    ])
    expect(chars).toEqual(['日', '本', '語', '璃'])
  })
})

describe('nguồn Bộ thủ', () => {
  it('theo bài hoặc theo số bộ, đồng bộ URL', () => {
    expect(parseSource(new URLSearchParams('src=radical&bai=2,3'))).toEqual({ kind: 'radical', lessons: [2, 3], nos: [] })
    const byNo = parseSource(new URLSearchParams('src=radical&so=9,1-3,300'))
    expect(byNo).toEqual({ kind: 'radical', lessons: [], nos: [1, 2, 3, 9] })
    expect(sourceParams(byNo)).toEqual({ src: 'radical', so: '1-3,9' })
    expect(sourceTitle(byNo).fileKey).toBe('bo-thu-so1-3_9')
    expect(sourceTitle(parseSource(new URLSearchParams('src=radical&bai=1'))).title).toBe('Bộ thủ · Bài 1')
  })

  it('parseRanges / formatRanges', () => {
    expect(parseRanges('1-5, 3，30 x 214-216', 214)).toEqual([1, 2, 3, 4, 5, 30, 214])
    expect(parseRanges('', 214)).toEqual([])
    expect(formatRanges([1, 2, 3, 5, 7, 8])).toBe('1-3,5,7-8')
  })

  it('hàng tiêu đề: "Bộ 9 · NHÂN" | biến thể | ý nghĩa', () => {
    const item = makeRadicalItem({ no: 9, radical: '人', name: 'nhân', meaning: 'người', strokes: 2, variants: ['亻'] })
    const cells = headerCells(item, 1, DEFAULT_OPTIONS)
    expect(cells.map((c) => c.parts.join(c.joiner))).toEqual(['Bộ 9 · NHÂN', '亻', 'người'])
    const plain = headerCells(makeRadicalItem({ no: 1, radical: '一', name: 'nhất', meaning: 'số một', strokes: 1 }), 1, DEFAULT_OPTIONS)
    expect(plain[1].parts).toEqual(['—'])
  })
})

describe('xuất file', () => {
  it('chữ 一 二 三 事 曜 có đủ nét (số nét khớp KANJIDIC2, path hợp lệ)', () => {
    for (const ch of '一二三事曜') {
      const d = strokeOf(ch)!
      expect(d.strokes.length, ch).toBe(readings.get(ch)!.s)
      for (const s of d.strokes) expect(pathErrors(s.d), ch).toEqual([])
    }
  })

  it('PDF mở được, đúng số trang, trích được text tiêu đề', async () => {
    const sheet = sheetOf(TWELVE)
    const bytes = await buildPdf(sheet, DEFAULT_OPTIONS, strokesFor(TWELVE), FONTS)
    const { pages, text } = await pdfText(bytes)
    expect(pages).toBe(3)
    const all = text.join(' ')
    expect(all).toContain('イチ')
    expect(all).toContain('NHẤT')
    expect(all).toContain('LUYỆN VIẾT')
    expect(text[2]).toContain('Trang 3/3')
    // 曜 có 18 nét: số thứ tự nét 18 xuất hiện ở ô mẫu.
    expect(text[2]).toMatch(/\b18\b/)
  }, 30_000)

  it('PDF 20 chữ nhẹ (font subset)', async () => {
    const chars = kanji.filter((k) => k.firstLevel === 'N5').slice(0, 20).map((k) => k.kanji)
    const bytes = await buildPdf(sheetOf(chars), DEFAULT_OPTIONS, strokesFor(chars), FONTS)
    console.log(`PDF 20 chữ N5: ${(bytes.length / 1024).toFixed(0)} KB`)
    expect(bytes.length).toBeLessThan(400 * 1024)
  }, 30_000)

  it('PDF: âm Kun đúng ký hiệu "おも.う" (想), "ひと.つ" (一)', async () => {
    const chars = ['想', '一']
    const bytes = await buildPdf(sheetOf(chars), DEFAULT_OPTIONS, strokesFor(chars), FONTS)
    const { items } = await pdfItems(bytes)
    const joined = items.join('')
    expect(joined).toContain('おも.う')
    expect(joined).toContain('ひと.つ')
  }, 30_000)

  it('chữ không có nét KanjiVG vẫn xuất (font Klee One / Noto Sans JP)', async () => {
    const chars = ['靑', '一']
    const strokes = strokesFor(chars)
    expect(strokes.get('靑')).toBeNull()
    const bytes = await buildPdf(sheetOf(chars), DEFAULT_OPTIONS, strokes, FONTS)
    const { text } = await pdfText(bytes)
    expect(text[0]).toContain('靑')
  }, 30_000)

  it('DOCX mở được: mỗi chữ một bảng, có tiêu đề sửa được, đủ ảnh ô', async () => {
    const calls: CellPng[] = []
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) => c.charCodeAt(0))
    const o = { ...DEFAULT_OPTIONS, examples: 0 as const }
    const bytes = await buildDocx(sheetOf(TWELVE), o, async (spec) => {
      calls.push(spec)
      return png
    })
    const zip = await JSZip.loadAsync(bytes)
    const xml = await zip.file('word/document.xml')!.async('string')
    expect(xml.match(/<w:tbl>/g)).toHaveLength(12)
    expect(xml).toContain('NHẤT: Số 1')
    expect(xml).toContain('イチ、イツ')
    expect(xml.match(/w:pageBreakBefore/g)).toHaveLength(2)
    // Ô mẫu đúng kích thước rows × ô; ô mờ có chữ.
    const g = geometry(o)
    expect(calls.some((c) => c.ch === '一' && c.numbers && Math.abs(c.pt - 2 * g.cell) < 1e-6)).toBe(true)
    expect(calls.filter((c) => c.ch === '曜' && !c.numbers)).toHaveLength(10)
    const header = Object.keys(zip.files).find((f) => /word\/header\d*\.xml/.test(f))!
    expect(await zip.file(header)!.async('string')).toContain('LUYỆN VIẾT · N5 · Bài 1')
  }, 30_000)
})

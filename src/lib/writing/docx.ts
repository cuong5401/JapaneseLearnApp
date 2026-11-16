import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  Tab,
  TabStopType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx'
import { fadeCount, type WritingOptions } from './options'
import {
  GRAY,
  LINE,
  MARGIN,
  PAGE_TEXT,
  estimateMeasure,
  exampleRuns,
  fadeGray,
  fitText,
  geometry,
  headerCells,
  headerSplit,
  pageTitle,
  paginate,
  type Measure,
  type Sheet,
  type TextRun as SceneRun,
  type WritingItem,
} from './layout'

/**
 * Phiếu luyện viết dạng Word (.docx, thư viện docx). Chỉ nạp khi bấm xuất.
 * Mỗi chữ là một bảng: hàng tiêu đề (text thường, sửa được), ô chữ mẫu ghép dọc, lưới ô tập viết.
 * Chữ mẫu, chữ mờ và đường hướng dẫn chèn dạng ảnh PNG 300 dpi đúng bằng kích thước ô (sinh từ path KanjiVG).
 * Lề trang, kích thước ô, độ dày đường kẻ khớp với bản PDF (cùng `geometry`).
 */

/** Một ảnh ô: chữ (hoặc ô trống) + đường hướng dẫn, cạnh `pt` point. */
export interface CellPng {
  ch?: string
  /** 0 = đen */
  gray: number
  numbers: boolean
  guide: WritingOptions['guide']
  pt: number
}
export type RenderPng = (spec: CellPng) => Promise<Uint8Array>

export const PNG_DPI = 300

const tw = (pt: number) => Math.round(pt * 20)
/** ImageRun đo bằng pixel 96 dpi. */
const px96 = (pt: number) => (pt * 96) / 72
const hex = (gray: number) => {
  const v = Math.round(gray * 255)
    .toString(16)
    .padStart(2, '0')
  return `${v}${v}${v}`.toUpperCase()
}
const FONT = { ascii: 'Be Vietnam Pro', hAnsi: 'Be Vietnam Pro', eastAsia: 'Noto Sans JP', cs: 'Be Vietnam Pro' }
const JP_FONT = { ascii: 'Noto Sans JP', hAnsi: 'Noto Sans JP', eastAsia: 'Noto Sans JP', cs: 'Noto Sans JP' }
const NO_SPACE = { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO }
const ZERO = { top: 0, bottom: 0, left: 0, right: 0 }

function runsOf(runs: readonly SceneRun[], size: number, gray: number): TextRun[] {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.font !== 'vi',
        size: Math.round(size * 2),
        color: hex(r.gray ?? gray),
        font: r.font === 'jp' ? JP_FONT : FONT,
      }),
  )
}

export async function buildDocx(sheet: Sheet, o: WritingOptions, render: RenderPng, measure: Measure = estimateMeasure): Promise<Uint8Array> {
  const g = geometry(o, sheet.items)
  const fades = fadeCount(o)
  const model = g.cell * o.rows
  const cache = new Map<string, Promise<Uint8Array>>()
  const png = (spec: CellPng) => {
    const key = JSON.stringify(spec)
    let p = cache.get(key)
    if (!p) cache.set(key, (p = render(spec)))
    return p
  }
  const image = async (spec: CellPng) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: NO_SPACE,
      children: [new ImageRun({ type: 'png', data: await png(spec), transformation: { width: px96(spec.pt), height: px96(spec.pt) } })],
    })

  const frame = { style: BorderStyle.SINGLE, size: Math.round(LINE.frame * 8), color: hex(GRAY.frame) }
  const inner = { style: BorderStyle.SINGLE, size: Math.round(LINE.cell * 8), color: hex(GRAY.cell) }

  async function block(item: WritingItem, n: number): Promise<Table> {
    const rows: TableRow[] = []
    if (g.headH) {
      const cells = headerCells(item, n, o)
      const split = headerSplit(Math.max(1, cells.length), o.rows, o.cols)
      rows.push(
        new TableRow({
          height: { value: tw(g.headH), rule: HeightRule.EXACT },
          children: cells.map((c, k) => {
            const fit = fitText(c, (split[k + 1] - split[k]) * g.cell - 8, 11, 7, measure)
            return new TableCell({
              columnSpan: k === 0 ? 1 + split[1] - o.rows : split[k + 1] - split[k],
              verticalAlign: VerticalAlignTable.CENTER,
              margins: ZERO,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: NO_SPACE, children: runsOf(fit.runs, fit.size, 0) })],
            })
          }),
        }),
      )
    }
    if (g.exH) {
      const ex = item.kind === 'kanji' ? exampleRuns(item, o.examples) : []
      const runs = ex.flatMap((r, j) => (j ? [{ text: '   ·   ', font: 'vi' as const }, ...r] : r))
      rows.push(
        new TableRow({
          height: { value: tw(g.exH), rule: HeightRule.EXACT },
          children: [
            new TableCell({
              columnSpan: 1 + o.cols,
              verticalAlign: VerticalAlignTable.CENTER,
              margins: { ...ZERO, left: tw(6) },
              children: [new Paragraph({ spacing: NO_SPACE, children: runsOf(runs, 7.5, 0.15) })],
            }),
          ],
        }),
      )
    }
    for (let r = 0; r < o.rows; r++) {
      const cells: TableCell[] = []
      if (r === 0) {
        cells.push(
          new TableCell({
            rowSpan: o.rows,
            verticalAlign: VerticalAlignTable.CENTER,
            margins: ZERO,
            children: [await image({ ch: item.char, gray: 0, numbers: o.numbers, guide: 'none', pt: model })],
          }),
        )
      }
      for (let c = 0; c < o.cols; c++) {
        const faded = r === 0 && c < fades
        const spec: CellPng = faded
          ? { ch: item.char, gray: fadeGray(c, fades, o.fadeGradient), numbers: false, guide: o.guide, pt: g.cell }
          : { gray: 1, numbers: false, guide: o.guide, pt: g.cell }
        cells.push(new TableCell({ verticalAlign: VerticalAlignTable.CENTER, margins: ZERO, children: [await image(spec)] }))
      }
      rows.push(new TableRow({ height: { value: tw(g.cell), rule: HeightRule.EXACT }, cantSplit: true, children: cells }))
    }
    return new Table({
      rows,
      layout: TableLayoutType.FIXED,
      width: { size: tw(model) + o.cols * tw(g.cell), type: WidthType.DXA },
      columnWidths: [tw(model), ...Array.from({ length: o.cols }, () => tw(g.cell))],
      margins: ZERO,
      borders: { top: frame, bottom: frame, left: frame, right: frame, insideHorizontal: inner, insideVertical: inner },
    })
  }

  /** Đoạn trống cao đúng `pt` (khoảng cách giữa hai khối; Word cũng cần một đoạn sau bảng cuối). */
  const spacer = (pt: number, pageBreakBefore = false) =>
    new Paragraph({ pageBreakBefore, spacing: { before: 0, after: 0, line: Math.max(20, tw(pt)), lineRule: LineRuleType.EXACT }, children: [new TextRun({ text: '', size: 2 })] })

  const children: (Table | Paragraph)[] = []
  const pages = paginate(sheet.items, o.perPage)
  for (let p = 0; p < pages.length; p++) {
    for (let i = 0; i < pages[p].length; i++) {
      if (i > 0) children.push(spacer(g.gap))
      else if (p > 0) children.push(spacer(1, true))
      children.push(await block(pages[p][i], p * o.perPage + i + 1))
    }
  }
  children.push(spacer(1))

  const meta = hex(GRAY.meta)
  const doc = new Document({
    creator: 'Kotonoha',
    title: pageTitle(sheet),
    styles: { default: { document: { run: { font: FONT, size: 18 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: tw(g.pageW), height: tw(g.pageH) },
            margin: {
              top: tw(MARGIN.top),
              bottom: tw(MARGIN.bottom),
              left: tw(g.x0),
              right: tw(g.pageW - g.x0 - g.blockW),
              header: tw(PAGE_TEXT.titleY - PAGE_TEXT.titleSize),
              footer: tw(PAGE_TEXT.footerFromBottom - PAGE_TEXT.footerSize),
              gutter: 0,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                spacing: NO_SPACE,
                tabStops: [{ type: TabStopType.RIGHT, position: tw(g.blockW) }],
                children: [
                  new TextRun({ text: pageTitle(sheet), bold: true, size: PAGE_TEXT.titleSize * 2, font: FONT }),
                  new TextRun({ children: [new Tab(), sheet.date], size: PAGE_TEXT.dateSize * 2, color: meta, font: FONT }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: NO_SPACE,
                children: [
                  new TextRun({
                    children: ['Kotonoha · Trang ', PageNumber.CURRENT, '/', PageNumber.TOTAL_PAGES],
                    size: PAGE_TEXT.footerSize * 2,
                    color: meta,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
  return Packer.pack(doc, 'uint8array')
}

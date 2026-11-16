import { loadStrokeData, type StrokeData } from '../strokes'
import { loadFontFiles } from './fonts'
import type { Sheet } from './layout'
import type { WritingOptions } from './options'

/**
 * Xuất phiếu: chỉ nạp thư viện (pdf-lib, docx) khi bấm xuất – dynamic import tách thành chunk riêng.
 * Dữ liệu nét lấy qua store chung (cache bộ nhớ + service worker) nên offline vẫn xuất được nếu đã tải.
 */

export const PDF_TYPE = 'application/pdf'
export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Các chữ cần dữ liệu nét (âm ghép きゃ tách thành き, ゃ). */
export const glyphChars = (sheet: Pick<Sheet, 'items'>) => [...new Set(sheet.items.flatMap((i) => [...i.char]))]

async function loadStrokes(chars: readonly string[]): Promise<Map<string, StrokeData | null>> {
  const list = await Promise.all(chars.map(async (c) => [c, await loadStrokeData(c)] as const)).catch(() => {
    throw new Error('Không tải được dữ liệu nét chữ (đang offline và chữ chưa có trong bộ nhớ đệm?).')
  })
  return new Map(list)
}

export async function makePdf(sheet: Sheet, o: WritingOptions): Promise<Blob> {
  const [{ buildPdf }, files, strokes] = await Promise.all([import('./pdf'), loadFontFiles(), loadStrokes(glyphChars(sheet))])
  const bytes = await buildPdf(sheet, o, strokes, files)
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: PDF_TYPE })
}

export async function makeDocx(sheet: Sheet, o: WritingOptions): Promise<Blob> {
  const [{ buildDocx }, { pngRenderer }, strokes] = await Promise.all([import('./docx'), import('./cellImage'), loadStrokes(glyphChars(sheet))])
  const bytes = await buildDocx(sheet, o, pngRenderer(strokes))
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: DOCX_TYPE })
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** iPhone / iPad (kể cả iPadOS báo là Mac): không in được PDF trong iframe → dùng bảng chia sẻ. */
export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export function canShareFile(file: File): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

/** Bảng chia sẻ (Lưu vào Tệp, In AirPrint…). Phải gọi ngay trong thao tác bấm của người dùng. */
export async function shareFile(file: File, title: string): Promise<'shared' | 'cancelled'> {
  try {
    await navigator.share({ files: [file], title })
    return 'shared'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    throw e
  }
}

let printFrame: HTMLIFrameElement | null = null

/** Mở hộp thoại in của trình duyệt cho file PDF (iframe ẩn); trình duyệt chặn thì mở PDF ở tab mới. */
export function printPdf(blob: Blob) {
  printFrame?.remove()
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.title = 'In phiếu luyện viết'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none'
  frame.onload = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } catch {
      window.open(url, '_blank', 'noopener')
    }
  }
  frame.src = url
  document.body.appendChild(frame)
  printFrame = frame
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

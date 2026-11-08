/**
 * Chữ Hán không có trong kanji.json (ví dụ chọn từ bảng vẽ tay) vẫn lưu được vào sổ tay:
 * ref `ch-<mã Unicode hex>`, ví dụ 璃 → `ch-7483`. Không có file dữ liệu riêng, không vào lịch ôn.
 */
const CHAR_REF = /^ch-([0-9a-f]{4,6})$/

export const charRef = (ch: string): string => `ch-${(ch.codePointAt(0) ?? 0).toString(16)}`

export function charOfRef(ref: string): string | null {
  const m = CHAR_REF.exec(ref)
  if (!m) return null
  const cp = parseInt(m[1], 16)
  return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : null
}

export const isCharRef = (ref: string) => charOfRef(ref) !== null

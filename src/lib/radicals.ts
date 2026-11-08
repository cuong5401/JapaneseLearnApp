import type { RadicalEntry, RadicalItem } from '../types'

/**
 * Bộ thủ trong radicals.json không có trường id: dùng `rd-<số bộ 3 chữ số>` (rd-001 … rd-214)
 * làm id cho thẻ SRS, sổ tay và ngăn xếp chi tiết.
 */
export const RADICAL_ID = /^rd-(\d{3})$/

export const radicalId = (no: number) => `rd-${String(no).padStart(3, '0')}`

export function radicalNo(id: string): number | null {
  const m = RADICAL_ID.exec(id)
  return m ? Number(m[1]) : null
}

const cache = new WeakMap<readonly RadicalEntry[], RadicalItem[]>()

/** Gắn id cho danh sách bộ thủ (dựng một lần cho mỗi mảng dữ liệu). */
export function withRadicalIds(list: readonly RadicalEntry[]): RadicalItem[] {
  let out = cache.get(list)
  if (!out) {
    out = list.map((r) => ({ ...r, id: radicalId(r.no) }))
    cache.set(list, out)
  }
  return out
}

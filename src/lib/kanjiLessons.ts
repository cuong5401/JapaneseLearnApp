import { LEVELS, type KanjiEntry } from '../types'

/** Lọc chữ Hán theo cấp xuất hiện (dùng chung trang Chữ Hán và Luyện viết để chia bài giống nhau). */
export type KanjiLevelFilter = 'all' | (typeof LEVELS)[number] | 'none'

export const KANJI_LEVEL_OPTIONS: { value: KanjiLevelFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  ...LEVELS.map((l) => ({ value: l, label: `Từ ${l}` })),
  { value: 'none', label: 'Chỉ trong từ ghép' },
]

export const isKanjiLevel = (v: string | null): v is KanjiLevelFilter => KANJI_LEVEL_OPTIONS.some((o) => o.value === v)

/** Chữ thuộc cấp, xếp theo số từ chứa chữ (nhiều trước). */
export function filterByLevel(list: readonly KanjiEntry[], level: KanjiLevelFilter): KanjiEntry[] {
  const out = level === 'all' ? list : list.filter((k) => (level === 'none' ? k.firstLevel === null : k.firstLevel === level))
  return [...out].sort((a, b) => b.wordCount - a.wordCount)
}

/** Nhãn ngắn của cấp cho tiêu đề phiếu / tên file. */
export const KANJI_LEVEL_SHORT: Record<KanjiLevelFilter, string> = {
  all: 'Tất cả',
  N5: 'N5',
  N4: 'N4',
  N3: 'N3',
  N2: 'N2',
  N1: 'N1',
  none: 'Từ ghép',
}

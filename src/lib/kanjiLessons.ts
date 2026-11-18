import { LEVELS, type KanjiEntry } from '../types'
import { t } from '../i18n'

/** Lọc chữ Hán theo cấp xuất hiện (dùng chung trang Chữ Hán và Luyện viết để chia bài giống nhau). */
export type KanjiLevelFilter = 'all' | (typeof LEVELS)[number] | 'none'

export const KANJI_LEVEL_OPTIONS: { value: KanjiLevelFilter; label: string }[] = [
  { value: 'all', get label() {
    return t('common.tatCa')
  } },
  ...LEVELS.map((l) => ({ value: l, get label() {
    return t('kanjiLessons.tu', { l })
  } })),
  { value: 'none', get label() {
    return t('kanjiLessons.chiTrongTuGhep')
  } },
]

export const isKanjiLevel = (v: string | null): v is KanjiLevelFilter => KANJI_LEVEL_OPTIONS.some((o) => o.value === v)

/** Chữ thuộc cấp, xếp theo số từ chứa chữ (nhiều trước). */
export function filterByLevel(list: readonly KanjiEntry[], level: KanjiLevelFilter): KanjiEntry[] {
  const out = level === 'all' ? list : list.filter((k) => (level === 'none' ? k.firstLevel === null : k.firstLevel === level))
  return [...out].sort((a, b) => b.wordCount - a.wordCount)
}

/** Nhãn ngắn của cấp cho tiêu đề phiếu / tên file. */
export const KANJI_LEVEL_SHORT: Record<KanjiLevelFilter, string> = {
  get all() {
    return t('common.tatCa')
  },
  N5: 'N5',
  N4: 'N4',
  N3: 'N3',
  N2: 'N2',
  N1: 'N1',
  get none() {
    return t('kanjiLessons.tuGhep')
  },
}

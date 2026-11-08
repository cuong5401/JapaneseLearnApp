import type { KanaLevel } from '../../lib/kanaProgress'

/** Màu ô theo mức thuộc (biến màu Aizome, đổi theo theme). */
export const LEVEL_CELL: Record<KanaLevel, string> = {
  new: 'border-line bg-surface',
  learning: 'border-kihada/70 bg-kihada-soft',
  mastered: 'border-matsu/60 bg-matsu-soft',
}

export const LEVEL_LABEL: Record<KanaLevel, string> = {
  new: 'Chưa học',
  learning: 'Đang học',
  mastered: 'Đã thuộc',
}

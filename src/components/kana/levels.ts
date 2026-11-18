import type { KanaLevel } from '../../lib/kanaProgress'
import { t } from '../../i18n'

/** Màu ô theo mức thuộc (biến màu Aizome, đổi theo theme). */
export const LEVEL_CELL: Record<KanaLevel, string> = {
  new: 'border-line bg-surface',
  learning: 'border-kihada/70 bg-kihada-soft',
  mastered: 'border-matsu/60 bg-matsu-soft',
}

export const LEVEL_LABEL: Record<KanaLevel, string> = {
  get new() {
    return t('common.chuaHoc')
  },
  get learning() {
    return t('common.dangHoc')
  },
  get mastered() {
    return t('common.daThuoc')
  },
}

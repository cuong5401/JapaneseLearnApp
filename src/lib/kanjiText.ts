import type { KanjiEntry } from '../types'
import { t } from '../i18n'

/** "Xuất hiện từ N5…": cấp đầu tiên chữ xuất hiện trong bộ từ vựng (không phải cấp kanji JLPT chính thức). */
export function levelNote(k: KanjiEntry) {
  return k.firstLevel ? t('kanjiText.xuatHienTuTrong', { firstLevel: k.firstLevel }) : t('kanjiText.chiXuatHienTrong')
}

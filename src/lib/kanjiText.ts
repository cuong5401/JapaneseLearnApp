import type { KanjiEntry } from '../types'

/** "Xuất hiện từ N5…": cấp đầu tiên chữ xuất hiện trong bộ từ vựng (không phải cấp kanji JLPT chính thức). */
export function levelNote(k: KanjiEntry) {
  return k.firstLevel ? `Xuất hiện từ ${k.firstLevel} trong bộ từ vựng của bạn` : 'Chỉ xuất hiện trong từ ghép'
}

import { useMemo } from 'react'
import { KANA } from '../data/kana'
import { PUBLIC_BUILD, publicGrammarNote } from '../lib/edition'
import { kanaLevel, useKanaStats } from '../lib/kanaProgress'
import { parseCounterRef } from '../lib/counters'
import type { DataManifest } from '../types'
import { useCards, usePrefixStats, type DeckStats } from './useProgress'
import { t } from '../i18n'

/** Tiến độ ngữ pháp gộp mọi cấp (thẻ gn5-…gn1-), tổng số mẫu lấy từ manifest. */
export function useGrammarStats(m?: DataManifest): DeckStats & { line: string } {
  const total = m?.files.filter((f) => f.kind === 'grammar').reduce((n, f) => n + f.count, 0)
  const s = usePrefixStats('gn\\d', total ?? 0)
  const line = PUBLIC_BUILD ? publicGrammarNote() : total === undefined ? '…' : t('useStudyStats.mau', { learned: s.learned, total })
  return { ...s, line }
}

/** Kana (hiragana + katakana): đã luyện / đã thuộc theo kho riêng kanaProgress. */
export function useKanaSummary(): { total: number; learned: number; mastered: number } {
  const stats = useKanaStats()
  return useMemo(() => {
    let learned = 0
    let mastered = 0
    for (const k of KANA) {
      const lv = kanaLevel(stats[k.id])
      if (lv !== 'new') learned++
      if (lv === 'mastered') mastered++
    }
    return { total: KANA.length, learned, mastered }
  }, [stats])
}

/**
 * Cách đếm: số trợ số từ đã luyện (có ít nhất một thẻ ôn ct-<id>-<số> hoặc ct-<id>) và số ô đang trong lịch ôn.
 * Tổng số trợ số từ lấy từ manifest (không cần tải counters.json).
 */
export function useCounterSummary(m?: DataManifest): { total?: number; counters: number; cells: number; line: string } {
  const cards = useCards()
  const total = m?.files.find((f) => f.path === 'counters.json')?.count
  return useMemo(() => {
    const ids = new Set<string>()
    let cells = 0
    for (const id in cards) {
      const ref = parseCounterRef(id)
      if (!ref) continue
      ids.add(ref.id)
      if (ref.n) cells++
    }
    const line = ids.size > 0 ? t('useStudyStats.troSoTuO', { size: ids.size, cells }) : total !== undefined ? t('useStudyStats.troSoTu', { total }) : '…'
    return { total, counters: ids.size, cells, line }
  }, [cards, total])
}

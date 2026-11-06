import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { progress } from '../lib/progress'
import { isDue, isMastered } from '../lib/srs'
import { isCurrentId } from '../data'

export function useCards() {
  return useSyncExternalStore(progress.subscribe, progress.getSnapshot)
}

/** Thời điểm hiện tại, cập nhật mỗi phút để thẻ đến hạn tự xuất hiện. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export interface DeckStats {
  total: number
  learned: number
  mastered: number
  due: number
}

export function useStats(ids: string[]): DeckStats {
  const cards = useCards()
  const now = useNow()
  return useMemo(() => {
    let learned = 0
    let mastered = 0
    let due = 0
    for (const id of ids) {
      const c = cards[id]
      if (!c) continue
      learned++
      if (isMastered(c)) mastered++
      if (isDue(c, now)) due++
    }
    return { total: ids.length, learned, mastered, due }
  }, [cards, ids, now])
}

/**
 * ID các thẻ đến hạn, thẻ quá hạn lâu nhất đứng trước.
 * Bỏ qua thẻ của bộ dữ liệu mẫu cũ (ID không còn tồn tại) để số trên huy hiệu khớp với trang Ôn tập.
 */
export function useDueIds(): string[] {
  const cards = useCards()
  const now = useNow()
  return useMemo(
    () =>
      Object.values(cards)
        .filter((c) => isCurrentId(c.id) && isDue(c, now))
        .sort((a, b) => a.due - b.due)
        .map((c) => c.id),
    [cards, now],
  )
}

/**
 * Tiến độ của một bộ tính theo tiền tố ID (n5-, cp-, kj-, gn4-…) mà không cần tải dữ liệu bộ đó.
 * `total` lấy từ manifest; `idPattern` là phần sau dấu gạch (mặc định 8 ký tự hex).
 */
export function usePrefixStats(prefix: string, total: number, idPattern = '[0-9a-f]{8}'): DeckStats {
  const cards = useCards()
  const now = useNow()
  return useMemo(() => {
    const re = new RegExp('^' + prefix + '-' + idPattern + '$')
    let learned = 0
    let mastered = 0
    let due = 0
    for (const c of Object.values(cards)) {
      if (!re.test(c.id)) continue
      learned++
      if (isMastered(c)) mastered++
      if (isDue(c, now)) due++
    }
    return { total, learned: Math.min(learned, total), mastered: Math.min(mastered, total), due }
  }, [cards, now, prefix, total, idPattern])
}

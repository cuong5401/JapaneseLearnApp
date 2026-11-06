import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { progress } from '../lib/progress'
import { isDue, isMastered } from '../lib/srs'

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

/** ID các thẻ đến hạn, thẻ quá hạn lâu nhất đứng trước. */
export function useDueIds(): string[] {
  const cards = useCards()
  const now = useNow()
  return useMemo(
    () =>
      Object.values(cards)
        .filter((c) => isDue(c, now))
        .sort((a, b) => a.due - b.due)
        .map((c) => c.id),
    [cards, now],
  )
}

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { progress } from '../lib/progress'
import { buildQueue, nextDue, type QueueInfo } from '../lib/reviewQueue'
import { useReviewLog } from '../lib/reviewLog'
import { isDue, isMastered } from '../lib/srs'
import { useSrsSettings } from '../lib/srsSettings'
import { isCurrentId } from '../data'

export function useCards() {
  return useSyncExternalStore(progress.subscribe, progress.getSnapshot)
}

/** Gọi `tick` mỗi `intervalMs` và khi app quay lại foreground. */
function useTicker(tick: () => void, intervalMs: number) {
  useEffect(() => {
    const t = setInterval(tick, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tick, intervalMs])
}

const stamp = () => Date.now()

/** Thời điểm hiện tại, cập nhật mỗi `intervalMs` (mặc định 1 phút) và khi app quay lại foreground. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(stamp)
  const tick = useMemo(() => () => setNow(Date.now()), [])
  useTicker(tick, intervalMs)
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
 * Hàng đợi ôn (src/lib/reviewQueue.ts): thẻ đang học đến hạn, thẻ ôn tập đến hạn (khả năng nhớ thấp trước),
 * thẻ mới — theo giới hạn mỗi ngày. Tự cập nhật khi có thẻ vừa đến hạn (theo phút) và khi app quay lại.
 * Bỏ qua thẻ của bộ dữ liệu mẫu cũ (ID không còn tồn tại) để huy hiệu khớp với trang Ôn tập.
 */
export function useReviewQueue(intervalMs = 60_000): QueueInfo & { now: number } {
  const cards = useCards()
  const logs = useReviewLog()
  const settings = useSrsSettings()
  const [now, setNow] = useState(stamp)
  const tick = useMemo(() => () => setNow(Date.now()), [])
  useTicker(tick, intervalMs)
  // Hẹn giờ đúng lúc thẻ sớm nhất đến hạn (bước học 1 phút, 10 phút…) để nó hiện ngay, không chờ vòng 1 phút.
  const upcoming = useMemo(() => nextDue(cards, now, isCurrentId)?.due ?? null, [cards, now])
  useEffect(() => {
    if (upcoming === null) return
    const wait = upcoming - Date.now()
    if (wait > 6 * 3600_000) return
    const t = setTimeout(tick, Math.max(0, wait) + 50)
    return () => clearTimeout(t)
  }, [upcoming, tick])
  const q = useMemo(() => buildQueue(cards, logs, now, settings, isCurrentId), [cards, logs, now, settings])
  return { ...q, now }
}

/** Id cần ôn ngay (số trên huy hiệu bottom nav / sidebar / trang chủ). */
export function useDueIds(): string[] {
  return useReviewQueue().ids
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

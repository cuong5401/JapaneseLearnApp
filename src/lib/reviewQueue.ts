import type { SrsCard } from '../types'
import { todayCounts, type ReviewEntry } from './reviewLog'
import { retrievability, STATE } from './srs'
import type { SrsSettings } from './srsSettings'

/** Thẻ sắp đến hạn trong khoảng này vẫn tính là "trong phiên" (màn đếm ngược ở trang Ôn tập). */
export const LEARN_AHEAD_MS = 20 * 60_000

export interface QueueInfo {
  /** Id cần ôn ngay, theo thứ tự ôn */
  ids: string[]
  /** Thẻ Mới còn chờ vì đã đủ giới hạn ngày */
  newWaiting: number
  /** Thẻ Ôn tập đến hạn còn chờ vì đã đủ giới hạn ngày */
  reviewWaiting: number
}

/**
 * Hàng đợi ôn:
 *  1. thẻ Đang học / Học lại đến hạn (theo due),
 *  2. thẻ Ôn tập đến hạn, khả năng nhớ (retrievability) thấp nhất trước, tối đa lượt ôn còn lại trong ngày,
 *  3. thẻ Mới, tối đa số thẻ mới còn lại trong ngày.
 * `keep` lọc id còn dùng được (bỏ thẻ của dữ liệu cũ).
 */
export function buildQueue(
  cards: Record<string, SrsCard>,
  logs: readonly ReviewEntry[],
  now: number,
  settings: SrsSettings,
  keep: (id: string) => boolean = () => true,
): QueueInfo {
  const learning: SrsCard[] = []
  const review: SrsCard[] = []
  const fresh: SrsCard[] = []
  for (const c of Object.values(cards)) {
    if (!keep(c.id)) continue
    if (c.state === STATE.new) fresh.push(c)
    else if (c.due <= now) (c.state === STATE.review ? review : learning).push(c)
  }
  learning.sort((a, b) => a.due - b.due)
  const r = new Map(review.map((c) => [c.id, retrievability(c, now, settings)]))
  review.sort((a, b) => r.get(a.id)! - r.get(b.id)! || a.due - b.due)
  // thẻ Mới: thứ tự đưa vào lịch (due = lúc đánh dấu), id để ổn định
  fresh.sort((a, b) => a.due - b.due || (a.id < b.id ? -1 : 1))
  const done = todayCounts(logs, now)
  const reviewLeft = Math.max(0, settings.reviewsPerDay - done.reviews)
  const newLeft = Math.max(0, settings.newPerDay - done.newCards)
  return {
    ids: [...learning, ...review.slice(0, reviewLeft), ...fresh.slice(0, newLeft)].map((c) => c.id),
    newWaiting: Math.max(0, fresh.length - newLeft),
    reviewWaiting: Math.max(0, review.length - reviewLeft),
  }
}

/** Thẻ (không phải Mới) đến hạn sớm nhất sau `now`. */
export function nextDue(cards: Record<string, SrsCard>, now: number, keep: (id: string) => boolean = () => true): SrsCard | null {
  let best: SrsCard | null = null
  for (const c of Object.values(cards)) {
    if (c.state === STATE.new || c.due <= now || !keep(c.id)) continue
    if (!best || c.due < best.due) best = c
  }
  return best
}

/** Số thẻ theo trạng thái. */
export function stateCounts(cards: readonly SrsCard[]) {
  const out = { new: 0, learning: 0, review: 0, relearning: 0 }
  for (const c of cards) {
    if (c.state === STATE.new) out.new++
    else if (c.state === STATE.learning) out.learning++
    else if (c.state === STATE.review) out.review++
    else out.relearning++
  }
  return out
}

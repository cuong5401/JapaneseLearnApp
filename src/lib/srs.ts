import type { Quality, SrsCard } from '../types'

const DAY = 24 * 60 * 60 * 1000

/** Số ngày giãn cách từ đó coi là "đã thuộc". */
export const MASTERED_INTERVAL = 21

export function newCard(id: string, now = Date.now()): SrsCard {
  return { id, ease: 2.5, interval: 0, repetitions: 0, due: now, lastReviewed: 0 }
}

/** Hệ số nhân thêm theo mức đánh giá, để Khó / Nhớ / Dễ cho khoảng cách khác nhau ngay. */
const GRADE_FACTOR: Partial<Record<Quality, number>> = { 3: 0.7, 4: 1, 5: 1.4 }

/**
 * SM-2 rút gọn: trả về thẻ mới sau khi chấm điểm `q` (0–5).
 * Khác bản gốc ở chỗ hệ số dễ mới được áp dụng ngay và có thêm GRADE_FACTOR.
 */
export function review(card: SrsCard, q: Quality, now = Date.now()): SrsCard {
  const ease = Math.max(1.3, card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  let interval: number
  let repetitions: number

  if (q < 3) {
    repetitions = 0
    interval = 1
  } else {
    const factor = GRADE_FACTOR[q] ?? 1
    if (card.repetitions === 0) interval = q === 5 ? 3 : 1
    else if (card.repetitions === 1) interval = Math.round(6 * factor)
    else interval = Math.round(card.interval * ease * factor)
    // Nhớ hoặc Dễ thì không bao giờ ôn sớm hơn lần trước.
    if (q >= 4) interval = Math.max(interval, card.interval + 1)
    interval = Math.max(1, interval)
    repetitions = card.repetitions + 1
  }

  return {
    ...card,
    ease: Math.round(ease * 100) / 100,
    interval,
    repetitions,
    due: now + interval * DAY,
    lastReviewed: now,
  }
}

export const isDue = (card: SrsCard, now = Date.now()) => card.due <= now
export const isMastered = (card: SrsCard) => card.interval >= MASTERED_INTERVAL

export function formatInterval(days: number): string {
  if (days < 1) return 'hôm nay'
  if (days < 30) return `${days} ngày`
  if (days < 365) return `${Math.round(days / 30)} tháng`
  return `${Math.round((days / 365) * 10) / 10} năm`
}

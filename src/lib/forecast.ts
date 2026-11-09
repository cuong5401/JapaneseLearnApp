import type { SrsCard } from '../types'

const DAY = 24 * 60 * 60 * 1000

/**
 * Số thẻ đến hạn trong `days` ngày tới, theo ngày lịch ở múi giờ máy. Ngày 0 gồm cả thẻ quá hạn.
 * Chỉ dựa trên `due` của thẻ, không cần lưu lịch sử ôn.
 */
export function dueForecast(cards: readonly SrsCard[], now: number, days = 7): number[] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const out = Array.from({ length: days }, () => 0)
  for (const c of cards) {
    const i = Math.max(0, Math.floor((c.due - start.getTime()) / DAY))
    if (i < days) out[i]++
  }
  return out
}

/** Nhãn ngày ngắn: "Nay", "Mai", rồi thứ (T2…CN). */
export function forecastLabels(now: number, days = 7): string[] {
  const names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return Array.from({ length: days }, (_, i) => (i === 0 ? 'Nay' : i === 1 ? 'Mai' : names[new Date(now + i * DAY).getDay()]))
}

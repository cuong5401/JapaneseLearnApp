import { describe, expect, it } from 'vitest'
import type { ReviewEntry } from './reviewLog'
import { buildQueue, nextDue, stateCounts } from './reviewQueue'
import { SRS_DEFAULTS } from './srsSettings'
import { fsrsCard } from './testCards'

const DAY = 86_400_000
const NOW = new Date(2026, 10, 9, 15, 0).getTime()
const S = { ...SRS_DEFAULTS, fuzz: false }
const fresh = (id: string, i = 0) => fsrsCard(id, { state: 0, stability: 0, difficulty: 0, scheduled_days: 0, reps: 0, due: NOW - 1000 + i })
const log = (id: string, state: ReviewEntry['state'], at = NOW - 3600_000): ReviewEntry => ({ id, at, rating: 3, state, elapsed_days: 0, scheduled_days: 1 })

describe('hàng đợi ôn', () => {
  it('thứ tự: đang học → ôn tập (khả năng nhớ thấp trước) → thẻ mới', () => {
    const cards = {
      learn: fsrsCard('learn', { state: 1, due: NOW - 60_000 }),
      weak: fsrsCard('weak', { stability: 2, last_review: NOW - 10 * DAY, due: NOW - 8 * DAY }),
      strong: fsrsCard('strong', { stability: 50, last_review: NOW - 20 * DAY, due: NOW - DAY }),
      later: fsrsCard('later', { due: NOW + DAY }),
      n1: fresh('n1'),
    }
    expect(buildQueue(cards, [], NOW, S).ids).toEqual(['learn', 'weak', 'strong', 'n1'])
  })

  it('giới hạn thẻ mới mỗi ngày (tính cả thẻ mới đã học hôm nay)', () => {
    const cards = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`n${i}`, fresh(`n${i}`, i)]))
    const q = buildQueue(cards, [], NOW, { ...S, newPerDay: 20 })
    expect(q.ids).toHaveLength(20)
    expect(q.newWaiting).toBe(10)
    // hôm nay đã học 5 thẻ mới → còn 15
    const logs = Array.from({ length: 5 }, (_, i) => log(`old${i}`, 0))
    expect(buildQueue(cards, logs, NOW, { ...S, newPerDay: 20 }).ids).toHaveLength(15)
    // lượt hôm qua không tính
    expect(buildQueue(cards, [log('x', 0, NOW - 2 * DAY)], NOW, { ...S, newPerDay: 20 }).ids).toHaveLength(20)
  })

  it('giới hạn lượt ôn mỗi ngày; thẻ đang học không bị giới hạn', () => {
    const cards = {
      ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`r${i}`, fsrsCard(`r${i}`, { due: NOW - DAY, last_review: NOW - 2 * DAY })])),
      l: fsrsCard('l', { state: 3, due: NOW - 1000 }),
    }
    const logs = Array.from({ length: 7 }, (_, i) => log(`done${i}`, 2))
    const q = buildQueue(cards, logs, NOW, { ...S, reviewsPerDay: 10 })
    expect(q.ids.filter((x) => x.startsWith('r'))).toHaveLength(3)
    expect(q.ids[0]).toBe('l')
    expect(q.reviewWaiting).toBe(7)
  })

  it('lọc id không còn dùng', () => {
    const cards = { a: fresh('a'), old: fresh('old') }
    expect(buildQueue(cards, [], NOW, S, (id) => id !== 'old').ids).toEqual(['a'])
  })

  it('thẻ sắp đến hạn sớm nhất (bỏ thẻ mới và thẻ đã đến hạn)', () => {
    const cards = { a: fsrsCard('a', { state: 1, due: NOW + 5 * 60_000 }), b: fsrsCard('b', { due: NOW + 60_000 }), c: fsrsCard('c', { due: NOW - 1 }), n: fresh('n') }
    expect(nextDue(cards, NOW)?.id).toBe('b')
    expect(nextDue({}, NOW)).toBeNull()
  })

  it('đếm thẻ theo trạng thái', () => {
    expect(stateCounts([fresh('a'), fsrsCard('b', { state: 1 }), fsrsCard('c'), fsrsCard('d'), fsrsCard('e', { state: 3 })])).toEqual({ new: 1, learning: 1, review: 2, relearning: 1 })
  })
})

import { describe, expect, it } from 'vitest'
import { GRADE, STATE, flashcardGrade, formatDelay, newCard, preview, quizGrade, review, type SchedulerSettings } from './srs'
import { fsrsCard } from './testCards'

const MIN = 60_000
const DAY = 86_400_000
/** Tắt fuzz, cố định thời gian để kết quả lặp lại được */
const S: SchedulerSettings = { retention: 0.9, maxInterval: 365, fuzz: false }
const T0 = new Date(2026, 10, 9, 9, 0).getTime()

describe('FSRS (ts-fsrs)', () => {
  it('thẻ mới chấm Nhớ → bước học 10 phút; Nhớ tiếp → sang Ôn tập (≥ 1 ngày)', () => {
    const a = review(newCard('n5-1', T0), GRADE.good, T0, S).card
    expect(a.state).toBe(STATE.learning)
    expect(a.due - T0).toBe(10 * MIN)
    expect(a.reps).toBe(1)
    const b = review(a, GRADE.good, a.due, S).card
    expect(b.state).toBe(STATE.review)
    expect(b.due - a.due).toBeGreaterThanOrEqual(DAY)
    expect(b.last_review).toBe(a.due)
  })

  it('thẻ mới chấm Quên → bước học 1 phút', () => {
    const a = review(newCard('n5-1', T0), GRADE.again, T0, S).card
    expect(a.state).toBe(STATE.learning)
    expect(a.due - T0).toBe(MIN)
  })

  it('Quên ở thẻ Ôn tập → lapses + 1, vào Học lại (10 phút)', () => {
    const c = fsrsCard('kj-1', { stability: 20, difficulty: 5, scheduled_days: 20, last_review: T0 - 20 * DAY, due: T0, reps: 5 })
    const r = review(c, GRADE.again, T0, S).card
    expect(r.lapses).toBe(1)
    expect(r.state).toBe(STATE.relearning)
    expect(r.due - T0).toBe(10 * MIN)
  })

  it('mức ghi nhớ mong muốn cao hơn → khoảng cách ngắn hơn', () => {
    const c = fsrsCard('kj-1', { stability: 20, difficulty: 5, scheduled_days: 20, last_review: T0 - 20 * DAY, due: T0, reps: 5 })
    const hi = review(c, GRADE.good, T0, { ...S, retention: 0.95 }).card.scheduled_days
    const lo = review(c, GRADE.good, T0, { ...S, retention: 0.85 }).card.scheduled_days
    expect(hi).toBeLessThan(lo)
  })

  it('khoảng cách tối đa được tôn trọng', () => {
    const c = fsrsCard('kj-1', { stability: 900, difficulty: 3, scheduled_days: 300, last_review: T0 - 300 * DAY, due: T0, reps: 10 })
    expect(review(c, GRADE.easy, T0, { ...S, maxInterval: 100 }).card.scheduled_days).toBeLessThanOrEqual(100)
  })

  it('xem trước 4 mức chấm: Quên < Khó ≤ Nhớ < Dễ', () => {
    const p = preview(newCard('n5-1', T0), T0, S)
    expect(p[1].due - T0).toBe(MIN)
    expect(p[3].due - T0).toBe(10 * MIN)
    expect(p[1].due).toBeLessThan(p[2].due)
    expect(p[2].due).toBeLessThanOrEqual(p[3].due)
    expect(p[3].due).toBeLessThan(p[4].due)
  })

  it('ánh xạ thao tác → mức chấm', () => {
    expect(flashcardGrade(false)).toBe(GRADE.again)
    expect(flashcardGrade(true)).toBe(GRADE.good)
    expect(quizGrade(false, false)).toBe(GRADE.again)
    expect(quizGrade(false, true)).toBe(GRADE.again)
    expect(quizGrade(true, true)).toBe(GRADE.hard)
    expect(quizGrade(true, false)).toBe(GRADE.good)
  })

  it('định dạng khoảng thời gian tiếng Việt', () => {
    expect(formatDelay(MIN)).toBe('1 phút')
    expect(formatDelay(10 * MIN)).toBe('10 phút')
    expect(formatDelay(3 * 3600_000)).toBe('3 giờ')
    expect(formatDelay(DAY)).toBe('1 ngày')
    expect(formatDelay(4 * DAY)).toBe('4 ngày')
    expect(formatDelay(62 * DAY)).toBe('2 tháng')
    expect(formatDelay(440 * DAY)).toBe('1,2 năm')
  })
})

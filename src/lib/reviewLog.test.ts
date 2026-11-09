import { describe, expect, it } from 'vitest'
import { MAX_LOGS, mergeLogs, pack, retentionRate, sanitizeLog, todayCounts, unpack, type ReviewEntry } from './reviewLog'

const NOW = new Date(2026, 10, 9, 15, 0).getTime()
const e = (id: string, at: number, rating: ReviewEntry['rating'] = 3, state: ReviewEntry['state'] = 2): ReviewEntry => ({ id, at, rating, state, elapsed_days: 3, scheduled_days: 7 })

describe('lịch sử ôn (dạng nén)', () => {
  it('nén / giải nén giữ nguyên dữ liệu, id lặp chỉ lưu một lần', () => {
    const list = [e('a', 1000_000), e('b', 2000_000, 1, 0), e('a', 3000_000, 4, 1)]
    const p = pack(list)
    expect(p.ids).toEqual(['a', 'b'])
    expect(p.rows).toHaveLength(18)
    expect(unpack(p)).toEqual(list)
  })

  it(`giữ tối đa ${MAX_LOGS} lượt gần nhất`, () => {
    const list = Array.from({ length: MAX_LOGS + 50 }, (_, i) => e(`x${i % 7}`, (i + 1) * 1000))
    const back = unpack(pack(list))
    expect(back).toHaveLength(MAX_LOGS)
    expect(back[0].at).toBe(51_000)
  })

  it('sanitize bỏ dòng hỏng, sai định dạng thì null', () => {
    expect(sanitizeLog({ v: 2 })).toBeNull()
    const p = sanitizeLog({ v: 1, ids: ['a'], rows: [0, 10, 3, 2, 1, 1, 5, 10, 3, 2, 1, 1, 0, 10, 9, 2, 1, 1] })!
    expect(unpack(p)).toHaveLength(1)
  })

  it('gộp hai lịch sử: bỏ lượt trùng, sắp theo thời gian', () => {
    const a = pack([e('a', 1000_000), e('b', 3000_000)])
    const b = pack([e('a', 1000_000), e('c', 2000_000)])
    expect(unpack(mergeLogs(a, b)).map((x) => x.id)).toEqual(['a', 'c', 'b'])
  })

  it('đếm thẻ mới đã học và lượt ôn trong ngày', () => {
    const list = [e('old', NOW - 2 * 86_400_000, 3, 0), e('n1', NOW - 3600_000, 3, 0), e('n1', NOW - 3000_000, 3, 1), e('n2', NOW - 1000, 1, 0), e('r', NOW - 500, 3, 2)]
    expect(todayCounts(list, NOW)).toEqual({ newCards: 2, reviews: 1 })
  })

  it('tỷ lệ nhớ thực tế 30 ngày: Khó/Nhớ/Dễ ÷ tổng lượt ôn thẻ Ôn tập', () => {
    const list = [e('a', NOW - 1000, 3), e('b', NOW - 2000, 1), e('c', NOW - 3000, 2), e('d', NOW - 4000, 4), e('n', NOW - 5000, 1, 0), e('x', NOW - 40 * 86_400_000, 1)]
    expect(retentionRate(list, NOW)).toEqual({ total: 4, ok: 3, rate: 0.75 })
    expect(retentionRate([], NOW).rate).toBeNull()
  })
})

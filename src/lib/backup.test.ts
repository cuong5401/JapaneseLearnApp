import { describe, expect, it } from 'vitest'
import { backupFileName, createBackup, mergeCards, parseBackup } from './backup'
import { pack, unpack } from './reviewLog'
import { SRS_DEFAULTS } from './srsSettings'
import { fsrsCard } from './testCards'

const DAY = 86_400_000
/** Thẻ FSRS đã ôn lúc `lastReview`, khoảng cách `interval` ngày */
const card = (id: string, lastReview: number, interval = 1) =>
  fsrsCard(id, { last_review: lastReview, scheduled_days: interval, stability: interval, due: lastReview + interval * DAY })
/** Thẻ SM-2 của file tiến độ version 1 */
const sm2 = (id: string, lastReviewed: number, interval = 1) => ({ id, ease: 2.5, interval, repetitions: 1, due: lastReviewed + interval * DAY, lastReviewed })

describe('backup', () => {
  it('xuất rồi đọc lại được đúng dữ liệu (thẻ FSRS, lịch sử ôn, cài đặt)', () => {
    const cards = { 'n5-00000001': card('n5-00000001', 100), 'kj-00000002': card('kj-00000002', 200, 9) }
    const kana = { 'h-ka': { right: 3, wrong: 1, streak: 2, last: 5 } }
    const log = pack([
      { id: 'n5-00000001', at: 100_000, rating: 3, state: 0, elapsed_days: 0, scheduled_days: 0 },
      { id: 'kj-00000002', at: 200_000, rating: 1, state: 2, elapsed_days: 4, scheduled_days: 1 },
    ])
    const settings = { ...SRS_DEFAULTS, retention: 0.85, newPerDay: 10 }
    const text = JSON.stringify(createBackup(cards, 30, kana, new Date('2026-11-08T00:00:00Z'), undefined, undefined, undefined, { reviewLog: log, srsSettings: settings }))
    expect(JSON.parse(text).version).toBe(2)
    const r = parseBackup(text)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.cards).toEqual(cards)
    expect(r.backup.lessonSize).toBe(30)
    expect(r.backup.kana).toEqual(kana)
    expect(unpack(r.backup.reviewLog!)).toEqual(unpack(log))
    expect(r.backup.srsSettings).toEqual(settings)
    expect(r.skipped).toBe(0)
  })

  it('đặt tên file theo ngày', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('kotonoha-tien-do-2026-01-05.json')
  })

  it('báo lỗi khi file sai định dạng', () => {
    expect(parseBackup('không phải json')).toEqual({ ok: false, error: 'File không phải JSON hợp lệ.' })
    expect(parseBackup('{"cards":{}}').ok).toBe(false)
    expect(parseBackup('{"app":"kotonoha","version":9,"cards":{}}').ok).toBe(false)
    expect(parseBackup('{"app":"kotonoha","version":2}').ok).toBe(false)
  })

  it('bỏ qua thẻ hỏng và cỡ bài không hợp lệ', () => {
    const r = parseBackup(
      JSON.stringify({
        app: 'kotonoha',
        version: 2,
        lessonSize: 25,
        cards: { a: card('a', 1), b: { id: 'b', stability: 'x' }, c: card('khác', 1), d: { ...card('d', 1), state: 7 } },
        kana: { 'h-a': { right: 1, wrong: 0, streak: 1, last: 1 }, 'h-i': { right: -1 } },
      }),
    )
    expect(r.ok && Object.keys(r.backup.cards)).toEqual(['a'])
    expect(r.ok && r.skipped).toBe(4)
    expect(r.ok && Object.keys(r.backup.kana ?? {})).toEqual(['h-a'])
    expect(r.ok && r.backup.lessonSize).toBeUndefined()
  })

  it('file cũ version 1 (SM-2): thẻ tự đổi sang FSRS, giữ due và số lượt', () => {
    const r = parseBackup(JSON.stringify({ app: 'kotonoha', version: 1, radicalIds: 'kangxi', cards: { 'n5-1': sm2('n5-1', 5000, 6), bad: { id: 'bad', ease: 'x' } } }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.skipped).toBe(1)
    expect(r.backup.cards['n5-1']).toMatchObject({ state: 2, due: 5000 + 6 * DAY, reps: 1, last_review: 5000, stability: 6 })
  })

  it('gộp: giữ bản ôn gần nhất, thêm thẻ mới, không xóa thẻ đang có', () => {
    const current = { a: card('a', 100, 3), b: card('b', 500, 10), only: card('only', 50) }
    const incoming = { a: card('a', 300, 7), b: card('b', 200, 1), c: card('c', 10) }
    const r = mergeCards(current, incoming)
    expect(r.cards.a.scheduled_days).toBe(7)
    expect(r.cards.b.scheduled_days).toBe(10)
    expect(r.cards.c).toEqual(incoming.c)
    expect(r.cards.only).toEqual(current.only)
    expect(r.added).toBe(1)
    expect(r.updated).toBe(1)
  })
})

describe('backup: id bộ thủ', () => {
  it('file cũ (chưa có radicalIds) được đổi id bộ thủ khi nhập', () => {
    const r = parseBackup(JSON.stringify({ app: 'kotonoha', version: 1, cards: { 'rd-036': sm2('rd-036', 1) },
      notebooks: { books: [{ id: 'default', name: 'Từ khó', color: 'kihada', createdAt: 0, updatedAt: 0 }], items: { default: [{ ref: 'rd-036', addedAt: 1 }] } } }))
    expect(r.ok && Object.keys(r.backup.cards)).toEqual(['rd-037'])
    expect(r.ok && r.backup.notebooks?.items.default[0].ref).toBe('rd-037')
  })

  it('file mới giữ nguyên id', () => {
    const text = JSON.stringify(createBackup({ 'rd-036': card('rd-036', 1) }, 30))
    const r = parseBackup(text)
    expect(r.ok && Object.keys(r.backup.cards)).toEqual(['rd-036'])
  })
})

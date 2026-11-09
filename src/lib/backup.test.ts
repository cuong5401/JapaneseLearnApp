import { describe, expect, it } from 'vitest'
import type { SrsCard } from '../types'
import { backupFileName, createBackup, mergeCards, parseBackup } from './backup'

const card = (id: string, lastReviewed: number, interval = 1): SrsCard => ({
  id,
  ease: 2.5,
  interval,
  repetitions: 1,
  due: lastReviewed + interval * 86_400_000,
  lastReviewed,
})

describe('backup', () => {
  it('xuất rồi đọc lại được đúng dữ liệu', () => {
    const cards = { 'n5-00000001': card('n5-00000001', 100), 'kj-00000002': card('kj-00000002', 200) }
    const kana = { 'h-ka': { right: 3, wrong: 1, streak: 2, last: 5 } }
    const text = JSON.stringify(createBackup(cards, 30, kana, new Date('2026-11-08T00:00:00Z')))
    const r = parseBackup(text)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.cards).toEqual(cards)
    expect(r.backup.lessonSize).toBe(30)
    expect(r.backup.kana).toEqual(kana)
    expect(r.skipped).toBe(0)
  })

  it('đặt tên file theo ngày', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('kotonoha-tien-do-2026-01-05.json')
  })

  it('báo lỗi khi file sai định dạng', () => {
    expect(parseBackup('không phải json')).toEqual({ ok: false, error: 'File không phải JSON hợp lệ.' })
    expect(parseBackup('{"cards":{}}').ok).toBe(false)
    expect(parseBackup('{"app":"kotonoha","version":9,"cards":{}}').ok).toBe(false)
    expect(parseBackup('{"app":"kotonoha","version":1}').ok).toBe(false)
  })

  it('bỏ qua thẻ hỏng và cỡ bài không hợp lệ', () => {
    const r = parseBackup(
      JSON.stringify({
        app: 'kotonoha',
        version: 1,
        lessonSize: 25,
        cards: { a: card('a', 1), b: { id: 'b', ease: 'x' }, c: card('khác', 1) },
        kana: { 'h-a': { right: 1, wrong: 0, streak: 1, last: 1 }, 'h-i': { right: -1 } },
      }),
    )
    expect(r.ok && Object.keys(r.backup.cards)).toEqual(['a'])
    expect(r.ok && r.skipped).toBe(3)
    expect(r.ok && Object.keys(r.backup.kana ?? {})).toEqual(['h-a'])
    expect(r.ok && r.backup.lessonSize).toBeUndefined()
  })

  it('gộp: giữ bản ôn gần nhất, thêm thẻ mới, không xóa thẻ đang có', () => {
    const current = { a: card('a', 100, 3), b: card('b', 500, 10), only: card('only', 50) }
    const incoming = { a: card('a', 300, 7), b: card('b', 200, 1), c: card('c', 10) }
    const r = mergeCards(current, incoming)
    expect(r.cards.a.interval).toBe(7)
    expect(r.cards.b.interval).toBe(10)
    expect(r.cards.c).toEqual(incoming.c)
    expect(r.cards.only).toEqual(current.only)
    expect(r.added).toBe(1)
    expect(r.updated).toBe(1)
  })
})

describe('backup: id bộ thủ', () => {
  it('file cũ (chưa có radicalIds) được đổi id bộ thủ khi nhập', () => {
    const r = parseBackup(JSON.stringify({ app: 'kotonoha', version: 1, cards: { 'rd-036': card('rd-036', 1) },
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

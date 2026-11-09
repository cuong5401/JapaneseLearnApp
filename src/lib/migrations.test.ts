import { describe, expect, it } from 'vitest'
import radicals from '../../public/data/kanji/radicals.json'
import type { SrsCard } from '../types'
import { migrateCards, migrateNotebooks, migrateRadicalId } from './migrations'

const card = (id: string, lastReviewed: number): SrsCard => ({ id, ease: 2.5, interval: 1, repetitions: 1, due: 0, lastReviewed })

describe('bộ thủ theo số Khang Hy', () => {
  it('radicals.json có đủ 214 bộ, đúng số', () => {
    expect(radicals.map((r) => r.no)).toEqual(Array.from({ length: 214 }, (_, i) => i + 1))
    const at = (no: number) => radicals[no - 1].radical
    expect([36, 37, 38, 39, 40].map(at).join('')).toBe('夕大女子宀')
    expect(radicals.every((r) => r.strokes >= 1 && r.strokes <= 17)).toBe(true)
    expect(radicals[8].variants).toContain('亻')
  })

  it('đổi id cũ theo thứ tự dòng sang số Khang Hy', () => {
    expect(migrateRadicalId('rd-036')).toBe('rd-037') // 大 (dòng 36) -> bộ 37
    expect(migrateRadicalId('rd-037')).toBe('rd-036') // 夕
    expect(migrateRadicalId('rd-010')).toBe('rd-009') // 亻 -> 人
    expect(migrateRadicalId('rd-205')).toBe('rd-139') // 色 trùng
    expect(migrateRadicalId('rd-107')).toBeNull() // 匹 không phải bộ thủ
    expect(migrateRadicalId('n5-12345678')).toBe('n5-12345678')
  })

  it('thẻ SRS: đổi khóa + id, hai id cũ cùng một bộ thì giữ thẻ ôn gần nhất', () => {
    const out = migrateCards({
      'rd-009': card('rd-009', 100), // 人
      'rd-010': card('rd-010', 300), // 亻 -> cũng là 人
      'rd-036': card('rd-036', 5),
      'rd-107': card('rd-107', 1),
      'kj-1': card('kj-1', 1),
    })
    expect(Object.keys(out).sort()).toEqual(['kj-1', 'rd-009', 'rd-037'])
    expect(out['rd-009'].lastReviewed).toBe(300)
    expect(out['rd-009'].id).toBe('rd-009')
    expect(out['rd-037'].id).toBe('rd-037')
  })

  it('sổ tay: đổi ref, bỏ trùng và bỏ mục không còn', () => {
    const s = migrateNotebooks({
      books: [],
      items: { a: [{ ref: 'rd-036', addedAt: 1 }, { ref: 'rd-037', addedAt: 2 }, { ref: 'rd-009', addedAt: 3 }, { ref: 'rd-010', addedAt: 4 }, { ref: 'rd-204', addedAt: 5 }] },
    })
    expect(s.items.a.map((i) => i.ref)).toEqual(['rd-037', 'rd-036', 'rd-009'])
  })
})

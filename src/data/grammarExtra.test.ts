import { describe, expect, it } from 'vitest'
import n3Extra from '../../data-source/grammar-extra/n3.json'
import n5Extra from '../../data-source/grammar-extra/n5.json'
import n3Out from '../../public/data/grammar/n3.json'
import n5Out from '../../public/data/grammar/n5.json'
import { GRAMMAR_GROUPS } from '../lib/grammarGroups'
import type { GrammarEntry } from '../types'

/**
 * Ngữ pháp tự soạn (data-source/grammar-extra) — kiểm tra lại ở phía web những gì scripts/convert_xlsx.py đã kiểm:
 * đúng kiểu, không trùng tiêu đề, đủ ví dụ có câu dịch, nhóm hợp lệ; file sinh ra có mục Excel đứng trước.
 */
const SOURCES = [
  { level: 'N3', extra: n3Extra, out: n3Out as GrammarEntry[] },
  { level: 'N5', extra: n5Extra, out: n5Out as GrammarEntry[] },
] as const

const KEYS = new Set(['title', 'group', 'meaning', 'connection', 'examples', 'notes', 'related', 'source', 'auto'])

describe.each(SOURCES)('ngữ pháp tự soạn $level', ({ level, extra, out }) => {
  it('mỗi mục đúng kiểu, có 3–4 ví dụ kèm câu dịch, nhóm hợp lệ', () => {
    expect(extra.length).toBeGreaterThan(0)
    for (const it of extra as Record<string, unknown>[]) {
      const where = String(it.title)
      for (const k of Object.keys(it)) expect(KEYS.has(k), `${where}: trường lạ ${k}`).toBe(true)
      for (const k of ['title', 'group', 'meaning', 'connection'] as const) expect(typeof it[k] === 'string' && (it[k] as string).trim(), `${where}: ${k}`).toBeTruthy()
      expect(GRAMMAR_GROUPS[level]).toContain(it.group)
      expect(it.source).toBe('kotonoha')
      expect(it.auto).toBe(true)
      const ex = it.examples as { ja: string; vi: string }[]
      expect(ex.length, where).toBeGreaterThanOrEqual(3)
      expect(ex.length, where).toBeLessThanOrEqual(4)
      for (const e of ex) {
        expect(e.ja.trim(), where).toBeTruthy()
        expect(e.vi.trim(), where).toBeTruthy()
      }
      expect((it.notes as string[]).length, where).toBeGreaterThan(0)
    }
  })

  it('không trùng tiêu đề trong cùng cấp', () => {
    const titles = extra.map((x) => x.title.replace(/[～〜\s]/g, ''))
    expect(new Set(titles).size).toBe(titles.length)
    const all = out.map((g) => g.title)
    expect(new Set(all).size).toBe(all.length)
  })

  it('file sinh ra: mục Excel trước, mục tự soạn sau; id không trùng; related trỏ đúng', () => {
    const firstAuto = out.findIndex((g) => g.auto)
    expect(out.slice(firstAuto).every((g) => g.auto && g.source === 'kotonoha')).toBe(true)
    expect(out.filter((g) => g.auto)).toHaveLength(extra.length)
    const ids = new Set(out.map((g) => g.id))
    expect(ids.size).toBe(out.length)
    for (const g of out) for (const r of g.related ?? []) expect(ids.has(r), `${g.title} → ${r}`).toBe(true)
  })
})

describe('N3 từ Excel', () => {
  it('đủ 55 chương, giữ id 12 chương cũ, mọi chương có nhóm', () => {
    const excel = (n3Out as GrammarEntry[]).filter((g) => !g.auto)
    expect(excel).toHaveLength(55)
    expect(excel.map((g) => g.no)).toEqual(Array.from({ length: 55 }, (_, i) => i + 1))
    for (const id of ['gn3-4343c3ca', 'gn3-02259711', 'gn3-9ea19570', 'gn3-50652c80', 'gn3-863fbda2']) expect(excel.some((g) => g.id === id)).toBe(true)
    expect(excel.every((g) => g.group && GRAMMAR_GROUPS.N3.includes(g.group))).toBe(true)
  })
})

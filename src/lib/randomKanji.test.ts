import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { KanjiEntry } from '../types'
import { RECENT_LIMIT, addRecent, kanjiPool, pickRandom } from './randomKanji'

const index = JSON.parse(readFileSync(new URL('../../public/data/kanji/kanji.json', import.meta.url), 'utf8')) as KanjiEntry[]

/** RNG có hạt giống (mulberry32) để test lặp lại được. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('kanjiPool', () => {
  it('chỉ gồm chữ có firstLevel (bỏ chữ chỉ có trong từ ghép)', () => {
    const pool = kanjiPool(index)
    expect(pool.length).toBeGreaterThan(1000)
    expect(pool.every((k) => k.firstLevel !== null)).toBe(true)
    expect(pool.length).toBe(index.filter((k) => k.firstLevel).length)
  })

  it('mọi chữ trong pool đều có ít nhất 1 từ đi kèm trong dữ liệu', () => {
    expect(kanjiPool(index).every((k) => k.words.length >= 1)).toBe(true)
  })
})

describe('pickRandom', () => {
  it('không trùng 5 chữ vừa hiện, qua 500 lần chọn liên tiếp', () => {
    const pool = kanjiPool(index)
    const rng = seeded(42)
    let recent: string[] = []
    for (let i = 0; i < 500; i++) {
      const k = pickRandom(pool, recent, rng)!
      expect(recent).not.toContain(k.id)
      recent = addRecent(recent, k.id)
    }
  })

  it('pool nhỏ: tránh 5 chữ gần nhất khi đủ, nếu không thì chỉ tránh chữ vừa hiện', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }))
    expect(pickRandom(pool, ['a', 'b', 'c', 'd', 'e'], seeded(1))?.id).toBe('f')
    const tiny = [{ id: 'a' }, { id: 'b' }]
    for (let i = 0; i < 20; i++) expect(pickRandom(tiny, ['a', 'b'], seeded(i))?.id).toBe('a')
    expect(pickRandom([{ id: 'x' }], ['x'])?.id).toBe('x')
    expect(pickRandom([], [])).toBeUndefined()
  })

  it('rng = 0.9999… vẫn trả phần tử hợp lệ', () => {
    expect(pickRandom([{ id: 'a' }, { id: 'b' }], [], () => 0.9999999999)?.id).toBe('b')
  })
})

describe('addRecent', () => {
  it(`giữ tối đa ${RECENT_LIMIT} id mới nhất, không trùng`, () => {
    let r: string[] = []
    for (const id of ['1', '2', '3', '4', '5', '6', '7']) r = addRecent(r, id)
    expect(r).toEqual(['3', '4', '5', '6', '7'])
    expect(addRecent(r, '5')).toEqual(['3', '4', '6', '7', '5'])
  })
})

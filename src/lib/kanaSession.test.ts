import { describe, expect, it } from 'vitest'
import { KANA, KANA_BY_ID, confusables, kanaOf, rowsOf } from '../data/kana'
import { kanaLevel, updateStat, weakest, type KanaStat } from './kanaProgress'
import {
  advance,
  answer,
  createSession,
  isFinished,
  pickDistractors,
  planSlots,
  reinsertIndex,
  spreadOut,
  type QueueItem,
  type SessionState,
} from './kanaSession'

/** Bộ sinh số ngẫu nhiên cố định để test lặp lại được. */
function seeded(seed = 42) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31
    return s / 2 ** 31
  }
}

const noAdjacent = (ids: string[]) => ids.every((id, i) => i === 0 || id !== ids[i - 1])
const byKana = (kana: string) => KANA.find((k) => k.kana === kana)!

describe('bảng kana', () => {
  it('đủ 104 chữ mỗi bảng, xếp đúng hàng × cột, có ô trống ở や行 và わ行', () => {
    expect(kanaOf('hiragana')).toHaveLength(104)
    expect(kanaOf('katakana')).toHaveLength(104)
    const basic = rowsOf('hiragana', 'basic')
    expect(basic.map((r) => r.label).join('')).toBe('あ行か行さ行た行な行は行ま行や行ら行わ行ん')
    const ya = basic.find((r) => r.label === 'や行')!
    expect(ya.cells.map((c) => c?.kana ?? '_').join('')).toBe('や_ゆ_よ')
    const wa = basic.find((r) => r.label === 'わ行')!
    expect(wa.cells.map((c) => c?.kana ?? '_').join('')).toBe('わ___を')
    expect(new Set(KANA.map((k) => k.id)).size).toBe(208)
  })

  it('chữ dễ nhầm: シ/ツ, ソ/ン, ぬ/め, わ/ね/れ và cùng gốc khác dấu', () => {
    const names = (k: string) => confusables(byKana(k)).map((c) => c.kana)
    expect(names('シ')).toEqual(expect.arrayContaining(['ツ', 'ン']))
    expect(names('ソ')).toEqual(expect.arrayContaining(['ン']))
    expect(names('ぬ')).toContain('め')
    expect(names('わ')).toEqual(expect.arrayContaining(['ね', 'れ']))
    expect(names('ば')).toEqual(expect.arrayContaining(['ぼ', 'は', 'ぱ']))
    // Không lẫn sang bảng chữ kia.
    expect(confusables(byKana('シ')).every((c) => c.script === 'katakana')).toBe(true)
  })
})

describe('lập hàng đợi', () => {
  it('mỗi chữ một lần, trộn ngẫu nhiên, không lặp liền nhau', () => {
    const ids = kanaOf('hiragana').slice(0, 46).map((k) => k.id)
    const slots = planSlots(ids, 'each', seeded())
    expect([...slots].sort()).toEqual([...ids].sort())
    expect(noAdjacent(slots)).toBe(true)
  })

  it('20 hoặc 50 câu: lặp đều các chữ, không chữ nào liền nhau', () => {
    const ids = ['h-a', 'h-i', 'h-u', 'h-e', 'h-o']
    for (let seed = 1; seed < 30; seed++) {
      const slots = planSlots(ids, 20, seeded(seed))
      expect(slots).toHaveLength(20)
      expect(noAdjacent(slots)).toBe(true)
      for (const id of ids) expect(slots.filter((s) => s === id)).toHaveLength(4)
    }
    expect(planSlots(ids, 50, seeded())).toHaveLength(50)
    // Ít câu hơn số chữ: lấy ngẫu nhiên một phần, không trùng.
    const many = kanaOf('katakana').map((k) => k.id)
    expect(new Set(planSlots(many, 20, seeded())).size).toBe(20)
  })

  it('spreadOut tách các phần tử trùng khi có thể', () => {
    expect(noAdjacent(spreadOut(['a', 'a', 'a', 'b', 'b', 'c'], (x) => x))).toBe(true)
    // Không thể tách hết (chỉ có một loại) thì giữ nguyên số lượng.
    expect(spreadOut(['a', 'a'], (x) => x)).toEqual(['a', 'a'])
  })
})

describe('trả lời và đưa lại câu sai', () => {
  const run = (ids: string[], seed: number, wrongOnce: Set<string>) => {
    const rng = seeded(seed)
    let s: SessionState = createSession(ids, 'each', 'typing', ['typing'], rng)
    const order: QueueItem[] = []
    let guard = 0
    while (!isFinished(s) && guard++ < 200) {
      const head = s.queue[0]
      order.push(head)
      const correct = head.retry || !wrongOnce.has(head.id)
      s = answer(s, correct).state
      s = advance(s, correct, 'typing', ['typing'], rng)
    }
    return { s, order }
  }

  it('câu sai được hỏi lại cách 3–5 câu sau', () => {
    const ids = kanaOf('hiragana').slice(0, 10).map((k) => k.id)
    for (let seed = 1; seed < 20; seed++) {
      // Mỗi lần chỉ một chữ sai: câu sai khác chèn vào giữa sẽ đẩy khoảng cách xa thêm.
      for (const id of [ids[0], ids[3]]) {
        const { order } = run(ids, seed, new Set([id]))
        const first = order.findIndex((q) => q.id === id)
        const again = order.findIndex((q) => q.id === id && q.retry)
        expect(again).toBeGreaterThan(first)
        // Hỏi lại sau 3–5 câu khác, trừ khi cuối phiên không còn đủ câu.
        const gap = again - first - 1
        if (first + 6 < ids.length) expect(gap).toBeGreaterThanOrEqual(3)
        expect(gap).toBeLessThanOrEqual(5)
      }
    }
  })

  it('phiên chỉ kết thúc khi mọi chữ đã đúng ít nhất một lần; điểm tính đúng ngay lần đầu', () => {
    const ids = ['h-a', 'h-i', 'h-u', 'h-e', 'h-o']
    const { s, order } = run(ids, 7, new Set(['h-u', 'h-o']))
    expect(isFinished(s)).toBe(true)
    expect(order).toHaveLength(7)
    expect(s.planned).toBe(5)
    expect(s.done).toBe(5)
    expect(s.firstTry).toBe(3)
    expect(s.answers).toBe(7)
    expect(s.correct).toBe(5)
    expect(s.mistakes).toEqual({ 'h-u': 1, 'h-o': 1 })
    expect(s.step).toBe(7)
  })

  it('sai mãi thì phiên chưa kết thúc', () => {
    const rng = seeded(3)
    let s = createSession(['h-a', 'h-i'], 'each', 'choice', ['choice'], rng)
    for (let i = 0; i < 10; i++) {
      s = answer(s, false).state
      s = advance(s, false, 'choice', ['choice'], rng)
    }
    expect(isFinished(s)).toBe(false)
    expect(s.queue).toHaveLength(2)
    expect(s.bestStreak).toBe(0)
  })

  it('chuỗi đúng dài nhất', () => {
    const rng = seeded(5)
    let s = createSession(['h-a', 'h-i', 'h-u', 'h-e'], 'each', 'choice', ['choice'], rng)
    for (const ok of [true, true, false, true]) {
      s = answer(s, ok).state
      s = advance(s, ok, 'choice', ['choice'], rng)
    }
    expect(s.bestStreak).toBe(2)
    expect(s.streak).toBe(1)
  })

  it('reinsertIndex tránh đứng cạnh chính chữ đó', () => {
    const q = (ids: string[]): QueueItem[] => ids.map((id, slot) => ({ id, slot, retry: false, mode: 'choice' }))
    const queue = q(['a', 'b', 'c', 'x', 'd', 'e', 'f'])
    for (let seed = 1; seed < 20; seed++) {
      const at = reinsertIndex(queue, 'x', seeded(seed))
      expect(queue[at - 1]?.id).not.toBe('x')
      expect(queue[at]?.id).not.toBe('x')
      expect(at).toBeGreaterThanOrEqual(2)
    }
    expect(reinsertIndex(q(['a', 'b']), 'x', seeded())).toBe(2)
  })
})

describe('đáp án nhiễu', () => {
  it('ưu tiên chữ dễ nhầm, không trùng âm với đáp án', () => {
    const shi = byKana('シ')
    for (let seed = 1; seed < 10; seed++) {
      const d = pickDistractors(shi, seeded(seed))
      expect(d).toHaveLength(3)
      expect(d.map((k) => k.kana)).toEqual(expect.arrayContaining(['ツ', 'ン']))
      expect(d.every((k) => k.script === 'katakana' && k.romaji !== 'shi')).toBe(true)
    }
  })

  it('sau chữ dễ nhầm là chữ cùng hàng hoặc cùng cột', () => {
    const ha = byKana('は')
    const d = pickDistractors(ha, seeded(9))
    const conf = new Set(confusables(ha).map((k) => k.id))
    // は có nhiều chữ dễ nhầm (ほ, け, ば, ぱ…) nên cả 3 đều thuộc nhóm này.
    expect(d.every((k) => conf.has(k.id))).toBe(true)
    const n = byKana('ん')
    const dn = pickDistractors(n, seeded(9))
    expect(dn.map((k) => k.kana)).not.toContain('ん')
  })

  it('じ không bao giờ có ぢ làm đáp án nhiễu (cùng đọc "ji")', () => {
    const ji = KANA_BY_ID.get('h-ji')!
    for (let seed = 1; seed < 40; seed++) {
      const d = pickDistractors(ji, seeded(seed))
      expect(d.map((k) => k.romaji)).not.toContain('ji')
      expect(new Set(d.map((k) => k.romaji)).size).toBe(3)
    }
  })
})

describe('mức thuộc', () => {
  it('đã thuộc khi đúng ngay lần đầu 3 lần liên tiếp; sai một lần về đang học', () => {
    let s: KanaStat | undefined
    expect(kanaLevel(s)).toBe('new')
    s = updateStat(s, true, true, 1)
    s = updateStat(s, true, true, 2)
    expect(kanaLevel(s)).toBe('learning')
    s = updateStat(s, true, true, 3)
    expect(kanaLevel(s)).toBe('mastered')
    s = updateStat(s, false, true, 4)
    expect(kanaLevel(s)).toBe('learning')
    expect(s).toEqual({ right: 3, wrong: 1, streak: 0, last: 4 })
    // Đúng khi hỏi lại trong phiên: không tính vào chuỗi.
    s = updateStat(s, true, false, 5)
    expect(s.streak).toBe(0)
    expect(s.last).toBe(5)
  })

  it('chữ yếu: sai nhiều nhất trước, tối đa 20', () => {
    const chars = kanaOf('hiragana')
    const stats: Record<string, KanaStat> = {}
    chars.slice(0, 30).forEach((k, i) => (stats[k.id] = { right: 1, wrong: i % 7, streak: 0, last: 1 }))
    const w = weakest(chars, stats)
    expect(w.length).toBeLessThanOrEqual(20)
    expect(w.every((k) => stats[k.id].wrong > 0)).toBe(true)
    const wrongs = w.map((k) => stats[k.id].wrong)
    expect(wrongs).toEqual([...wrongs].sort((a, b) => b - a))
  })
})

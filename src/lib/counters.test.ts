import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CounterData, CounterEntry, DataManifest, SrsCard } from '../types'
import {
  FORM_KEYS,
  acceptedReadings,
  blankSentences,
  cellsOf,
  counterChoiceDistractors,
  counterIndex,
  counterRef,
  isCounterRef,
  matchCounter,
  pairId,
  pickPairs,
  parseCounterRef,
  readingDistractors,
  reasonFor,
  shouldTrack,
} from './counters'
import { newCard } from './srs'

const DATA_DIR = resolve(__dirname, '../../public/data')
const raw = readFileSync(resolve(DATA_DIR, 'counters.json'))
const data = JSON.parse(raw.toString('utf8')) as CounterData
const manifest = JSON.parse(readFileSync(resolve(DATA_DIR, 'manifest.json'), 'utf8')) as DataManifest
const byId = (id: string) => data.counters.find((c) => c.id === id)!

describe('counters.json', () => {
  it('đủ 49 trợ số từ có bảng + 58 trợ số từ khác, id không trùng', () => {
    expect(data.counters).toHaveLength(49)
    expect(data.more).toHaveLength(58)
    expect(counterIndex(data).size).toBe(107)
    expect(data.rules.length).toBeGreaterThan(0)
  })

  it('có trong manifest, đúng số mục và hash', () => {
    const f = manifest.files.find((x) => x.path === 'counters.json')
    expect(f).toMatchObject({ kind: 'counters', count: 107, bytes: raw.length })
    expect(f!.hash).toBe(createHash('sha1').update(raw).digest('hex').slice(0, 10))
  })

  it('一日: ついたち (ngày mùng 1) và いちにち (1 ngày) ở hai mục khác nhau', () => {
    const day = data.counters.find((c) => c.counter === '日')!
    const days = data.counters.find((c) => c.counter === '日間')!
    expect(day.id).not.toBe(days.id)
    expect(day.forms['1']).toBe('ついたち')
    expect(days.forms['1']).toBe('いちにち')
    expect(day.irregular).toContain('1')
  })

  it('mọi ô bất quy tắc có trong bảng, cách đọc là hiragana', () => {
    for (const c of data.counters) {
      for (const k of c.irregular) expect(c.forms[k], `${c.id} ${k}`).toBeTruthy()
      for (const v of Object.values(c.forms)) expect(v).toMatch(/^[぀-ゟ]+(?:／[぀-ゟ]+)*$/)
    }
  })
})

describe('ID thẻ', () => {
  it('ct-<id> và ct-<id>-<số> đọc lại được', () => {
    expect(parseCounterRef(counterRef('tou_animal'))).toEqual({ id: 'tou_animal' })
    expect(parseCounterRef(pairId('hon', '10'))).toEqual({ id: 'hon', n: '10' })
    expect(parseCounterRef(pairId('hon', 'nan'))).toEqual({ id: 'hon', n: 'nan' })
    expect(isCounterRef('ct-hon-11')).toBe(false)
    expect(isCounterRef('n5-1a2b3c4d')).toBe(false)
  })
})

describe('lý do biến âm', () => {
  const hon = byId('hon')
  it('本: ほ → ぼ sau 3, âm ngắt ở 1', () => {
    expect(reasonFor(hon, '3', 'さんぼん')).toBe('ほ → ぼ sau 3')
    expect(reasonFor(hon, '1', 'いっぽん')).toBe('いち → いっ (âm ngắt); ほ → ぽ sau 1')
    expect(reasonFor(hon, '2', 'にほん')).toBe('Đọc bình thường: số + ほん')
  })
  it('人: よにん, ひとり', () => {
    const nin = byId('nin')
    expect(reasonFor(nin, '4', 'よにん')).toBe('4 đọc よ (không phải よん)')
    expect(reasonFor(nin, '1', 'ひとり')).toBe('Cách đọc riêng, cần học thuộc')
  })
  it('つ: số kiểu Nhật', () => {
    expect(reasonFor(byId('tsu'), '3', 'みっつ')).toBe('Số đếm kiểu Nhật: みっ')
    expect(reasonFor(byId('tsu'), 'nan', 'いくつ')).toBe('Hỏi số lượng dùng いくつ')
  })
  it('ô bất quy tắc nào cũng có lý do khác "Đọc bình thường"', () => {
    for (const c of data.counters) for (const cell of cellsOf(c)) if (cell.irregular) expect(cell.reason, `${c.id} ${cell.key}`).not.toMatch(/^Đọc bình thường/)
  })
})

describe('quiz chọn cách đọc', () => {
  it('6 + 匹: có nhiễu kiểu ろくひき / ろっひき, không có ろっぴき', () => {
    const hiki = byId('hiki')
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) readingDistractors(hiki, '6').forEach((o) => seen.add(o))
    expect(seen.has('ろっぴき')).toBe(false)
    expect(seen.has('ろくひき')).toBe(true)
    expect(seen.has('ろっひき')).toBe(true)
  })

  it('không bao giờ sinh đáp án trùng đáp án đúng, không trùng nhau, luôn ≥ 2 nhiễu', () => {
    for (let round = 0; round < 5; round++) {
      for (const c of data.counters) {
        for (const key of FORM_KEYS) {
          if (!c.forms[key]) continue
          const d = readingDistractors(c, key)
          const ok = acceptedReadings(c, key)
          expect(new Set(d).size, `${c.id} ${key}`).toBe(d.length)
          expect(d.length, `${c.id} ${key}`).toBeGreaterThanOrEqual(2)
          for (const o of d) expect(ok.has(o), `${c.id} ${key}: ${o}`).toBe(false)
        }
      }
    }
  })

  it('cách đọc được chấp nhận: 一日間, 何円', () => {
    expect(acceptedReadings(byId('nichikan'), '1').has('いちにちかん')).toBe(true)
    expect(acceptedReadings(byId('en'), 'nan').has('なんえん')).toBe(true)
  })
})

describe('quiz chọn trợ số từ', () => {
  it('ペンを一本… → đục lỗ đúng chỗ', () => {
    const s = blankSentences(byId('hon'))[0]
    expect(s.before).toBe('ペンを一')
    expect(s.after).toBe('貸してください。')
  })

  it('nhiễu khác đáp án đúng, khác nhóm, không trùng nhau', () => {
    for (const c of data.counters) {
      for (let i = 0; i < 5; i++) {
        const d = counterChoiceDistractors(c, data.counters)
        expect(d).toHaveLength(3)
        expect(d).not.toContain(c.counter)
        expect(new Set(d).size).toBe(3)
        for (const o of d) expect(data.counters.find((x) => x.counter === o)!.group).not.toBe(c.group)
      }
    }
    // 本 và 杯 cùng đúng với ビール: không làm nhiễu của nhau
    for (let i = 0; i < 30; i++) expect(counterChoiceDistractors(byId('hon'), data.counters)).not.toContain('杯')
  })

  it('đa số trợ số từ có câu đục lỗ được', () => {
    const n = data.counters.filter((c) => blankSentences(c).length > 0).length
    expect(n).toBeGreaterThanOrEqual(30)
  })
})

describe('tìm kiếm', () => {
  const find = (q: string) => [...data.counters, ...data.more].filter((c) => matchCounter(c, q)).map((c) => c.counter)
  it('chữ, kana, cách đọc trong bảng', () => {
    expect(find('本')).toContain('本')
    expect(find('さんぼん')).toContain('本')
    expect(find('ひき')).toContain('匹')
  })
  it('tiếng Việt theo từ: "lát", "con", "đôi"', () => {
    expect(find('lát')).toContain('枚')
    expect(find('con')).toContain('匹')
    expect(find('đôi')).toContain('足')
    // có dấu thì không khớp nhầm "còn"
    expect(find('con').length).toBeLessThan(find('con vật').length + 20)
  })
})

describe('chọn cặp cho phiên học', () => {
  const now = Date.UTC(2026, 10, 17)
  it('ưu tiên thẻ đến hạn, rồi ô bất quy tắc chưa học', () => {
    const hon = byId('hon')
    const due: SrsCard = { ...newCard(pairId('hon', '2'), now - 10_000), due: now - 1000 }
    const pairs = pickPairs([hon], { [due.id]: due }, now, 7)
    const ids = pairs.map((p) => p.id)
    expect(ids).toContain(pairId('hon', '2'))
    // 6 ô bất quy tắc của 本 vào trước ô thường
    for (const k of hon.irregular) expect(ids).toContain(pairId('hon', k))
  })

  it('chỉ ghi lịch ôn cho cặp sai, ô bất quy tắc hoặc đã có thẻ', () => {
    expect(shouldTrack({ correct: true, irregular: false, hasCard: false })).toBe(false)
    expect(shouldTrack({ correct: false, irregular: false, hasCard: false })).toBe(true)
    expect(shouldTrack({ correct: true, irregular: true, hasCard: false })).toBe(true)
    expect(shouldTrack({ correct: true, irregular: false, hasCard: true })).toBe(true)
  })
})

// Kiểu dữ liệu khớp: trợ số từ thuần Nhật có thể thiếu số lớn.
it('口 chỉ có 1–3', () => {
  const kuchi: CounterEntry = byId('kuchi')
  expect(cellsOf(kuchi).map((c) => c.key)).toEqual(['1', '2', '3'])
})

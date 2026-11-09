import { describe, expect, it } from 'vitest'
import { dueForecast, forecastLabels } from './forecast'
import { mergeKanjiWords, type CardWord } from './randomKanji'
import { fsrsCard } from './testCards'

const DAY = 86_400_000
const card = (due: number) => fsrsCard(String(due), { due })

describe('dự báo thẻ đến hạn', () => {
  const now = new Date(2026, 10, 9, 15).getTime()
  it('gom theo ngày, quá hạn tính vào hôm nay, ngoài 7 ngày bỏ', () => {
    const today = new Date(2026, 10, 9, 23).getTime()
    expect(dueForecast([card(now - 5 * DAY), card(today), card(now + DAY), card(now + 6 * DAY), card(now + 8 * DAY)], now)).toEqual([2, 1, 0, 0, 0, 0, 1])
  })
  it('nhãn ngày', () => {
    expect(forecastLabels(now).slice(0, 3)).toEqual(['Nay', 'Mai', 'T4'])
  })
})

const w = (word: string): CardWord => ({ id: word, word, reading: '', meaning: '', speak: word })

describe('gộp từ của chữ Hán ngẫu nhiên', () => {
  it('con số = tổng danh sách gộp (trong máy + online chưa có)', () => {
    const r = mergeKanjiWords([w('日本'), w('日曜日')], 2, [w('日本'), w('毎日'), w('毎日'), w('日記')])
    expect(r.items.map((x) => x.word)).toEqual(['日本', '日曜日', '毎日', '日記'])
    expect(r.total).toBe(4)
  })
  it('wordCount lớn hơn số từ đã tải (cắt 40) vẫn đếm đủ', () => {
    expect(mergeKanjiWords([w('a')], 57, []).total).toBe(57)
  })
})

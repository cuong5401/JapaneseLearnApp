import { describe, expect, it } from 'vitest'
import { fetchKanjiWords, parseMazii } from './kanjiWordsApi'

/** Rút gọn từ kết quả thật của Mazii cho chữ 畑. */
const SAMPLE = {
  status: 200,
  found: true,
  data: [
    { word: '湯畑', phonetic: 'ゆばたけ', short_mean: 'nơi đầu nguồn của suối nước nóng', level: null },
    { word: '畑', phonetic: 'はたけ ばたけ', short_mean: 'ruộng; ruộng nương', level: ['N3'] },
    { word: '花畑', phonetic: 'はなばたけ', short_mean: 'cánh đồng hoa', level: null },
    { word: '田畑', phonetic: 'たはた たばた', short_mean: 'ruộng vườn', level: ['N1', 'N2'] },
    { word: '田', phonetic: 'た', short_mean: 'ruộng lúa', level: ['N4'] },
    { word: '茶畑', phonetic: 'ちゃばたけ', short_mean: '', level: null },
    { word: '畑', phonetic: 'はたけ', short_mean: 'trùng', level: ['N3'] },
    null,
  ],
}

describe('parseMazii', () => {
  it('giữ từ chứa chữ, bỏ trùng và mục thiếu nghĩa, sắp cấp thấp trước', () => {
    expect(parseMazii(SAMPLE, '畑')).toEqual([
      { word: '畑', reading: 'はたけ', meaning: 'ruộng; ruộng nương', level: 'N3' },
      { word: '田畑', reading: 'たはた', meaning: 'ruộng vườn', level: 'N2' },
      { word: '湯畑', reading: 'ゆばたけ', meaning: 'nơi đầu nguồn của suối nước nóng' },
      { word: '花畑', reading: 'はなばたけ', meaning: 'cánh đồng hoa' },
    ])
  })

  it('bỏ từ đã có trong dữ liệu local', () => {
    expect(parseMazii(SAMPLE, '畑', ['畑', '花畑']).map((w) => w.word)).toEqual(['田畑', '湯畑'])
  })

  it('dữ liệu lạ trả mảng rỗng', () => {
    expect(parseMazii(null, '畑')).toEqual([])
    expect(parseMazii({ data: 'x' }, '畑')).toEqual([])
  })
})

describe('fetchKanjiWords', () => {
  it('gửi POST tới Mazii và trả từ đã lọc', async () => {
    let body = ''
    const fake = (async (_url: string, init?: RequestInit) => {
      body = String(init?.body)
      return new Response(JSON.stringify(SAMPLE), { status: 200 })
    }) as typeof fetch
    const words = await fetchKanjiWords('畑', undefined, fake)
    expect(JSON.parse(body)).toMatchObject({ dict: 'javi', type: 'word', query: '畑' })
    expect(words[0].word).toBe('畑')
  })

  it('lỗi mạng hoặc HTTP lỗi thì trả [] (không ném)', async () => {
    const down = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    expect(await fetchKanjiWords('鬱', undefined, down)).toEqual([])
    const http500 = (async () => new Response('x', { status: 500 })) as typeof fetch
    expect(await fetchKanjiWords('鬱', undefined, http500)).toEqual([])
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseAiExamples } from '../ai/complete'
import { addExample, initialState, sanitizeState } from '../notebooks'
import { isFresh, memoryStore, TTL_MS, type CacheEntry } from './cache'
import { cleanWord, containsTerm, fetchTatoeba, highlight, nearDuplicate, parseSentences, rankExamples, searchTerms, type Candidate } from './tatoeba'

/** Một câu Tatoeba (định dạng API v1). */
const raw = (id: number, text: string, tr: { vie?: string; eng?: string } = {}, audio = false, unapproved = false) => ({
  id,
  text,
  lang: 'jpn',
  license: 'CC BY 2.0 FR',
  owner: 'someone',
  is_unapproved: unapproved,
  translations: [
    ...(tr.vie ? [{ id: id + 1, text: tr.vie, lang: 'vie' }] : []),
    ...(tr.eng ? [{ id: id + 2, text: tr.eng, lang: 'eng' }] : []),
  ],
  ...(audio ? { audios: [{ id: 900 + id, author: 'yomi' }] } : {}),
})
const page = (data: unknown[], next: string | null = null) => ({ data, paging: { total: data.length, has_next: Boolean(next), next } })
const res = (json: unknown, status = 200) => new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } })

describe('chuẩn hóa từ và gốc để khớp dạng chia', () => {
  it('bỏ (な), ～, dấu cách', () => {
    expect(cleanWord('素敵 （な）')).toBe('素敵')
    expect(cleanWord('～とか')).toBe('とか')
  })
  it('động từ, する, tính từ đuôi い, danh từ', () => {
    expect(searchTerms('食べる')).toMatchObject({ stem: '食べ', query: '食べ' })
    expect(searchTerms('始まる').stem).toBe('始ま')
    expect(searchTerms('到達する')).toMatchObject({ stem: '到達', query: '到達' })
    expect(searchTerms('高い').stem).toBe('高')
    expect(searchTerms('遺伝')).toMatchObject({ stem: null, query: '遺伝', variants: ['遺伝'] })
    expect(searchTerms('探す', ['捜す']).variants).toEqual(['探す', '捜す'])
  })
  it('khớp dạng chia nhưng không khớp nhầm chữ khác (高 ≠ 高校)', () => {
    expect(containsTerm('明日も食べます。', searchTerms('食べる'))).toBe(true)
    expect(containsTerm('このかばんは高かった。', searchTerms('高い'))).toBe(true)
    expect(containsTerm('高校に行きます。', searchTerms('高い'))).toBe(false)
    expect(containsTerm('遺伝的な病気です。', searchTerms('遺伝'))).toBe(true)
  })
  it('tô đậm phần chứa từ', () => {
    expect(highlight('この犯罪者は遺伝の犠牲者だ。', searchTerms('遺伝'))).toEqual([
      { text: 'この犯罪者は', hit: false },
      { text: '遺伝', hit: true },
      { text: 'の犠牲者だ。', hit: false },
    ])
  })
})

describe('chọn câu tốt nhất', () => {
  const t = searchTerms('遺伝')
  const c = (key: string, ja: string, extra: Partial<Candidate> = {}): Candidate => ({ key, ja, src: 'tatoeba', tid: 1, ...extra })

  it('ưu tiên: có dịch Việt > độ dài 8–40 > có audio; bỏ câu không chứa từ / chưa duyệt / không có bản dịch', () => {
    const out = rankExamples(
      [
        c('a', '遺伝。', { en: 'Heredity.' }),
        c('b', 'この病気は遺伝によるものです。', { en: 'This disease is hereditary.', audioId: 1 }),
        c('c', '彼の才能は遺伝だと思う。', { vi: 'Tôi nghĩ tài năng của anh ấy là do di truyền.' }),
        c('d', '関係ない文です。', { vi: 'Không liên quan.' }),
        c('e', '遺伝の研究をしています。', { vi: 'Tôi nghiên cứu di truyền.', unapproved: true }),
        c('f', '遺伝子の話。'),
      ],
      t,
    )
    expect(out.map((x) => x.key)).toEqual(['c', 'b', 'a'])
  })

  it('không lấy 2 câu gần giống nhau', () => {
    expect(nearDuplicate('この犯罪者は遺伝の犠牲者だ。', 'この犯罪者は遺伝の犠牲者だ!')).toBe(true)
    expect(nearDuplicate('この犯罪者は遺伝の犠牲者だ。', '彼の才能は遺伝だと思う。')).toBe(false)
    const out = rankExamples([c('a', 'この犯罪者は遺伝の犠牲者だ。', { vi: 'x' }), c('b', 'この犯罪者は遺伝の犠牲者だ', { vi: 'y' })], t)
    expect(out).toHaveLength(1)
  })

  it('đọc dữ liệu API: bản dịch vie / eng, audio, phân trang', () => {
    const p = parseSentences(page([raw(10, '遺伝です。', { vie: 'Di truyền.', eng: 'Heredity.' }, true)], 'https://api.tatoeba.org/v1/sentences?after=1'))
    expect(p.items[0]).toMatchObject({ key: 't:10', vi: 'Di truyền.', en: 'Heredity.', audioId: 910, audioBy: 'yomi', tid: 10 })
    expect(p.next).toContain('after=1')
    // next không phải của Tatoeba thì bỏ
    expect(parseSentences({ data: [], paging: { next: 'https://evil.example/x' } }).next).toBeNull()
  })
})

describe('gọi Tatoeba (mock)', () => {
  afterEach(() => vi.useRealTimers())
  const t = searchTerms('遺伝')

  it('đủ câu có tiếng Việt: chỉ 1 request, có sort / showtrans / include=audios', async () => {
    const urls: string[] = []
    const fetchFn = (async (u: string) => {
      urls.push(u)
      return res(page([1, 2, 3].map((i) => raw(i, `遺伝の例文${i}番です。`, { vie: `Câu ${i}` }))))
    }) as typeof fetch
    const r = await fetchTatoeba(t, { fetchFn })
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('lang=jpn')
    expect(urls[0]).toContain('sort=relevance')
    expect(urls[0]).toContain('include=audios')
    expect(decodeURIComponent(urls[0])).toContain('q=遺伝')
    expect(r.items).toHaveLength(3)
  })

  it('ít câu tiếng Việt: gọi thêm 1 request lọc trans:lang=vie, gộp không trùng', async () => {
    const urls: string[] = []
    const fetchFn = (async (u: string) => {
      urls.push(u)
      return u.includes('&trans:lang=vie') ? res(page([raw(5, '遺伝ですね。', { vie: 'Di truyền nhỉ.' }), raw(1, '遺伝だ。', { eng: 'x' })])) : res(page([raw(1, '遺伝だ。', { eng: 'x' })]))
    }) as typeof fetch
    const r = await fetchTatoeba(t, { fetchFn })
    expect(urls).toHaveLength(2)
    expect(r.items.map((x) => x.key)).toEqual(['t:1', 't:5'])
  })

  it('không có kết quả: trả rỗng', async () => {
    const r = await fetchTatoeba(t, { fetchFn: (async () => res(page([]))) as typeof fetch })
    expect(rankExamples(r.items, t)).toEqual([])
  })

  it('lỗi mạng / HTTP lỗi: ném lỗi', async () => {
    await expect(fetchTatoeba(t, { fetchFn: (async () => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch })).rejects.toThrow()
    await expect(fetchTatoeba(t, { fetchFn: (async () => res({}, 500)) as typeof fetch })).rejects.toThrow('Tatoeba 500')
  })

  it('quá 6 giây: hủy request (timeout)', async () => {
    vi.useFakeTimers()
    const fetchFn = ((_u: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))) as typeof fetch
    const p = fetchTatoeba(t, { fetchFn })
    const assertion = expect(p).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(6000)
    await assertion
  })

  it('panel đóng (signal bị hủy): request dừng', async () => {
    const ctrl = new AbortController()
    const fetchFn = ((_u: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))) as typeof fetch
    const p = fetchTatoeba(t, { fetchFn, signal: ctrl.signal })
    ctrl.abort()
    await expect(p).rejects.toThrow()
  })
})

describe('cache câu ví dụ', () => {
  const entry = (id: string, at: number): CacheEntry => ({ id, at, items: [{ key: 't:1', ja: '遺伝です。', vi: 'x', src: 'tatoeba', tid: 1 }], next: null, src: 'tatoeba' })

  it('lần 2 trả ngay từ cache, còn hạn trong 30 ngày', async () => {
    const store = memoryStore()
    await store.put(entry('n2-f05d7729', 1000))
    const got = await store.get('n2-f05d7729')
    expect(got?.items[0].ja).toBe('遺伝です。')
    expect(isFresh(got, 1000 + TTL_MS - 1)).toBe(true)
    expect(isFresh(got, 1000 + TTL_MS)).toBe(false)
  })

  it('vượt giới hạn: xóa mục cũ nhất', async () => {
    const store = memoryStore(3)
    for (let i = 0; i < 5; i++) await store.put(entry(`w${i}`, i))
    expect(store.size()).toBe(3)
    expect(await store.get('w0')).toBeUndefined()
    expect(await store.get('w4')).toBeDefined()
  })
})

describe('AI tạo câu ví dụ', () => {
  it('đọc JSON (kể cả bọc ```json), tối đa 3 câu; sai định dạng thì báo lỗi', () => {
    expect(parseAiExamples('```json\n[{"ja":"遺伝する。","vi":"Di truyền."}]\n```')).toEqual([{ ja: '遺伝する。', vi: 'Di truyền.' }])
    expect(parseAiExamples(JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ ja: `文${i}`, vi: `c${i}` }))))).toHaveLength(3)
    expect(() => parseAiExamples('Xin lỗi, tôi không biết.')).toThrow()
    expect(() => parseAiExamples('[{"ja":""}]')).toThrow()
  })
})

describe('lưu câu vào sổ tay (gắn với từ)', () => {
  it('thêm từ nếu chưa có, gắn câu, không trùng; giữ qua xuất / nhập', () => {
    let s = initialState(0)
    const book = s.books[0].id
    const ex = { ja: '遺伝です。', tr: 'Di truyền.', src: 'tatoeba' as const, tid: 1 }
    s = addExample(s, book, 'n2-f05d7729', ex, 1)
    s = addExample(s, book, 'n2-f05d7729', ex, 2)
    expect(s.items[book]).toHaveLength(1)
    expect(s.items[book][0].examples).toEqual([ex])
    expect(sanitizeState(JSON.parse(JSON.stringify(s)))!.items[book][0].examples).toEqual([ex])
  })
})

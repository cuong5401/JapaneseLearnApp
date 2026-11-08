import { beforeAll, describe, expect, it } from 'vitest'
import kanji from '../../../public/data/kanji/kanji.json'
import { loadRecognizer, preferKnown, recognize, toPattern, type Stroke } from './recognize'

/** Nét mẫu tự dựng trên khung 300×300 px (như vẽ bằng chuột): đoạn thẳng nhiều điểm, hơi lệch cho giống tay. */
const line = (x1: number, y1: number, x2: number, y2: number, n = 12): Stroke =>
  Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n + (i % 2) * 0.8, y1 + ((y2 - y1) * i) / n])

const ICHI: Stroke[] = [line(40, 150, 260, 152)]
const HI: Stroke[] = [
  line(70, 30, 71, 280),
  [...line(70, 30, 230, 31), ...line(230, 31, 229, 275)],
  line(71, 150, 229, 151),
  line(71, 272, 229, 272),
]
const HON: Stroke[] = [line(40, 90, 260, 90), line(150, 30, 151, 280), line(145, 95, 50, 230), line(155, 95, 260, 230), line(100, 210, 200, 211)]

const KNOWN = new Set(kanji.map((k) => k.kanji))

describe('nhận dạng chữ viết tay (KanjiCanvas)', () => {
  beforeAll(() => loadRecognizer(), 60_000)

  it('一 và 本 đứng đầu ngay cả khi không ưu tiên danh sách', async () => {
    expect((await recognize(ICHI, 300))[0]).toBe('一')
    expect((await recognize(HON, 300))[0]).toBe('本')
  })

  it('日 đứng đầu khi ưu tiên chữ trong kanji.json (thư viện gốc xếp 曰 trước)', async () => {
    const raw = await recognize(HI, 300)
    expect(raw.slice(0, 3)).toContain('日')
    const ranked = await recognize(HI, 300, KNOWN)
    expect(ranked[0]).toBe('日')
    // Không bỏ ứng viên nào, chỉ đổi thứ tự.
    expect([...ranked].sort()).toEqual([...raw].sort())
  })

  it('không phụ thuộc thứ tự nét; tối đa 10 ứng viên', async () => {
    const c = await recognize([...HI].reverse(), 300, KNOWN)
    expect(c[0]).toBe('日')
    expect(c.length).toBeLessThanOrEqual(10)
  })

  it('khung rỗng trả về danh sách rỗng; co tọa độ về khung 256', async () => {
    expect(await recognize([], 300)).toEqual([])
    expect(await recognize([[]], 300)).toEqual([])
    expect(toPattern([[[150, 300]]], 300)).toEqual([
      [
        [128, 256],
        [129, 257],
      ],
    ])
  })

  it('preferKnown giữ thứ tự trong từng nhóm', () => {
    expect(preferKnown(['曰', '日', '尺', '口'], new Set(['日', '口']))).toEqual(['日', '口', '曰', '尺'])
    expect(preferKnown(['a', 'b'])).toEqual(['a', 'b'])
  })
})

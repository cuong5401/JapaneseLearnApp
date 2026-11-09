import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { firstPoint, labelPositions, lastPoint, parseStrokeData, startDir, strokeFile } from './strokes'

const load = (ch: string) => parseStrokeData(JSON.parse(readFileSync(`public/data/${strokeFile(ch)}`, 'utf-8')))!

describe('thứ tự nét (KanjiVG)', () => {
  it('đường dẫn file theo mã hex Unicode', () => {
    expect(strokeFile('日')).toBe('strokes/65e5.json')
    expect(strokeFile('あ')).toBe('strokes/3042.json')
  })

  it('日 có 4 nét theo đúng thứ tự', () => {
    const d = load('日')
    expect(d.strokes.map((s) => s.n)).toEqual([1, 2, 3, 4])
    // nét 1 sổ dọc bên trái: đi từ trên xuống
    const [x0, y0] = firstPoint(d.strokes[0].d)
    const [x1, y1] = lastPoint(d.strokes[0].d)
    expect(y1 - y0).toBeGreaterThan(50)
    expect(Math.abs(x1 - x0)).toBeLessThan(5)
  })

  it('右 nét 1 là nét phẩy (xuống trái), 左 nét 1 là nét ngang', () => {
    const [ax, ay] = firstPoint(load('右').strokes[0].d)
    const [bx, by] = lastPoint(load('右').strokes[0].d)
    expect(by - ay).toBeGreaterThan(20)
    expect(bx - ax).toBeLessThan(-10)
    const [cx, cy] = firstPoint(load('左').strokes[0].d)
    const [dx, dy] = lastPoint(load('左').strokes[0].d)
    expect(dx - cx).toBeGreaterThan(30)
    expect(Math.abs(dy - cy)).toBeLessThan(10)
  })

  it('必 có 5 nét; kana có dữ liệu', () => {
    expect(load('必').strokes).toHaveLength(5)
    expect(load('あ').strokes).toHaveLength(3)
  })

  it('dữ liệu sai định dạng thì null', () => {
    expect(parseStrokeData(null)).toBeNull()
    expect(parseStrokeData({ char: 'x', strokes: [] })).toBeNull()
    expect(parseStrokeData({ char: 'x', strokes: [{ d: 'M1,1', n: 1 }] })).toBeNull()
  })
})

describe('vị trí vòng số thứ tự nét', () => {
  for (const ch of ['合', '書', '曜', '議']) {
    for (const r of [4.5, 5.8]) {
      it(`${ch} (r=${r}): các vòng số không chồng nhau`, () => {
        const pos = labelPositions(load(ch).strokes, r)
        for (let i = 0; i < pos.length; i++)
          for (let j = i + 1; j < pos.length; j++) expect(Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1])).toBeGreaterThan(2 * r)
      })
    }
  }
  it('hướng đặt bút nét 1 chữ 日 là đi xuống', () => {
    const [, dy] = startDir(load('日').strokes[0].d)
    expect(dy).toBeGreaterThan(0.5)
  })
})

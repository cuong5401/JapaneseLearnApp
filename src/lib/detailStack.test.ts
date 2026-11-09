import { describe, expect, it } from 'vitest'
import { MAX_FRAMES, frameKey, parseStack, popFrame, pushFrame, serializeStack, type Frame } from './detailStack'

describe('ngăn xếp chi tiết', () => {
  it('đọc / ghi URL qua lại, bỏ khung hỏng', () => {
    const frames: Frame[] = [{ t: 'k', ch: '日' }, { t: 'w', id: 'n5-98163e17' }, { t: 'r', no: 72 }]
    const s = serializeStack(frames)
    expect(s).toBe('k:日~w:n5-98163e17~r:72')
    expect(parseStack(s)).toEqual(frames)
    expect(parseStack('k:日~x:1~w:~k:日本~r:abc~w:n4-00000001')).toEqual([{ t: 'k', ch: '日' }, { t: 'w', id: 'n4-00000001' }])
    expect(parseStack(null)).toEqual([])
  })

  it('đẩy khung mới, không đẩy trùng khung đang hiện (kể cả khung gốc bên dưới)', () => {
    const word: Frame = { t: 'w', id: 'n5-98163e17' }
    let st = pushFrame([], word, { t: 'k', ch: '日' })
    expect(st).toEqual([word])
    expect(pushFrame(st, word)).toEqual([word])
    st = pushFrame(st, { t: 'k', ch: '本' })
    expect(st.map(frameKey)).toEqual(['w:n5-98163e17', 'k:本'])
    // Khung gốc ?k=日 đang hiện: bấm lại 日 không tạo khung mới.
    expect(pushFrame([], { t: 'k', ch: '日' }, { t: 'k', ch: '日' })).toEqual([])
  })

  it('lùi một bước và giới hạn độ sâu', () => {
    let st: Frame[] = []
    for (let i = 0; i < MAX_FRAMES + 5; i++) st = pushFrame(st, { t: 'r', no: i + 1 })
    expect(st).toHaveLength(MAX_FRAMES)
    expect(st[0]).toEqual({ t: 'r', no: 6 })
    expect(popFrame(st)).toHaveLength(MAX_FRAMES - 1)
    expect(popFrame([])).toEqual([])
  })

  it('tối đa 8 khung kể cả chữ gốc; chữ gốc giữ nguyên', () => {
    expect(MAX_FRAMES).toBe(8)
    const root: Frame = { t: 'k', ch: '日' }
    let st: Frame[] = []
    for (let i = 0; i < 12; i++) st = pushFrame(st, { t: 'r', no: i + 1 }, root)
    expect(st).toHaveLength(7)
    expect(st[6]).toEqual({ t: 'r', no: 12 })
    expect(parseStack(serializeStack([...st, ...st]))).toHaveLength(8)
  })
})

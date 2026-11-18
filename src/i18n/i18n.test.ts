import { describe, expect, it } from 'vitest'
import { __setDictForTest, t, type Dict } from '.'
import ja from './ja'
import vi from './vi'

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('từ điển i18n', () => {
  it('vi và ja có đúng cùng bộ khóa (thiếu / thừa khóa thì fail)', () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(vi).sort())
  })

  it('mọi bản dịch không rỗng, cùng tham số {ten} với bản tiếng Việt', () => {
    for (const k of Object.keys(vi) as (keyof typeof vi)[]) {
      expect(ja[k].trim() || ja[k] === vi[k] || k.endsWith('Suffix'), `ja rỗng: ${k}`).toBeTruthy()
      expect(params(ja[k]), `tham số lệch: ${k}`).toEqual(params(vi[k]))
    }
  })

  it('bản 日本語 không còn chữ tiếng Việt (trừ tên ngôn ngữ, ví dụ tìm kiếm có chủ đích)', () => {
    const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
    const allowed = new Set(['counters.timLatConDoi', 'searchDialog.viDuSankaTham'])
    const left = (Object.keys(ja) as (keyof typeof ja)[]).filter((k) => VI.test(ja[k]) && !allowed.has(k))
    expect(left).toEqual([])
  })

  it('t(): thay tham số, false/null thành chuỗi rỗng', () => {
    __setDictForTest('ja', ja as Dict)
    expect(t('common.bai', { v: 3 })).toBe('第3課')
    expect(t('progress.daThuoc', { mastered: 2, v: false })).toBe('習得 2')
    __setDictForTest('vi', vi as Dict)
    expect(t('common.bai', { v: 3 })).toBe('Bài 3')
  })

})

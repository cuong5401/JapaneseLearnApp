import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from './backup'
import { mergeChecked, sanitizeChecked, toggleChecked } from './grammarChecked'

describe('đánh dấu "Đã kiểm tra" cho mẫu ngữ pháp tự soạn', () => {
  it('bật / tắt', () => {
    let m = toggleChecked({}, 'gn3-0123abcd', 5)
    expect(m).toEqual({ 'gn3-0123abcd': 5 })
    m = toggleChecked(m, 'gn3-0123abcd', 6)
    expect(m).toEqual({})
  })

  it('gộp khi nhập: thêm mẫu mới, giữ thời điểm sớm hơn', () => {
    const r = mergeChecked({ 'gn3-aaaaaaaa': 10, 'gn5-bbbbbbbb': 3 }, { 'gn3-aaaaaaaa': 4, 'gn5-cccccccc': 7 })
    expect(r.added).toBe(1)
    expect(r.map).toEqual({ 'gn3-aaaaaaaa': 4, 'gn5-bbbbbbbb': 3, 'gn5-cccccccc': 7 })
  })

  it('bỏ mục hỏng khi đọc', () => {
    expect(sanitizeChecked(null)).toBeNull()
    expect(sanitizeChecked([1])).toBeNull()
    expect(sanitizeChecked({ 'gn3-aaaaaaaa': 1, 'n5-aaaaaaaa': 2, 'gn5-bbbbbbbb': 'x' })).toEqual({ 'gn3-aaaaaaaa': 1 })
  })

  it('có trong file xuất / nhập tiến độ; file cũ không có vẫn đọc được', () => {
    const checked = { 'gn3-aaaaaaaa': 9 }
    const r = parseBackup(JSON.stringify(createBackup({}, 20, {}, new Date(0), undefined, checked)))
    expect(r.ok && r.backup.grammarChecked).toEqual(checked)
    const old = parseBackup(JSON.stringify({ app: 'kotonoha', version: 1, cards: {} }))
    expect(old.ok && old.backup.grammarChecked).toBeUndefined()
  })
})

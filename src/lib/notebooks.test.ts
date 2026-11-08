import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from './backup'
import { pathForId } from './dataStore'
import {
  DEFAULT_BOOK_ID,
  addItem,
  booksContaining,
  createBook,
  deleteBook,
  hasItem,
  initialState,
  isSaved,
  itemCount,
  mergeNotebooks,
  moveBook,
  quickSaveTarget,
  recolorBook,
  removeItem,
  renameBook,
  sanitizeState,
  toggleItem,
} from './notebooks'
import { radicalId, radicalNo, withRadicalIds } from './radicals'

describe('sổ tay', () => {
  it('có sẵn sổ "Từ khó"; tạo, đổi tên, đổi màu, sắp xếp', () => {
    let s = initialState(1)
    expect(s.books.map((b) => b.name)).toEqual(['Từ khó'])
    s = createBook(s, '  Kanji tuần này  ', 'matsu', 'nb-1', 2)
    expect(s.books[1]).toMatchObject({ id: 'nb-1', name: 'Kanji tuần này', color: 'matsu', createdAt: 2 })
    s = renameBook(s, 'nb-1', 'Kanji khó', 3)
    s = recolorBook(s, 'nb-1', 'beni', 4)
    expect(s.books[1]).toMatchObject({ name: 'Kanji khó', color: 'beni', updatedAt: 4 })
    // Tên rỗng không đổi.
    expect(renameBook(s, 'nb-1', '   ', 5)).toBe(s)
    s = moveBook(s, 'nb-1', -1)
    expect(s.books.map((b) => b.id)).toEqual(['nb-1', DEFAULT_BOOK_ID])
    expect(moveBook(s, 'nb-1', -1)).toBe(s)
  })

  it('lưu một mục vào nhiều sổ, không trùng, gỡ và bật/tắt', () => {
    let s = createBook(initialState(0), 'Sổ 2', 'ai', 'nb-2', 0)
    s = addItem(s, DEFAULT_BOOK_ID, 'n5-98163e17', 10)
    s = addItem(s, 'nb-2', 'n5-98163e17', 11)
    s = addItem(s, 'nb-2', 'n5-98163e17', 12)
    expect(itemCount(s, 'nb-2')).toBe(1)
    expect(booksContaining(s, 'n5-98163e17').map((b) => b.id)).toEqual([DEFAULT_BOOK_ID, 'nb-2'])
    expect(s.lastUsed).toBe('nb-2')
    s = removeItem(s, DEFAULT_BOOK_ID, 'n5-98163e17', 13)
    expect(hasItem(s, DEFAULT_BOOK_ID, 'n5-98163e17')).toBe(false)
    expect(isSaved(s, 'n5-98163e17')).toBe(true)
    s = toggleItem(s, 'nb-2', 'n5-98163e17', 14)
    expect(isSaved(s, 'n5-98163e17')).toBe(false)
    s = toggleItem(s, 'nb-2', 'rd-072', 15)
    expect(hasItem(s, 'nb-2', 'rd-072')).toBe(true)
  })

  it('lưu nhanh vào sổ dùng gần nhất, mặc định sổ đầu', () => {
    let s = createBook(initialState(0), 'B', 'ai', 'nb-b', 0)
    expect(quickSaveTarget(s).id).toBe(DEFAULT_BOOK_ID)
    s = addItem(s, 'nb-b', 'kj-15917f3b', 1)
    expect(quickSaveTarget(s).id).toBe('nb-b')
    s = deleteBook(s, 'nb-b')
    expect(quickSaveTarget(s).id).toBe(DEFAULT_BOOK_ID)
  })

  it('xóa sổ (không xóa được sổ cuối cùng)', () => {
    let s = createBook(initialState(0), 'X', 'ai', 'nb-x', 0)
    s = addItem(s, 'nb-x', 'a', 1)
    s = deleteBook(s, 'nb-x')
    expect(s.books).toHaveLength(1)
    expect(s.items['nb-x']).toBeUndefined()
    expect(deleteBook(s, DEFAULT_BOOK_ID)).toBe(s)
  })

  it('đọc dữ liệu nhập, bỏ phần hỏng', () => {
    expect(sanitizeState(null)).toBeNull()
    expect(sanitizeState({ books: [] })).toBeNull()
    const s = sanitizeState({
      books: [{ id: 'a', name: 'A', color: 'không-có', createdAt: 1, updatedAt: 1 }, { id: 'a', name: 'trùng' }, { name: 'thiếu id' }],
      items: { a: [{ ref: 'x', addedAt: 1 }, { ref: 'x', addedAt: 2 }, { nope: 1 }] },
    })
    expect(s!.books).toHaveLength(1)
    expect(s!.books[0].color).toBe('ai')
    expect(s!.items.a).toEqual([{ ref: 'x', addedAt: 1 }])
  })

  it('gộp khi nhập: thêm sổ mới, hợp mục, giữ ngày thêm sớm hơn, lấy tên sửa sau', () => {
    let mine = addItem(initialState(0), DEFAULT_BOOK_ID, 'a', 5)
    mine = createBook(mine, 'Chỉ ở máy này', 'ai', 'local', 0)
    let theirs = addItem(initialState(0), DEFAULT_BOOK_ID, 'a', 2)
    theirs = addItem(theirs, DEFAULT_BOOK_ID, 'b', 3)
    // Đổi tên sau cùng (lúc 9) nên bản bên kia mới hơn bản ở máy này (sửa lúc 5).
    theirs = renameBook(theirs, DEFAULT_BOOK_ID, 'Từ khó (điện thoại)', 9)
    theirs = createBook(theirs, 'Sổ mới', 'beni', 'remote', 1)
    theirs = addItem(theirs, 'remote', 'c', 4)
    const r = mergeNotebooks(mine, theirs)
    expect(r.addedBooks).toBe(1)
    expect(r.addedItems).toBe(2)
    expect(r.state.books.map((b) => b.id)).toEqual([DEFAULT_BOOK_ID, 'local', 'remote'])
    expect(r.state.books[0].name).toBe('Từ khó (điện thoại)')
    expect(r.state.items[DEFAULT_BOOK_ID]).toEqual([
      { ref: 'a', addedAt: 2 },
      { ref: 'b', addedAt: 3 },
    ])
  })

  it('có trong file xuất / nhập tiến độ', () => {
    const nb = addItem(createBook(initialState(0), 'Kanji', 'matsu', 'nb-k', 1), 'nb-k', 'kj-15917f3b', 2)
    const text = JSON.stringify(createBackup({}, 20, {}, new Date(0), nb))
    const r = parseBackup(text)
    expect(r.ok && r.backup.notebooks).toEqual(nb)
    // File cũ không có sổ tay vẫn đọc được.
    const old = parseBackup(JSON.stringify({ app: 'kotonoha', version: 1, cards: {} }))
    expect(old.ok && old.backup.notebooks).toBeUndefined()
  })
})

describe('id bộ thủ', () => {
  it('rd-001 … rd-214, tra được file dữ liệu', () => {
    expect(radicalId(1)).toBe('rd-001')
    expect(radicalId(214)).toBe('rd-214')
    expect(radicalNo('rd-072')).toBe(72)
    expect(radicalNo('kj-15917f3b')).toBeNull()
    expect(pathForId('rd-072')).toBe('kanji/radicals.json')
    const list = [{ no: 72, radical: '日', name: 'nhật', meaning: 'mặt trời' }]
    expect(withRadicalIds(list)[0].id).toBe('rd-072')
    expect(withRadicalIds(list)).toBe(withRadicalIds(list))
  })
})

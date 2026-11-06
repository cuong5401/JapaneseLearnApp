import { describe, expect, it } from 'vitest'
import type { GrammarEntry, KanjiEntry, VocabItem } from '../types'
import { grammarDocs, hasJapanese, kanjiDocs, normalizeKana, normalizeVi, search, vocabDocs } from './search'

describe('normalizeVi', () => {
  it('bỏ dấu, đ → d, chữ thường, gộp khoảng trắng', () => {
    expect(normalizeVi('Tham Gia')).toBe('tham gia')
    expect(normalizeVi('  Đường   đi ')).toBe('duong di')
    expect(normalizeVi('NHÂN SINH')).toBe('nhan sinh')
    expect(normalizeVi('Thủy')).toBe(normalizeVi('thuỷ'))
  })
})

describe('kana', () => {
  it('nhận diện chữ Nhật và đưa katakana về hiragana', () => {
    expect(hasJapanese('参加')).toBe(true)
    expect(hasJapanese('tham gia')).toBe(false)
    expect(normalizeKana('サンカ')).toBe('さんか')
  })
})

const words: VocabItem[] = [
  { id: 'n4-00000006', word: '参加する', reading: 'さんかする', meaning: 'Tham gia, dự' },
  { id: 'cp-00000001', word: '参加', reading: 'さんか', meaning: 'Tham gia', hanViet: 'THAM GIA' },
  { id: 'n4-00000002', word: '参加する', reading: 'さんかする', meaning: 'Tham gia (vào)', hanViet: 'Tham gia' },
  { id: 'n5-00000003', word: '水', reading: 'みず', meaning: 'Nước' },
  { id: 'n2-00000004', word: 'アンテナ', reading: 'アンテナ', meaning: 'Ăng ten', origin: 'antenna' },
  { id: 'n3-00000005', word: '会議', reading: 'かいぎ', meaning: 'Cuộc họp; hội nghị', hanViet: 'Hội nghị' },
]
const kanji: KanjiEntry[] = [{ id: 'kj-00000001', kanji: '水', hanViet: 'THỦY', firstLevel: 'N5', words: [], wordCount: 3 }]
const grammar: GrammarEntry[] = [
  { id: 'gn2-00000001', level: 'N2', no: 1, title: '～として', meaning: 'Với tư cách là', body: [] },
]
const docs = [...vocabDocs(words, 'N5'), ...kanjiDocs(kanji), ...grammarDocs(grammar, 'N2')]

describe('search', () => {
  it('"tham gia" khớp nghĩa "Tham gia" không phân biệt dấu/hoa thường, khớp đúng xếp trước', () => {
    const r = search(docs, 'tham gia')
    // Khớp đúng cả nghĩa ("Tham gia") đứng trước khớp một nghĩa trong danh sách ("Tham gia, dự").
    expect(r.word.map((d) => d.id)).toEqual(['cp-00000001', 'n4-00000002', 'n4-00000006'])
    expect(search(docs, 'THAM GIA').word).toHaveLength(3)
    expect(search(docs, 'thâm gia').word).toHaveLength(3)
  })

  it('tìm theo chữ Nhật, kana và romaji', () => {
    expect(search(docs, '参加').word[0].title).toBe('参加')
    expect(search(docs, 'さんか').word[0].title).toBe('参加')
    expect(search(docs, 'sanka').word[0].title).toBe('参加')
    expect(search(docs, 'antena').word[0].title).toBe('アンテナ')
  })

  it('tìm theo Hán Việt và trả về đủ nhóm', () => {
    const r = search(docs, 'thuy')
    expect(r.kanji[0].title).toBe('水')
    expect(search(docs, 'hoi nghi').word[0].title).toBe('会議')
    expect(search(docs, 'tu cach').grammar[0].title).toBe('～として')
  })

  it('khớp nghĩa xếp trên khớp Hán Việt; mẫu ngữ pháp "～として" khớp phần đầu', () => {
    const extra = vocabDocs(
      [
        { id: 'n4-0000000a', word: '参加する', reading: 'さんかする', meaning: 'Tham gia, dự', hanViet: 'Tham gia' },
        { id: 'cp-0000000b', word: '参加', reading: 'さんか', meaning: 'Tham gia', hanViet: 'THAM GIA' },
        { id: 'n2-0000000c', word: '6.その他 レントゲンを撮りますとして', reading: '', meaning: 'Khác' },
      ],
      'X',
    )
    expect(search(extra, 'tham gia').word[0].id).toBe('cp-0000000b')
    const mixed = [...extra, ...grammarDocs(grammar, 'N2')]
    const r = search(mixed, 'として')
    expect(r.grammar[0].title).toBe('～として')
    // Khớp phần đầu (ngữ pháp) xếp trước khớp "có chứa" (từ vựng lạ).
    expect(search(mixed, 'として', 1).grammar).toHaveLength(1)
  })

  it('khớp một nghĩa trong danh sách "a; b" tính là khớp đúng', () => {
    expect(search(docs, 'hội nghị').word[0].id).toBe('n3-00000005')
  })

  it('giới hạn số kết quả và bỏ qua truy vấn rỗng', () => {
    const many = vocabDocs(
      Array.from({ length: 80 }, (_, i) => ({ id: `n5-${String(i).padStart(8, '0')}`, word: `語${i}`, reading: 'ご', meaning: 'Ngôn ngữ' })),
      'N5',
    )
    expect(search(many, 'ngon ngu').total).toBe(50)
    expect(search(many, 'ngon ngu', 10).word).toHaveLength(10)
    expect(search(docs, '   ').total).toBe(0)
  })
})

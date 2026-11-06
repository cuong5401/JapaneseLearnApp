import type { Deck, KanjiItem, Level, TermCategory, VocabItem } from '../types'

import vocabN5 from './vocab/n5.json'
import vocabN4 from './vocab/n4.json'
import vocabN3 from './vocab/n3.json'
import vocabN2 from './vocab/n2.json'
import vocabN1 from './vocab/n1.json'
import kanjiN5 from './kanji/n5.json'
import kanjiN4 from './kanji/n4.json'
import kanjiN3 from './kanji/n3.json'
import kanjiN2 from './kanji/n2.json'
import kanjiN1 from './kanji/n1.json'
import termsIt from './terms/it.json'
import termsElectronics from './terms/electronics.json'
import termsOffice from './terms/office.json'

/*
 * Muốn nạp thêm dữ liệu: thêm mục vào file JSON tương ứng (giữ ID không trùng),
 * hoặc tạo file mới rồi import và gộp vào registry bên dưới.
 */

const VOCAB: Record<Level, VocabItem[]> = {
  N5: vocabN5,
  N4: vocabN4,
  N3: vocabN3,
  N2: vocabN2,
  N1: vocabN1,
}

const KANJI: Record<Level, KanjiItem[]> = {
  N5: kanjiN5,
  N4: kanjiN4,
  N3: kanjiN3,
  N2: kanjiN2,
  N1: kanjiN1,
}

const TERMS: Record<TermCategory, VocabItem[]> = {
  it: termsIt,
  electronics: termsElectronics,
  office: termsOffice,
}

export const LEVEL_INFO: Record<Level, { name: string; ja: string }> = {
  N5: { name: 'Nhập môn', ja: '入門' },
  N4: { name: 'Sơ cấp', ja: '初級' },
  N3: { name: 'Trung cấp', ja: '中級' },
  N2: { name: 'Trung cao cấp', ja: '中上級' },
  N1: { name: 'Cao cấp', ja: '上級' },
}

export const TERM_INFO: Record<TermCategory, { name: string; ja: string; note: string }> = {
  it: { name: 'Công nghệ thông tin', ja: '情報技術', note: 'Phát triển phần mềm, dự án' },
  electronics: { name: 'Điện tử', ja: '電子', note: 'Mạch, linh kiện, sản xuất' },
  office: { name: 'Văn phòng', ja: '事務', note: 'Họp, giấy tờ, giao tiếp công sở' },
}

export const getVocab = (level: Level): VocabItem[] => VOCAB[level]
export const getKanji = (level: Level): KanjiItem[] => KANJI[level]
export const getTerms = (category: TermCategory): VocabItem[] => TERMS[category]

/** Từ vựng (hoặc thuật ngữ) thuộc một bộ học. */
export function getDeckWords(deck: Deck): VocabItem[] {
  return deck.kind === 'level' ? getVocab(deck.level) : getTerms(deck.category)
}

export function deckTitle(deck: Deck): string {
  return deck.kind === 'level' ? `${deck.level} ${LEVEL_INFO[deck.level].name}` : TERM_INFO[deck.category].name
}

export function deckPath(deck: Deck): string {
  return deck.kind === 'level' ? `/level/${deck.level}` : `/terms/${deck.category}`
}

export type StudyEntry =
  | { kind: 'word'; item: VocabItem; deck: Deck }
  | { kind: 'kanji'; item: KanjiItem; deck: Deck }

/** Bảng tra mọi mục theo ID — dùng cho ôn tập SRS. */
export const ENTRY_BY_ID: Map<string, StudyEntry> = (() => {
  const map = new Map<string, StudyEntry>()
  for (const level of Object.keys(VOCAB) as Level[]) {
    const deck: Deck = { kind: 'level', level }
    for (const item of VOCAB[level]) map.set(item.id, { kind: 'word', item, deck })
    for (const item of KANJI[level]) map.set(item.id, { kind: 'kanji', item, deck })
  }
  for (const category of Object.keys(TERMS) as TermCategory[]) {
    const deck: Deck = { kind: 'terms', category }
    for (const item of TERMS[category]) map.set(item.id, { kind: 'word', item, deck })
  }
  return map
})()

/** Tất cả ID trong một bộ (từ vựng + kanji nếu là cấp độ). */
export function deckIds(deck: Deck): string[] {
  const words = getDeckWords(deck).map((w) => w.id)
  return deck.kind === 'level' ? [...words, ...getKanji(deck.level).map((k) => k.id)] : words
}

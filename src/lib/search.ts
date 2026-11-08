import { isRomaji, toHiragana } from 'wanakana'
import type { GrammarEntry, KanjiEntry, Level, VocabItem } from '../types'

/** Chữ thường, bỏ dấu tiếng Việt (đ → d), gộp khoảng trắng: "Tham Gia" → "tham gia". */
export function normalizeVi(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const JAPANESE = /[぀-ヿ㐀-鿿ｦ-ﾟ々〆ー]/

export const hasJapanese = (text: string) => JAPANESE.test(text)

/** Đưa kana về hiragana để "データ" và "でえた" so khớp được với nhau. */
export function normalizeKana(text: string): string {
  return toHiragana(text.replace(/\s+/g, ''), { passRomaji: true })
}

export type SearchKind = 'word' | 'kanji' | 'grammar'

export interface SearchDoc {
  kind: SearchKind
  id: string
  title: string
  /** Cách đọc (từ vựng) hoặc âm Hán Việt (kanji) */
  reading?: string
  /** Nghĩa / mô tả ngắn */
  subtitle: string
  /** Nhãn bộ hoặc cấp: "N5", "Từ ghép", "N4 Bài 26"… */
  badge: string
  href: string
  /** Khóa tiếng Nhật đã chuẩn hóa (chữ, cách đọc dạng hiragana) */
  ja: string[]
  /** Khóa tiếng Việt đã bỏ dấu (nghĩa, Hán Việt) */
  vi: string[]
}

export function vocabDocs(items: readonly VocabItem[], deckLabel: string): SearchDoc[] {
  return items.map((w) => ({
    kind: 'word',
    id: w.id,
    title: w.word,
    reading: w.reading && w.reading !== w.word ? w.reading : undefined,
    subtitle: w.meaning,
    badge: deckLabel,
    href: `/word/${w.id}`,
    ja: [w.word, ...(w.alt ?? []), w.reading ? normalizeKana(w.reading) : '', ...(w.readingAlt ?? []).map(normalizeKana)].filter(Boolean),
    vi: [normalizeVi(w.meaning), w.hanViet ? normalizeVi(w.hanViet) : ''].filter(Boolean),
  }))
}

export function kanjiDocs(items: readonly KanjiEntry[]): SearchDoc[] {
  return items.map((k) => ({
    kind: 'kanji',
    id: k.id,
    title: k.kanji,
    reading: [k.hanViet, ...(k.hanVietAlt ?? [])].join(', '),
    subtitle: `${k.wordCount} từ chứa chữ này`,
    badge: k.firstLevel ? `từ ${k.firstLevel}` : 'Kanji',
    href: `/kanji?k=${encodeURIComponent(k.kanji)}`,
    ja: [k.kanji],
    vi: [k.hanViet, ...(k.hanVietAlt ?? [])].map(normalizeVi),
  }))
}

export function grammarDocs(items: readonly GrammarEntry[], level: Level): SearchDoc[] {
  return items.map((g) => ({
    kind: 'grammar',
    id: g.id,
    title: g.title,
    subtitle: g.meaning ? g.meaning.slice(0, 90) : 'Mở để xem giải thích',
    badge: `${level}${g.lesson ? ` Bài ${g.lesson}` : ''}`,
    href: `/grammar/${level.toLowerCase()}/${g.id}`,
    // Bỏ "～" / "A " ở đầu mẫu để "として" khớp phần đầu của "～として（は）".
    ja: [normalizeKana(g.title.replace(/^(?:[～〜~]|[A-ZＡ-Ｚ]\s)+/, ''))],
    vi: [normalizeVi(g.title), g.meaning ? normalizeVi(g.meaning) : ''].filter(Boolean),
  }))
}

/** 0 = khớp đúng cả khóa, 0.25 = khớp đúng một nghĩa con, 1 = khớp phần đầu, 2 = có chứa; -1 = không khớp. */
function matchScore(keys: readonly string[], q: string): number {
  let best = -1
  keys.forEach((k, i) => {
    if (!k) return
    // Khóa đứng trước quan trọng hơn (nghĩa trước Hán Việt, chữ viết trước cách đọc).
    const penalty = i * 0.1
    let base = -1
    if (k === q) base = 0
    // Khớp đúng một nghĩa trong danh sách "a, b; c": gần như khớp đúng, xếp sau khớp cả khóa.
    else if (k.split(/[,;/]\s*/).some((part) => part.trim() === q)) base = 0.25
    else if (k.startsWith(q)) base = 1
    else if (k.includes(q)) base = 2
    if (base !== -1 && (best === -1 || base + penalty < best)) best = base + penalty
  })
  return best
}

export interface SearchResults {
  word: SearchDoc[]
  kanji: SearchDoc[]
  grammar: SearchDoc[]
  total: number
}

const KIND_ORDER: Record<SearchKind, number> = { word: 0, kanji: 1, grammar: 2 }

/**
 * Tìm theo chữ Nhật, kana, romaji, Hán Việt hoặc nghĩa tiếng Việt (không phân biệt dấu, hoa thường).
 * Trả tối đa `limit` kết quả, xếp theo độ khớp, nhóm theo loại.
 */
export function search(docs: readonly SearchDoc[], query: string, limit = 50): SearchResults {
  const empty: SearchResults = { word: [], kanji: [], grammar: [], total: 0 }
  const raw = query.trim()
  if (!raw) return empty

  const jaQueries: string[] = []
  const viQuery = hasJapanese(raw) ? '' : normalizeVi(raw)
  if (hasJapanese(raw)) jaQueries.push(raw, normalizeKana(raw))
  else if (raw.length >= 2 && isRomaji(raw.replace(/[\s'-]/g, ''))) {
    // Romaji → hiragana ("sanka" → "さんか"); dư chữ Latin nghĩa là không phải romaji hợp lệ.
    const kana = toHiragana(raw.toLowerCase().replace(/\s+/g, ''))
    if (hasJapanese(kana) && !/[a-z]/.test(kana)) jaQueries.push(kana)
  }

  const scored: { doc: SearchDoc; score: number; order: number }[] = []
  docs.forEach((doc, order) => {
    let score = -1
    for (const q of jaQueries) {
      const s = matchScore(doc.ja, q)
      if (s !== -1 && (score === -1 || s < score)) score = s
    }
    if (viQuery) {
      const s = matchScore(doc.vi, viQuery)
      // Khớp nghĩa tiếng Việt xếp sau khớp tiếng Nhật cùng mức.
      if (s !== -1 && (score === -1 || s + 0.5 < score)) score = s + 0.5
    }
    if (score !== -1) scored.push({ doc, score, order })
  })

  scored.sort((a, b) => a.score - b.score || KIND_ORDER[a.doc.kind] - KIND_ORDER[b.doc.kind] || a.order - b.order)
  const top = scored.slice(0, limit)
  const out: SearchResults = { word: [], kanji: [], grammar: [], total: top.length }
  for (const { doc } of top) out[doc.kind].push(doc)
  return out
}

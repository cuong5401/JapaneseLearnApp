import type { GrammarEntry, KanjiEntry, VocabEntry } from './data'

export type { DataFile, DataManifest, GrammarEntry, GrammarExample, KanjiEntry, RadicalEntry, VocabEntry } from './data'

export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
export type Level = (typeof LEVELS)[number]

export const TERM_CATEGORIES = ['it', 'electronics', 'office'] as const
export type TermCategory = (typeof TERM_CATEGORIES)[number]

/** Bộ từ lấy từ public/data (tải khi cần). */
export const VOCAB_DECKS = ['n5', 'n4', 'n3', 'n2', 'n1', 'compounds', 'onomatopoeia', 'adverbs'] as const
export type VocabDeckKey = (typeof VOCAB_DECKS)[number]

export interface Example {
  /** Câu tiếng Nhật */
  ja: string
  /** Bản dịch tiếng Việt */
  vi: string
}

/**
 * Một mục từ vựng dùng trong toàn app: dữ liệu public/data (VocabEntry)
 * hoặc thuật ngữ chuyên ngành có sẵn câu ví dụ.
 */
export type VocabItem = VocabEntry & { example?: Example }

export type KanaScript = 'hiragana' | 'katakana'
export type KanaGroup = 'basic' | 'dakuten' | 'yoon'

export interface KanaChar {
  /** "h-ka", "k-shi", "h-ji-d" (ぢ): ổn định, dùng làm khóa lưu mức thuộc */
  id: string
  kana: string
  romaji: string
  script: KanaScript
  group: KanaGroup
  /** id hàng trong bảng ("h-basic-k") */
  row: string
  /** Cột (0 = a / ya) */
  col: number
}

/** Một bộ học: bộ từ trong public/data hoặc nhóm thuật ngữ có sẵn. */
export type Deck = { kind: 'vocab'; key: VocabDeckKey } | { kind: 'terms'; category: TermCategory }

/** Một mục bất kỳ tra được theo ID (dùng cho Ôn tập, tìm kiếm). */
export type StudyEntry =
  | { kind: 'word'; item: VocabItem; deck: Deck }
  | { kind: 'kanji'; item: KanjiEntry }
  | { kind: 'grammar'; item: GrammarEntry }

/** Thẻ ôn tập ngắt quãng (SM-2 rút gọn). */
export interface SrsCard {
  id: string
  /** Hệ số dễ (>= 1.3) */
  ease: number
  /** Khoảng cách ôn tiếp theo, tính bằng ngày */
  interval: number
  /** Số lần trả lời đúng liên tiếp */
  repetitions: number
  /** Thời điểm đến hạn (ms since epoch) */
  due: number
  lastReviewed: number
}

/** Mức đánh giá khi ôn: 0–5 theo SM-2. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5

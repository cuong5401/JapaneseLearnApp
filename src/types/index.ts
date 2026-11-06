export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
export type Level = (typeof LEVELS)[number]

export const TERM_CATEGORIES = ['it', 'electronics', 'office'] as const
export type TermCategory = (typeof TERM_CATEGORIES)[number]

export interface Example {
  /** Câu tiếng Nhật */
  ja: string
  /** Bản dịch tiếng Việt */
  vi: string
}

/** Một mục từ vựng (dùng chung cho từ vựng JLPT và thuật ngữ chuyên ngành). */
export interface VocabItem {
  /** ID ổn định, ví dụ "n5-v-001", "it-001" — làm khóa cho tiến độ SRS. */
  id: string
  /** Cách viết (kanji/kana) */
  word: string
  /** Cách đọc bằng kana */
  reading: string
  /** Nghĩa tiếng Việt */
  meaning: string
  /** Từ loại (tùy chọn) */
  pos?: string
  example?: Example
}

export interface KanjiCompound {
  word: string
  reading: string
  meaning: string
}

export interface KanjiItem {
  /** ID ổn định, ví dụ "n5-k-001" */
  id: string
  kanji: string
  /** Âm On (katakana) */
  onyomi: string[]
  /** Âm Kun (hiragana, phần okurigana đặt trong ngoặc) */
  kunyomi: string[]
  /** Âm Hán Việt */
  hanViet: string
  /** Nghĩa tiếng Việt */
  meaning: string
  strokes?: number
  compounds: KanjiCompound[]
}

export type KanaScript = 'hiragana' | 'katakana'
export type KanaGroup = 'basic' | 'dakuten' | 'yoon'

export interface KanaChar {
  kana: string
  romaji: string
  script: KanaScript
  group: KanaGroup
}

/** Một bộ học: theo cấp JLPT hoặc theo nhóm thuật ngữ. */
export type Deck =
  | { kind: 'level'; level: Level }
  | { kind: 'terms'; category: TermCategory }

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

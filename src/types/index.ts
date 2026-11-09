import type { GrammarEntry, KanjiEntry, RadicalEntry, VocabEntry } from './data'

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
/** `ai`: từ do "Hỏi AI" gợi ý, lưu riêng (lib/aiWords) khi người dùng bấm lưu vào sổ tay. */
export type Deck = { kind: 'vocab'; key: VocabDeckKey } | { kind: 'terms'; category: TermCategory } | { kind: 'ai' }

/** Một mục bất kỳ tra được theo ID (dùng cho Ôn tập, tìm kiếm). */
/** Bộ thủ kèm id `rd-001` (radicals.json không có id). */
export type RadicalItem = RadicalEntry & { id: string }

/** Chữ Hán ngoài kanji.json, lưu trong sổ tay bằng ref `ch-<hex>` (xem lib/chars). */
export interface CharItem {
  id: string
  char: string
}

export type StudyEntry =
  | { kind: 'word'; item: VocabItem; deck: Deck }
  | { kind: 'kanji'; item: KanjiEntry }
  | { kind: 'radical'; item: RadicalItem }
  | { kind: 'grammar'; item: GrammarEntry }
  | { kind: 'char'; item: CharItem }

/**
 * Thẻ ôn tập ngắt quãng FSRS (ts-fsrs 5.x): đúng các trường của `Card` ts-fsrs, ngày lưu bằng ms để JSON gọn.
 * Lưu ở localStorage `jla:v1:cards`, khóa = id mục học.
 */
export interface SrsCard {
  id: string
  /** Thời điểm đến hạn (ms) */
  due: number
  /** Độ ổn định trí nhớ (ngày để khả năng nhớ giảm còn 90%) */
  stability: number
  /** Độ khó 1–10 */
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  /** 0 Mới, 1 Đang học, 2 Ôn tập, 3 Học lại (State của ts-fsrs) */
  state: 0 | 1 | 2 | 3
  /** Lần ôn gần nhất (ms), 0 = chưa ôn */
  last_review: number
  /** Bước học (lại) hiện tại trong ngày */
  learning_steps: number
}

/** Mức chấm FSRS: 1 Quên (Again), 2 Khó (Hard), 3 Nhớ (Good), 4 Dễ (Easy). */
export type Grade = 1 | 2 | 3 | 4

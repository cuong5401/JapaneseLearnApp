import type { Level } from '../../../types'
import type { ChatMode } from '../prompts'

/** Nội dung gửi AI theo "Ngôn ngữ giải thích của AI" (không theo ngôn ngữ giao diện). */
export interface AiContent {
  /** Phần chung của system prompt */
  system: (level: Level) => string
  /** Phần riêng theo chế độ chat */
  modes: Record<ChatMode, string>
  /** Câu hỏi soạn sẵn của nút "Hỏi AI" / chip "Hỏi về …" */
  word: (w: { word: string; reading?: string; meaning: string }) => string
  kanji: (ch: string, hanViet?: string) => string
  counter: (c: { counter: string; reading: string }) => string
  grammar: (g: { title: string; meaning?: string }) => string
  /** Dữ liệu sẵn có trong app gửi kèm câu hỏi tra từ */
  context: (lines: string[]) => string
  contextKind: { kanji: string; word: string }
  question: (text: string) => string
  /** Câu hỏi kèm ảnh chữ vẽ tay ("Nhờ AI đoán") */
  drawnKanji: string
  /** Kiểm tra kết nối trong Cài đặt */
  ping: { system: string; user: string }
}

export type ExplainLang = 'vi' | 'ja'

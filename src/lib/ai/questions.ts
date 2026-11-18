import { aiContent } from './content'
import type { ChatMode } from './prompts'

/**
 * Câu hỏi soạn sẵn cho nút "Hỏi AI" và chip "Hỏi về …" trong khung chat.
 * `label` là chữ trên chip (từ / chữ đang xem), `text` gửi cho AI theo "Ngôn ngữ giải thích của AI".
 */
export interface PresetQuestion {
  mode: ChatMode
  label: string
  text: string
}

export const wordQuestion = (w: { word: string; reading?: string; meaning: string }): PresetQuestion => ({
  mode: 'lookup',
  label: w.word,
  text: aiContent().word(w),
})

export const kanjiQuestion = (ch: string, hanViet?: string): PresetQuestion => ({
  mode: 'lookup',
  label: ch,
  text: aiContent().kanji(ch, hanViet),
})

export const counterQuestion = (c: { counter: string; reading: string }): PresetQuestion => ({
  mode: 'lookup',
  label: c.counter,
  text: aiContent().counter(c),
})

export const grammarQuestion = (g: { title: string; meaning?: string }): PresetQuestion => ({
  mode: 'grammar',
  label: g.title,
  text: aiContent().grammar(g),
})

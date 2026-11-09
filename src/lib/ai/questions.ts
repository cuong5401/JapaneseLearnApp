import type { ChatMode } from './prompts'

/** Câu hỏi soạn sẵn cho nút "Hỏi AI" và chip "Hỏi về …" trong khung chat. */
export interface PresetQuestion {
  mode: ChatMode
  /** Chữ hiện trên chip: "Hỏi về 把握" */
  label: string
  text: string
}

export const wordQuestion = (w: { word: string; reading?: string; meaning: string }): PresetQuestion => ({
  mode: 'lookup',
  label: w.word,
  text: `Giải thích cách dùng ${w.word} (${[w.reading && w.reading !== w.word ? w.reading : '', w.meaning].filter(Boolean).join(', ')}) và phân biệt với từ dễ nhầm`,
})

export const kanjiQuestion = (ch: string, hanViet?: string): PresetQuestion => ({
  mode: 'lookup',
  label: ch,
  text: hanViet
    ? `Giải thích chữ Hán ${ch} (${hanViet}): ý nghĩa, cách đọc thường gặp và các từ hay dùng`
    : `Giải thích chữ Hán ${ch}: âm Hán Việt, ý nghĩa, cách đọc và các từ hay dùng`,
})

export const grammarQuestion = (g: { title: string; meaning?: string }): PresetQuestion => ({
  mode: 'grammar',
  label: g.title,
  text: `Giải thích mẫu ngữ pháp ${g.title}${g.meaning ? ` (${g.meaning.slice(0, 80)})` : ''} và phân biệt với mẫu dễ nhầm`,
})

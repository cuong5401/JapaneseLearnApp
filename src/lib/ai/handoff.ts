import type { ChatMode } from './prompts'
import type { AiImage } from './types'

/**
 * Mở "Hỏi AI" từ chỗ khác với câu hỏi soạn sẵn.
 *  - Câu chữ: qua URL `/ai?mode=…&q=…` (Back / F5 vẫn hiểu).
 *  - Ảnh (khung vẽ chữ): qua sessionStorage, không đưa vào URL.
 * Trang /ai lấy ra một lần rồi tự gửi.
 */
export const askAiHref = (mode: ChatMode, q: string) => `/ai?mode=${mode}&q=${encodeURIComponent(q)}`

const KEY = 'jla:ai-handoff'

export interface Handoff {
  mode: ChatMode
  text: string
  image?: AiImage
}

export function setHandoff(h: Handoff) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(h))
  } catch {
    /* không lưu được: bỏ qua ảnh */
  }
}

export function takeHandoff(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return raw ? (JSON.parse(raw) as Handoff) : null
  } catch {
    return null
  }
}

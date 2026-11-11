import type { Level } from '../../types'
import { loadProvider } from './providers'
import { aiSettings } from './settings'
import { AiError } from './types'

/**
 * Gọi AI một lần (không phải hội thoại): gom câu trả lời stream thành một chuỗi.
 * Dùng key / model / nhà cung cấp trong Cài đặt AI; chưa có key thì ném AiError('auth').
 */
export async function aiComplete(system: string, user: string, signal?: AbortSignal): Promise<string> {
  const { provider, hasKey } = aiSettings.getSnapshot()
  if (!hasKey) throw new AiError('auth', 'Chưa có API key')
  const ai = await loadProvider(provider)
  let out = ''
  for await (const chunk of ai.stream({ apiKey: aiSettings.key(), model: aiSettings.model(), system, messages: [{ role: 'user', text: user }], signal })) out += chunk
  return out.trim()
}

/** Đánh dấu yêu cầu (provider mock ở bản dev nhận ra để trả kết quả giả cho test). */
export const TRANSLATE_TAG = 'kotonoha-translate'
export const EXAMPLES_TAG = 'kotonoha-examples'

export async function translateToVi(ja: string, en: string | undefined, signal?: AbortSignal): Promise<string> {
  const text = await aiComplete(
    'Bạn là người dịch Nhật–Việt. Dịch câu tiếng Nhật sang tiếng Việt tự nhiên, sát nghĩa. Chỉ trả về đúng câu dịch, không giải thích, không ngoặc kép.',
    `[${TRANSLATE_TAG}]\nCâu tiếng Nhật: ${ja}${en ? `\nBản dịch tiếng Anh tham khảo: ${en}` : ''}`,
    signal,
  )
  return text.split('\n')[0].replace(/^["“「]|["”」]$/g, '').trim()
}

export interface AiExample {
  ja: string
  vi: string
}

/** Đọc mảng JSON [{ja, vi}] trong câu trả lời (có thể bọc trong ```json). Sai định dạng thì ném lỗi. */
export function parseAiExamples(text: string): AiExample[] {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) throw new Error('AI không trả về danh sách câu')
  const raw = JSON.parse(m[0]) as unknown
  if (!Array.isArray(raw)) throw new Error('AI không trả về danh sách câu')
  const out = raw
    .filter((x): x is AiExample => Boolean(x) && typeof x.ja === 'string' && typeof x.vi === 'string' && x.ja.trim() !== '' && x.vi.trim() !== '')
    .map((x) => ({ ja: x.ja.trim(), vi: x.vi.trim() }))
  if (!out.length) throw new Error('AI không trả về câu hợp lệ')
  return out.slice(0, 3)
}

/** 3 câu ví dụ ngắn, tự nhiên, đúng trình độ của từ. */
export async function generateExamples(word: string, reading: string, meaning: string, level: Level, signal?: AbortSignal): Promise<AiExample[]> {
  const text = await aiComplete(
    `Bạn là giáo viên tiếng Nhật cho người Việt. Viết câu ví dụ tự nhiên, đời thường, đúng ngữ pháp, dùng từ vựng và ngữ pháp ở trình độ JLPT ${level} trở xuống (trừ chính từ được hỏi). Chỉ trả về JSON, không giải thích.`,
    `[${EXAMPLES_TAG}]\nTừ: ${word}${reading && reading !== word ? ` (${reading})` : ''} — nghĩa: ${meaning}\nViết 3 câu ví dụ khác nhau (8–30 ký tự), mỗi câu chứa đúng từ này (động từ / tính từ được chia).\nTrả về: [{"ja": "câu tiếng Nhật", "vi": "bản dịch tiếng Việt"}]`,
    signal,
  )
  return parseAiExamples(text)
}

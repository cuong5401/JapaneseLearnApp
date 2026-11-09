import type { KanaChar, VocabItem } from '../types'

/** Chữ nhỏ ghép sau (きゃ, しゅ…): từ bắt đầu bằng き + ゃ không phải ví dụ của き. */
const SMALL = /^[ゃゅょぁぃぅぇぉャュョァィゥェォ]/

/**
 * Một từ ví dụ đơn giản bắt đầu bằng chữ kana đó.
 *  - Hiragana: cách đọc bắt đầu bằng chữ (ưu tiên từ viết toàn kana, rồi từ ngắn).
 *  - Katakana: từ viết bằng katakana bắt đầu bằng chữ đó.
 * Không có thì null (mặt sau thẻ ẩn mục ví dụ).
 */
export function kanaExample(k: KanaChar, words: readonly VocabItem[]): VocabItem | null {
  let best: VocabItem | null = null
  let bestScore = Infinity
  for (const w of words) {
    const text = k.script === 'katakana' ? w.word : w.reading || w.word
    if (!text.startsWith(k.kana) || SMALL.test(text.slice(k.kana.length))) continue
    if (k.script === 'katakana' && !/^[゠-ヿー]+$/.test(w.word)) continue
    if (!w.meaning) continue
    // Ngắn trước; từ có chữ Hán dễ nhớ hơn một chút nhưng cách đọc phải ngắn.
    const score = [...text].length * 2 + (w.meaning.length > 30 ? 3 : 0)
    if (score < bestScore) {
      best = w
      bestScore = score
    }
  }
  return best
}

/** Ví dụ cho cả danh sách chữ (tính một lần mỗi phiên). */
export function kanaExamples(chars: readonly KanaChar[], words: readonly VocabItem[]): Map<string, VocabItem> {
  const out = new Map<string, VocabItem>()
  for (const k of chars) {
    const w = kanaExample(k, words)
    if (w) out.set(k.id, w)
  }
  return out
}

/** Tách phần hiển thị và khối từ vựng trong câu trả lời của AI; tách furigana dạng 漢字{かんじ}. */

export interface AiWord {
  word: string
  reading: string
  meaning: string
  hanViet: string
}

const FENCE = '```kotonoha-words'

function toWords(raw: unknown): AiWord[] {
  if (!Array.isArray(raw)) return []
  const out: AiWord[] = []
  const seen = new Set<string>()
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
    // AI đôi khi vẫn chèn furigana vào JSON: bỏ phần {…}.
    const word = s(o.word).replace(/\{[^}]*\}/g, '')
    const meaning = s(o.meaning)
    if (!word || !meaning || seen.has(word)) continue
    seen.add(word)
    out.push({ word, reading: s(o.reading).replace(/\{[^}]*\}/g, ''), meaning, hanViet: s(o.hanViet).toUpperCase() })
    if (out.length >= 8) break
  }
  return out
}

/**
 * `body` là phần Markdown để hiển thị (đã bỏ khối kotonoha-words), `words` là các từ hợp lệ.
 * Khi đang stream, khối chưa đóng cũng bị ẩn để người dùng không thấy JSON dở dang.
 */
export function extractWords(text: string): { body: string; words: AiWord[] } {
  const start = text.indexOf(FENCE)
  if (start < 0) {
    // Có thể đang stream tới giữa dòng mở khối: ẩn phần đuôi bắt đầu bằng ``` chưa đủ dòng.
    const tail = text.lastIndexOf('```')
    if (tail >= 0 && !text.slice(tail).includes('\n') && FENCE.startsWith(text.slice(tail))) return { body: text.slice(0, tail).trimEnd(), words: [] }
    return { body: text, words: [] }
  }
  const after = text.slice(start + FENCE.length)
  const end = after.indexOf('```')
  const body = (text.slice(0, start) + (end >= 0 ? after.slice(end + 3) : '')).trimEnd()
  if (end < 0) return { body, words: [] }
  try {
    return { body, words: toWords(JSON.parse(after.slice(0, end))) }
  } catch {
    return { body, words: [] }
  }
}

export type FuriganaPart = { text: string; ruby?: string }

/** Cụm chữ Hán (kèm 々〆ヶ) đứng ngay trước {kana} → ruby. Phần khác giữ nguyên. */
const RUBY = /([㐀-鿿豈-﫿々〆ヶ]+)\{([぀-ヿー・\s]+)\}/g

export function splitFurigana(text: string): FuriganaPart[] {
  const out: FuriganaPart[] = []
  let last = 0
  for (const m of text.matchAll(RUBY)) {
    const i = m.index ?? 0
    if (i > last) out.push({ text: text.slice(last, i) })
    out.push({ text: m[1], ruby: m[2].trim() })
    last = i + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

/** Bỏ furigana (đọc to, tiêu đề cuộc trò chuyện, tìm kiếm): 日本{にほん} → 日本. */
export const stripFurigana = (text: string) => text.replace(RUBY, '$1')

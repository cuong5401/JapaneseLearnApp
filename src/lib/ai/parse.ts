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

/**
 * Một đoạn sau khi tách furigana:
 *  - `ruby`: chữ Hán + cách đọc (hiện <ruby>);
 *  - `note`: phần trong ngoặc nhọn KHÔNG phải furigana hợp lệ (romaji, cách đọc đứng sau kana…): bỏ ngoặc, hiện chữ nhỏ mờ.
 */
export type FuriganaPart = { text: string; ruby?: string; note?: boolean }

const KANJI = /[㐀-鿿豈-﫿々〆ヶ]/
const KANJI_RUN = /[㐀-鿿豈-﫿々〆ヶ]+$/
const KANA_ONLY = /^[぀-ヿー・\s]+$/
/** Romaji / ghi chú cách đọc AI hay viết nhầm vào ngoặc nhọn: "gatsu", "a.u", "o-kane". */
const ROMAJI = /^[A-Za-zÀ-ɏ.'’\-\s]+$/
/** Ngoặc nhọn ngắn trên một dòng (không lồng). */
const BRACE = /(\s?)\{([^{}\n]{1,40})\}/g

/**
 * Tách furigana dạng 漢字{かな}. Chỉ thành <ruby> khi NGAY trước `{` (không khoảng trắng) là chữ Hán và trong ngoặc
 * toàn kana. Trường hợp khác:
 *  - romaji ("がつ {gatsu}", "あ.う {a.u}", "日{nichi}") → bỏ ngoặc, `note` (chữ nhỏ mờ);
 *  - kana đứng sau kana / sau khoảng trắng ("がつ{がつ}") → trùng phần chữ trước thì bỏ hẳn, khác thì thành `note`;
 *  - nội dung khác (chữ Việt, ký hiệu mẫu ngữ pháp…) → giữ nguyên văn.
 */
export function splitFurigana(text: string): FuriganaPart[] {
  const out: FuriganaPart[] = []
  let last = 0
  const push = (t: string) => {
    if (!t) return
    const prev = out[out.length - 1]
    if (prev && !prev.ruby && !prev.note) prev.text += t
    else out.push({ text: t })
  }
  for (const m of text.matchAll(BRACE)) {
    const i = m.index ?? 0
    const space = m[1]
    const inner = m[2].trim()
    const before = text.slice(last, i)
    const kanaInside = KANA_ONLY.test(inner)
    const kanjiRun = before.match(KANJI_RUN)
    if (!space && kanaInside && kanjiRun) {
      push(before.slice(0, before.length - kanjiRun[0].length))
      out.push({ text: kanjiRun[0], ruby: inner })
    } else if (ROMAJI.test(inner) && /[A-Za-z]/.test(inner)) {
      push(before)
      out.push({ text: inner, note: true })
    } else if (kanaInside) {
      // Cách đọc sau kana: lặp lại đúng chữ đứng trước thì bỏ, khác thì hiện nhỏ.
      push(before)
      if (!before.replace(/\s+$/, '').endsWith(inner)) out.push({ text: inner, note: true })
    } else {
      push(before + m[0])
    }
    last = i + m[0].length
  }
  push(text.slice(last))
  return out
}

/** Bỏ furigana và ghi chú romaji (đọc to, tiêu đề cuộc trò chuyện, tìm kiếm): 日本{にほん} → 日本, がつ {gatsu} → がつ. */
export const stripFurigana = (text: string) =>
  text.includes('{')
    ? splitFurigana(text)
        .filter((p) => !p.note)
        .map((p) => p.text)
        .join('')
    : text

/** Có ít nhất một chữ Hán (dùng trong test / kiểm tra nhanh). */
export const hasKanji = (s: string) => KANJI.test(s)

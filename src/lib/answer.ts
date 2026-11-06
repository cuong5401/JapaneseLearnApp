import { toHiragana, toRomaji } from 'wanakana'

/** Đổi trường âm "ー" thành nguyên âm tương ứng: さーばー → さあばあ. */
function expandChoon(hira: string): string {
  let out = ''
  for (const ch of hira) {
    if (ch === 'ー' && out.length > 0) {
      const vowel = toRomaji(out.slice(-1)).slice(-1)
      out += 'aiueo'.includes(vowel) ? toHiragana(vowel) : ch
    } else {
      out += ch
    }
  }
  return out
}

/** Chuẩn hóa câu trả lời gõ bằng romaji hoặc kana về hiragana để so sánh. */
export function normalizeReading(input: string): string {
  const cleaned = input.trim().toLowerCase().replace(/[\s・.,、。]/g, '')
  return expandChoon(toHiragana(cleaned))
}

export function readingMatches(input: string, reading: string): boolean {
  return normalizeReading(input) !== '' && normalizeReading(input) === normalizeReading(reading)
}

/** Kana: chấp nhận mọi cách gõ romaji (si/shi, tu/tsu, di/ji…). */
export function kanaMatches(input: string, kana: string): boolean {
  const typed = input.trim().toLowerCase()
  if (!typed) return false
  return toRomaji(toHiragana(typed)) === toRomaji(kana)
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

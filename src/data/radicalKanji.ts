import data from './radical-kanji.json'

/**
 * Chữ Hán (trong kanji.json) thuộc từng bộ thủ, theo bộ chính trong Unicode Unihan (kRSUnicode).
 * Sinh bằng scripts/build-radical-kanji.mjs. Chữ đã sắp theo số từ chứa chữ, nhiều trước.
 */
const MAP = data.radicals as Record<string, string[]>

export function kanjiOfRadical(no: number): string[] {
  return MAP[String(no)] ?? []
}

export const RADICAL_SOURCE = data.source

let reverse: Map<string, number> | null = null

/** Bộ chính của một chữ Hán (số 1–214), hoặc null nếu chữ không có trong bảng. */
export function radicalOfKanji(ch: string): number | null {
  if (!reverse) {
    reverse = new Map()
    for (const [no, chars] of Object.entries(MAP)) for (const c of chars) reverse.set(c, Number(no))
  }
  return reverse.get(ch) ?? null
}

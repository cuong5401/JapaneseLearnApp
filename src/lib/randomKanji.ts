import type { KanjiEntry } from '../types'

/** Số chữ vừa hiện gần nhất không được chọn lại. */
export const RECENT_LIMIT = 5
const KEY = 'jla:random-kanji:recent'

/** Nguồn chọn: chữ có trong từ vựng JLPT (có firstLevel), bỏ chữ chỉ gặp trong từ ghép. */
export const kanjiPool = (index: readonly KanjiEntry[]) => index.filter((k) => k.firstLevel !== null)

/** Chọn ngẫu nhiên một chữ không thuộc `recent`; pool quá nhỏ thì chỉ tránh chữ vừa hiện. */
export function pickRandom<T extends { id: string }>(pool: readonly T[], recent: readonly string[], rng: () => number = Math.random): T | undefined {
  if (!pool.length) return undefined
  const skip = new Set(recent)
  let candidates = pool.filter((k) => !skip.has(k.id))
  if (!candidates.length) {
    const last = recent[recent.length - 1]
    candidates = pool.length > 1 ? pool.filter((k) => k.id !== last) : [...pool]
  }
  return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))]
}

/** Thêm id vào cuối danh sách gần đây, giữ tối đa RECENT_LIMIT mục, không trùng. */
export const addRecent = (recent: readonly string[], id: string) => [...recent.filter((x) => x !== id), id].slice(-RECENT_LIMIT)

export function readRecent(): string[] {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(-RECENT_LIMIT) : []
  } catch {
    return []
  }
}

export function pushRecent(id: string): string[] {
  const next = addRecent(readRecent(), id)
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Bị chặn bộ nhớ phiên: vẫn chọn ngẫu nhiên, chỉ không nhớ được chữ gần đây.
  }
  return next
}

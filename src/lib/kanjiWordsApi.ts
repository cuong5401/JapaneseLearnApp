/**
 * Tra thêm từ vựng chứa một chữ Hán qua API từ điển Nhật–Việt Mazii (khi có mạng).
 * API không chính thức: lỗi, hết giờ hay đổi định dạng đều trả [] để thẻ chỉ hiện từ có sẵn.
 */
export const MAZII_URL = 'https://mazii.net/api/search'
const TIMEOUT_MS = 5000
const CACHE_KEY = 'jla:mazii:'

export interface OnlineWord {
  word: string
  reading: string
  meaning: string
  /** Cấp JLPT nếu Mazii có (N5…N1) */
  level?: string
}

const LEVEL_RANK: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 }
const rank = (w: OnlineWord) => (w.level ? (LEVEL_RANK[w.level] ?? 5) : 5)

/** Đọc kết quả Mazii: giữ từ chứa `ch`, bỏ từ trong `exclude`, sắp cấp thấp trước (giữ thứ tự gốc khi cùng cấp). */
export function parseMazii(json: unknown, ch: string, exclude: readonly string[] = []): OnlineWord[] {
  const data = (json as { data?: unknown } | null)?.data
  if (!Array.isArray(data)) return []
  const skip = new Set(exclude)
  const out: OnlineWord[] = []
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as { word?: unknown; phonetic?: unknown; short_mean?: unknown; level?: unknown }
    const word = typeof r.word === 'string' ? r.word.trim() : ''
    const meaning = typeof r.short_mean === 'string' ? r.short_mean.trim() : ''
    if (!word || !meaning || !word.includes(ch) || skip.has(word)) continue
    skip.add(word)
    const reading = typeof r.phonetic === 'string' ? (r.phonetic.trim().split(/\s+/)[0] ?? '') : ''
    const levels = Array.isArray(r.level) ? r.level.filter((l): l is string => typeof l === 'string' && l in LEVEL_RANK) : []
    const level = levels.sort((a, b) => LEVEL_RANK[a] - LEVEL_RANK[b])[0]
    out.push({ word, reading, meaning, ...(level ? { level } : {}) })
  }
  return out.map((w, i) => [w, i] as const).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([w]) => w)
}

const memory = new Map<string, OnlineWord[]>()

function readCache(ch: string): OnlineWord[] | undefined {
  if (memory.has(ch)) return memory.get(ch)
  try {
    const raw = sessionStorage.getItem(CACHE_KEY + ch)
    if (raw) {
      const v = JSON.parse(raw) as OnlineWord[]
      if (Array.isArray(v)) {
        memory.set(ch, v)
        return v
      }
    }
  } catch {
    // bỏ qua cache hỏng
  }
  return undefined
}

function writeCache(ch: string, words: OnlineWord[]) {
  memory.set(ch, words)
  try {
    sessionStorage.setItem(CACHE_KEY + ch, JSON.stringify(words))
  } catch {
    // bộ nhớ phiên bị chặn
  }
}

/** Tra từ chứa `ch` (đã lọc, sắp xếp; chưa bỏ trùng với từ local). Không bao giờ ném lỗi. */
export async function fetchKanjiWords(ch: string, signal?: AbortSignal, fetchFn: typeof fetch = fetch): Promise<OnlineWord[]> {
  const cached = readCache(ch)
  if (cached) return cached
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetchFn(MAZII_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dict: 'javi', type: 'word', query: ch, limit: 20, page: 1 }),
      signal: ctrl.signal,
    })
    if (!res.ok) return []
    const words = parseMazii(await res.json(), ch)
    writeCache(ch, words)
    return words
  } catch {
    return []
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

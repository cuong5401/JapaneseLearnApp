/**
 * Câu ví dụ từ Tatoeba (https://tatoeba.org, API v1 công khai, chỉ đọc, không cần key, CORS `*`).
 * Câu: CC BY 2.0 FR (ghi nguồn bằng link tới câu gốc). Audio: giấy phép riêng từng file (ghi tác giả).
 */
export const TATOEBA_API = 'https://api.tatoeba.org/v1/sentences'
export const TIMEOUT_MS = 6000
/** Số câu hiện mỗi lần ("Ví dụ khác" lấy bộ tiếp theo). */
export const PAGE = 3

export interface ExampleItem {
  /** "t:<id Tatoeba>" hoặc "ai:<n>" */
  key: string
  ja: string
  vi?: string
  en?: string
  /** Bản dịch tiếng Việt do AI dịch từ câu tiếng Anh */
  viByAi?: boolean
  src: 'tatoeba' | 'ai'
  /** Id câu Tatoeba */
  tid?: number
  owner?: string | null
  /** Audio Tatoeba: phát ở audioUrl(id) */
  audioId?: number
  audioBy?: string
}

export const audioUrl = (id: number) => `https://api.tatoeba.org/v1/audios/${id}/file`
export const sentenceUrl = (id: number) => `https://tatoeba.org/vi/sentences/show/${id}`

export interface SearchTerms {
  /** Chữ của từ và các cách viết khác (đã chuẩn hóa) */
  variants: string[]
  /** Gốc để khớp dạng chia (食べる → 食べ, 遺伝する → 遺伝); null nếu không chia */
  stem: string | null
  /** Chuỗi gửi lên Tatoeba */
  query: string
}

const HIRA_END_VERB = /[うくぐすつぬぶむる]$/
const HAS_KANJI = /[㐀-鿿々]/

/** Bỏ phần ghi chú (（な）, (する)…), dấu ～, dấu cách. */
export function cleanWord(w: string): string {
  return w
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[～〜~]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

export function searchTerms(word: string, alt: readonly string[] = []): SearchTerms {
  const variants = [...new Set([word, ...alt].map(cleanWord).filter(Boolean))].sort((a, b) => b.length - a.length)
  const base = cleanWord(word)
  let stem: string | null = null
  if (base.length > 2 && base.endsWith('する')) stem = base.slice(0, -2)
  else if (base.length > 1 && (HIRA_END_VERB.test(base) || base.endsWith('い')) && HAS_KANJI.test(base.slice(0, -1))) stem = base.slice(0, -1)
  return { variants, stem, query: stem ?? base }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Gốc + đuôi chia (kana): 食べ|ます, 遺伝|する. Không khớp 高|校 (sau gốc phải là kana). */
const stemRe = (stem: string) => new RegExp(`${escapeRe(stem)}[ぁ-ゖ]`)

export function containsTerm(ja: string, t: SearchTerms): boolean {
  return t.variants.some((v) => ja.includes(v)) || (t.stem !== null && stemRe(t.stem).test(ja))
}

/** Tách câu thành đoạn thường / đoạn chứa từ (để tô đậm). */
export function highlight(ja: string, t: SearchTerms): { text: string; hit: boolean }[] {
  const pats = [...t.variants.map(escapeRe), ...(t.stem ? [escapeRe(t.stem)] : [])].filter(Boolean)
  if (!pats.length) return [{ text: ja, hit: false }]
  const re = new RegExp(`(${pats.join('|')})`, 'g')
  const out: { text: string; hit: boolean }[] = []
  let last = 0
  for (const m of ja.matchAll(re)) {
    if (m.index > last) out.push({ text: ja.slice(last, m.index), hit: false })
    out.push({ text: m[0], hit: true })
    last = m.index + m[0].length
  }
  if (last < ja.length) out.push({ text: ja.slice(last), hit: false })
  return out
}

/* ───────────── Gọi API ───────────── */

interface RawSentence {
  id: number
  text: string
  is_unapproved?: boolean
  owner?: string | null
  translations?: { lang: string | null; text: string; is_unapproved?: boolean }[]
  audios?: { id: number; author?: string | null }[]
}

export interface Candidate extends ExampleItem {
  unapproved?: boolean
}

export function parseSentences(json: unknown): { items: Candidate[]; next: string | null } {
  const j = json as { data?: unknown; paging?: { next?: unknown } } | null
  const data = Array.isArray(j?.data) ? (j!.data as RawSentence[]) : []
  const items: Candidate[] = []
  for (const s of data) {
    if (!s || typeof s.id !== 'number' || typeof s.text !== 'string') continue
    const tr = (lang: string) => s.translations?.find((t) => t.lang === lang && !t.is_unapproved)?.text
    const audio = s.audios?.[0]
    items.push({
      key: `t:${s.id}`,
      ja: s.text.trim(),
      vi: tr('vie'),
      en: tr('eng'),
      src: 'tatoeba',
      tid: s.id,
      owner: s.owner ?? null,
      ...(audio ? { audioId: audio.id, audioBy: audio.author ?? undefined } : {}),
      ...(s.is_unapproved ? { unapproved: true } : {}),
    })
  }
  const next = typeof j?.paging?.next === 'string' && j.paging.next.startsWith(TATOEBA_API) ? j.paging.next : null
  return { items, next }
}

/** Gộp tín hiệu hủy của panel với timeout 6 giây. */
function withTimeout(signal: AbortSignal | undefined, ms: number) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new DOMException('Hết thời gian chờ Tatoeba', 'TimeoutError')), ms)
  const onAbort = () => ctrl.abort(signal?.reason)
  if (signal?.aborted) ctrl.abort(signal.reason)
  else signal?.addEventListener('abort', onAbort, { once: true })
  return {
    signal: ctrl.signal,
    done: () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    },
  }
}

export function searchUrl(query: string, extra = '') {
  return `${TATOEBA_API}?lang=jpn&q=${encodeURIComponent(query)}&sort=relevance&limit=30&showtrans:lang=vie,eng&include=audios${extra}`
}

async function getJson(url: string, signal: AbortSignal, fetchFn: typeof fetch) {
  const res = await fetchFn(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Tatoeba ${res.status}`)
  return res.json()
}

export interface FetchOptions {
  signal?: AbortSignal
  fetchFn?: typeof fetch
  timeoutMs?: number
  /** Trang tiếp (paging.next của lần trước) */
  next?: string
}

/**
 * Tìm câu tiếng Nhật chứa từ, kèm bản dịch Việt / Anh và audio. Trang đầu: nếu ít câu có tiếng Việt thì gọi thêm một
 * lần lọc `trans:lang=vie`. Ném lỗi khi mạng lỗi / hết giờ / bị hủy.
 */
export async function fetchTatoeba(t: SearchTerms, opts: FetchOptions = {}): Promise<{ items: Candidate[]; next: string | null }> {
  const fetchFn = opts.fetchFn ?? fetch
  /** Mỗi request có timeout riêng (Tatoeba thường trả lời 1–3 giây mỗi lần). */
  const get = async (url: string) => {
    const { signal, done } = withTimeout(opts.signal, opts.timeoutMs ?? TIMEOUT_MS)
    try {
      return parseSentences(await getJson(url, signal, fetchFn))
    } finally {
      done()
    }
  }
  if (opts.next) return get(opts.next)
  const first = await get(searchUrl(t.query))
  const vie = first.items.filter((c) => c.vi && containsTerm(c.ja, t)).length
  if (vie >= PAGE) return first
  try {
    const more = await get(searchUrl(t.query, '&trans:lang=vie'))
    const seen = new Set(first.items.map((c) => c.key))
    return { items: [...first.items, ...more.items.filter((c) => !seen.has(c.key))], next: first.next }
  } catch (e) {
    // Panel đóng thì dừng hẳn; request bổ sung lỗi / chậm thì vẫn dùng kết quả lần đầu.
    if (opts.signal?.aborted) throw e
    return first
  }
}

/* ───────────── Chọn câu tốt nhất ───────────── */

const strip = (s: string) => s.replace(/[\s、。！？!?「」『』（）()…・,.]/g, '')

function bigrams(s: string) {
  const out = new Set<string>()
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2))
  return out
}

/**
 * Hai câu gần giống nhau (khác dấu câu, thêm / bớt vài chữ): dài gần bằng nhau và câu này chứa câu kia, hoặc
 * trùng > 70% cặp ký tự (tính trên câu dài hơn). Câu ngắn nằm trong câu dài hẳn thì KHÔNG coi là trùng.
 */
export function nearDuplicate(a: string, b: string): boolean {
  const x = strip(a)
  const y = strip(b)
  if (!x || !y) return false
  const ratio = Math.min(x.length, y.length) / Math.max(x.length, y.length)
  if (ratio < 0.7) return false
  if (x.includes(y) || y.includes(x)) return true
  const bx = bigrams(x)
  const by = bigrams(y)
  let common = 0
  for (const g of bx) if (by.has(g)) common++
  return common / Math.max(1, bx.size, by.size) > 0.7
}

export function scoreExample(c: Candidate): number {
  const len = [...c.ja].length
  return (c.vi ? 100 : 0) + (len >= 8 && len <= 40 ? 30 : 0) + (c.audioId ? 10 : 0) + Math.max(0, 10 - Math.abs(len - 18) / 3)
}

/** Lọc câu chứa đúng từ (hoặc dạng chia), bỏ câu chưa duyệt / không có dịch, xếp hạng, bỏ câu gần giống. */
export function rankExamples(cands: readonly Candidate[], t: SearchTerms, exclude: readonly ExampleItem[] = []): ExampleItem[] {
  const ok = cands.filter((c) => !c.unapproved && (c.vi || c.en) && containsTerm(c.ja, t))
  const sorted = [...ok].sort((a, b) => scoreExample(b) - scoreExample(a))
  const out: ExampleItem[] = []
  for (const c of sorted) {
    if ([...exclude, ...out].some((x) => x.key === c.key || nearDuplicate(x.ja, c.ja))) continue
    const { unapproved: _u, ...item } = c
    void _u
    out.push(item)
  }
  return out
}

import type { CounterData, CounterEntry, CounterExample, CounterFormKey, CounterItem, SrsCard } from '../types'
import { shuffle } from './answer'
import { hasJapanese, normalizeKana, normalizeVi } from './search'
import { isDue } from './srs'

/**
 * Cách đếm (助数詞): dữ liệu public/data/counters.json (tự soạn ở data-source/counters.json).
 *
 * ID (khóa SRS, sổ tay, URL):
 *  - `ct-<id>`      một trợ số từ (sổ tay, chi tiết)
 *  - `ct-<id>-<n>`  một ô số + trợ số từ (n = 1..10 hoặc nan): thẻ ôn cho cặp hay sai / bất quy tắc
 */

export const COUNTERS_PATH = 'counters.json'
export const FORM_KEYS: readonly CounterFormKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'nan']
/** Số ô tối đa của bảng đếm (1–10 + 何). */
export const MAX_CELLS = FORM_KEYS.length

export const isFullCounter = (c: CounterItem): c is CounterEntry => 'forms' in c

/* ───────────── ID ───────────── */

const REF_RE = /^ct-([a-z][a-z_]*)(?:-(10|[1-9]|nan))?$/

export const counterRef = (id: string) => `ct-${id}`
export const pairId = (id: string, n: CounterFormKey) => `ct-${id}-${n}`

export function parseCounterRef(ref: string): { id: string; n?: CounterFormKey } | null {
  const m = REF_RE.exec(ref)
  if (!m) return null
  return m[2] ? { id: m[1], n: m[2] as CounterFormKey } : { id: m[1] }
}

export const isCounterRef = (ref: string) => REF_RE.test(ref)

/* ───────────── Tra cứu ───────────── */

const indexes = new WeakMap<CounterData, Map<string, CounterItem>>()

/** id → trợ số từ (cả bảng đầy đủ và "trợ số từ khác"). */
export function counterIndex(data: CounterData): Map<string, CounterItem> {
  let map = indexes.get(data)
  if (!map) {
    map = new Map<string, CounterItem>([...data.counters, ...data.more].map((c) => [c.id, c]))
    indexes.set(data, map)
  }
  return map
}

/* ───────────── Ô trong bảng đếm ───────────── */

/** "3" → "3", "nan" → "何". */
export const numberLabel = (n: CounterFormKey) => (n === 'nan' ? '何' : n)

export const readingsOf = (form: string) => form.split('／').filter(Boolean)

export interface CounterCell {
  key: CounterFormKey
  /** Cách đọc, cách đầu là cách thường dùng */
  readings: string[]
  irregular: boolean
  /** Giải thích ngắn: "ほ → ぼ sau 3", "Cách đọc riêng, cần học thuộc" */
  reason: string
}

export function cellsOf(c: CounterEntry): CounterCell[] {
  return FORM_KEYS.flatMap((key) => {
    const form = c.forms[key]
    if (!form) return []
    const readings = readingsOf(form)
    const irregular = c.irregular.includes(key)
    return [{ key, readings, irregular, reason: reasonFor(c, key, readings[0], irregular) }]
  })
}

/* ───────────── Biến âm ───────────── */

/** Cách đọc số kiểu Hán; cách đầu là cách thường dùng. */
const NUMBER_READING: Record<CounterFormKey, string[]> = {
  '1': ['いち'],
  '2': ['に'],
  '3': ['さん'],
  '4': ['よん', 'よ', 'し'],
  '5': ['ご'],
  '6': ['ろく'],
  '7': ['なな', 'しち'],
  '8': ['はち'],
  '9': ['きゅう', 'く'],
  '10': ['じゅう'],
  nan: ['なん'],
}
/** Âm ngắt (促音) trước k, s, t, h. */
const SOKUON: Partial<Record<CounterFormKey, string[]>> = { '1': ['いっ'], '6': ['ろっ'], '8': ['はっ'], '10': ['じゅっ', 'じっ'], nan: ['なっ'] }
/** Số đếm kiểu thuần Nhật (ひと、ふた…), kể cả dạng trong cách đọc ngày. */
const NATIVE: Partial<Record<CounterFormKey, string[]>> = {
  '1': ['ひと'],
  '2': ['ふた', 'ふつ'],
  '3': ['み', 'みっ'],
  '4': ['よっ'],
  '5': ['いつ'],
  '6': ['む', 'むっ', 'むい'],
  '7': ['なな', 'なの'],
  '8': ['や', 'やっ', 'よう'],
  '9': ['ここの'],
  '10': ['とお'],
}

const VOICED: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
}
const SEMI_VOICED: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' }
const GEMINATE_BEFORE = /^[かきくけこさしすせそたちつてとはひふへほぱぴぷぺぽ]/

/** Trợ số từ và các dạng biến âm của âm đầu: ほん → ほん, ぼん, ぽん. */
function counterVariants(reading: string): string[] {
  const head = reading[0]
  const rest = reading.slice(1)
  const out = [reading]
  if (VOICED[head]) out.push(VOICED[head] + rest)
  if (SEMI_VOICED[head]) out.push(SEMI_VOICED[head] + rest)
  return out
}

/** Lỗi đọc hay gặp (kéo dài / thiếu âm): chỉ dùng làm đáp án nhiễu. */
const MISTAKE: Record<CounterFormKey, string[]> = {
  '1': ['いつ'],
  '2': ['にい'],
  '3': ['さ'],
  '4': ['よう'],
  '5': ['ごう'],
  '6': ['ろ'],
  '7': ['な'],
  '8': ['は'],
  '9': ['きゅ'],
  '10': ['じゅ'],
  nan: ['なに', 'いく'],
}

/**
 * Mô tả phần số: null = đọc bình thường, undefined = không nhận ra (cách đọc riêng).
 * Ô bất quy tắc (`irregular`) ưu tiên nhận là số kiểu Nhật: ななつ = kiểu Nhật dù なな trùng cách đọc Hán.
 */
function describeNumber(key: CounterFormKey, p: string, irregular = false): string | null | undefined {
  const std = NUMBER_READING[key]
  if (irregular && NATIVE[key]?.includes(p)) return `Số đếm kiểu Nhật: ${p}`
  if (p === std[0]) return null
  if (std.includes(p)) return `${numberLabel(key)} đọc ${p} (không phải ${std[0]})`
  if (SOKUON[key]?.includes(p)) return `${std[0]} → ${p} (âm ngắt)`
  if (NATIVE[key]?.includes(p)) return `Số đếm kiểu Nhật: ${p}`
  return undefined
}

/** Lý do cách đọc của một ô: "ほ → ぼ sau 3", "いち → いっ (âm ngắt); ほ → ぽ sau 1"… */
export function reasonFor(c: Pick<CounterEntry, 'reading'>, key: CounterFormKey, reading: string, irregular = false): string {
  if (key === 'nan' && reading.startsWith('いく')) return `Hỏi số lượng dùng ${reading}`
  for (const base of readingsOf(c.reading)) {
    for (const v of counterVariants(base)) {
      if (!reading.endsWith(v) || reading.length <= v.length) continue
      const num = describeNumber(key, reading.slice(0, -v.length), irregular)
      if (num === undefined) continue
      const parts = [num, v !== base ? `${base[0]} → ${v[0]} sau ${numberLabel(key)}` : null].filter(Boolean)
      if (parts.length) return parts.join('; ')
      return irregular ? 'Cách đọc đặc biệt, xem phần lưu ý' : `Đọc bình thường: số + ${base}`
    }
  }
  return 'Cách đọc riêng, cần học thuộc'
}

/* ───────────── Quiz (a): chọn cách đọc đúng ───────────── */

/**
 * Mọi cách đọc được coi là đúng của một ô (không bao giờ là đáp án nhiễu):
 *  - các cách trong bảng;
 *  - trợ số từ có 間 (かん) được phép lược: いちにち → cả いちにちかん;
 *  - ô 何 hỏi bằng いくつ / いくら thì なん + trợ số từ cũng dùng được (なんえん).
 */
export function acceptedReadings(c: CounterEntry, key: CounterFormKey): Set<string> {
  const listed = readingsOf(c.forms[key] ?? '')
  const out = new Set(listed)
  for (const base of readingsOf(c.reading)) {
    if (base.endsWith('かん')) for (const r of listed) if (!r.endsWith('かん')) out.add(r + 'かん')
    if (key === 'nan' && listed.some((r) => r.startsWith('いく'))) for (const v of counterVariants(base)) out.add('なん' + v)
  }
  return out
}

/**
 * Đáp án nhiễu cho "số + trợ số từ": ghép các cách đọc số (thường, âm ngắt, kiểu Nhật) với các dạng biến âm của
 * trợ số từ, bỏ mọi cách đọc đúng của ô. Nhiễu "giống thật" (số kiểu Hán) được chọn trước.
 */
export function readingDistractors(c: CounterEntry, key: CounterFormKey, count = 3): string[] {
  const correct = acceptedReadings(c, key)
  const variants = readingsOf(c.reading).flatMap(counterVariants)
  const tiers = [[...NUMBER_READING[key], ...(SOKUON[key] ?? [])], NATIVE[key] ?? [], MISTAKE[key]]
  // Âm ngắt (っ) chỉ đứng trước hàng か、さ、た、は、ぱ: bỏ dạng không đọc được như いっにん、ろっえん.
  const combine = (n: string, v: string) => (n.endsWith('っ') && !GEMINATE_BEFORE.test(v) ? [] : [n + v])
  const out: string[] = []
  for (const nums of tiers) {
    const options = shuffle([...new Set(nums.flatMap((n) => variants.flatMap((v) => combine(n, v))))])
    for (const o of options) {
      if (out.length >= count) return out
      if (!correct.has(o) && !out.includes(o)) out.push(o)
    }
  }
  return out
}

/* ───────────── Quiz (b): chọn trợ số từ cho câu ───────────── */

const NUMBER_TOKEN = '(?:[0-9０-９]+|[一二三四五六七八九十百千何]+)'
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export interface BlankSentence {
  example: CounterExample
  /** Phần trước chỗ trống (đã gồm con số): "ペンを三" */
  before: string
  after: string
}

/** Câu ví dụ có "số + trợ số từ" để đục lỗ trợ số từ: "ペンを三___ください". */
export function blankSentences(c: CounterEntry): BlankSentence[] {
  const re = new RegExp(`${NUMBER_TOKEN}(${escapeRe(c.counter)})`)
  return c.examples.flatMap((example) => {
    const m = re.exec(example.ja)
    if (!m) return []
    const at = m.index + m[0].length - m[1].length
    return [{ example, before: example.ja.slice(0, at), after: example.ja.slice(at + m[1].length) }]
  })
}

/**
 * Cặp trợ số từ dễ cùng đúng trong một câu (ビールを三本 / 三杯, パンを一枚 / 一切れ…): không dùng làm đáp án nhiễu
 * của nhau. Nhiễu cũng luôn khác nhóm với đáp án đúng.
 */
const CONFUSABLE: string[][] = [
  ['本', '杯'],
  ['杯', '皿'],
  ['枚', '切れ', '通'],
  ['冊', '部'],
  ['個', 'つ', '箱', '袋'],
  ['人', '名'],
  ['回', '度'],
  ['日', '日間'],
  ['匹', '頭', '羽'],
  ['時', '時間'],
  ['月', 'か月'],
  ['件', '通'],
]

const confusable = (a: string, b: string) => CONFUSABLE.some((set) => set.includes(a) && set.includes(b))

export function counterChoiceDistractors(c: CounterEntry, pool: readonly CounterEntry[], count = 3): string[] {
  const out: string[] = []
  for (const o of shuffle(pool)) {
    if (out.length >= count) break
    if (o.counter === c.counter || o.group === c.group || confusable(o.counter, c.counter) || out.includes(o.counter)) continue
    out.push(o.counter)
  }
  return out
}

/* ───────────── Tìm kiếm ───────────── */

const words = (text: string) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean)

/** Mọi từ của truy vấn đều là một từ trong văn bản; từ cuối (≥ 4 ký tự) được khớp đầu từ. */
function matchWords(text: string[], query: string[]): boolean {
  return query.every((q, i) => text.some((w) => w === q || (i === query.length - 1 && q.length >= 4 && w.startsWith(q))))
}

/**
 * Lọc trợ số từ: chữ / kana (cả cách đọc trong bảng và câu ví dụ) hoặc tiếng Việt theo từ trọn vẹn ("lát", "con",
 * "đôi"). Gõ có dấu thì so có dấu (con ≠ còn), không dấu thì so không dấu.
 */
export function matchCounter(c: CounterItem, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  if (hasJapanese(q)) {
    const kq = normalizeKana(q)
    const forms = isFullCounter(c) ? Object.values(c.forms).flatMap((f) => readingsOf(f ?? '')) : [c.keyForms]
    const examples = isFullCounter(c) ? c.examples : c.example ? [c.example] : []
    const keys = [c.counter, ...readingsOf(c.reading), ...forms, ...examples.flatMap((e) => [e.ja, e.kana])]
    return keys.some((k) => k.includes(q) || normalizeKana(k).includes(kq))
  }
  const examples = isFullCounter(c) ? c.examples : c.example ? [c.example] : []
  const text = [c.usage, c.group, ...examples.map((e) => e.vi)].join(' ')
  const accented = q.toLowerCase() !== normalizeVi(q)
  return accented ? matchWords(words(text.toLowerCase()), words(q.toLowerCase())) : matchWords(words(normalizeVi(text)), words(normalizeVi(q)))
}

/* ───────────── Thẻ học: cặp số + trợ số từ ───────────── */

export interface CounterPair {
  /** `ct-<id>-<n>` */
  id: string
  counter: CounterEntry
  key: CounterFormKey
  readings: string[]
  irregular: boolean
}

export function pairsOf(c: CounterEntry): CounterPair[] {
  return cellsOf(c).map((cell) => ({ id: pairId(c.id, cell.key), counter: c, key: cell.key, readings: cell.readings, irregular: cell.irregular }))
}

/**
 * Chọn các cặp cho một phiên: thẻ đến hạn → ô bất quy tắc chưa học → cặp từng sai → ô thường chưa học → còn lại.
 * Trộn trong từng nhóm, rồi trộn cả phiên.
 */
export function pickPairs(counters: readonly CounterEntry[], cards: Record<string, SrsCard>, now: number, size = 20): CounterPair[] {
  const tiers: CounterPair[][] = [[], [], [], [], []]
  for (const p of counters.flatMap(pairsOf)) {
    const card = cards[p.id]
    const tier = card ? (isDue(card, now) ? 0 : card.lapses > 0 ? 2 : 4) : p.irregular ? 1 : 3
    tiers[tier].push(p)
  }
  return shuffle(tiers.flatMap((t) => shuffle(t)).slice(0, size))
}

/**
 * Có ghi vào lịch ôn không: chỉ cặp "hay sai" (trả lời sai), ô bất quy tắc, hoặc mục đã có thẻ. Ô đọc bình thường
 * trả lời đúng thì không tạo thẻ (tránh hàng trăm thẻ よんまい、ごまい… làm đầy trang Ôn tập).
 */
export const shouldTrack = (opts: { correct: boolean; irregular: boolean; hasCard: boolean }) => opts.hasCard || !opts.correct || opts.irregular

/** Trợ số từ theo nhóm, giữ thứ tự xuất hiện trong dữ liệu. */
export function groupCounters<T extends CounterItem>(items: readonly T[]): { group: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const c of items) {
    const list = map.get(c.group) ?? []
    list.push(c)
    map.set(c.group, list)
  }
  return [...map].map(([group, list]) => ({ group, items: list }))
}

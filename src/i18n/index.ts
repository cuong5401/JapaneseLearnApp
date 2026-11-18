import { useSyncExternalStore } from 'react'
import { LOCALE_REGISTRY } from './locales'
import type { Dict, MessageKey } from './types'

/**
 * Ngôn ngữ giao diện. Từ điển tự viết, khóa có kiểu chặt (xem `locales.ts` để thêm ngôn ngữ):
 *  - `vi.ts` là gốc (`as const`); từ điển khác có kiểu `Dict` = đủ đúng các khóa đó (TypeScript báo lỗi nếu thiếu / thừa).
 *  - Từ điển tải lười (chunk riêng, SW precache); `main.tsx` chờ `initLocale()` trước khi render.
 *  - Đổi ngôn ngữ: nạp từ điển rồi báo cho `LocaleRoot` render lại cả cây (key = ngôn ngữ), không tải lại trang.
 * Chỉ chữ GIAO DIỆN đi qua đây. Dữ liệu học (nghĩa, Hán Việt, giải thích…) giữ nguyên tiếng Việt.
 * Nội dung gửi AI theo "Ngôn ngữ giải thích của AI" (`lib/ai/content`), không theo ngôn ngữ giao diện.
 *
 * Cú pháp chuỗi (tập con ICU MessageFormat):
 *  - `{ten}`                                   giá trị tham số (false / null / undefined → chuỗi rỗng)
 *  - `{n, number}`                             số theo Intl.NumberFormat của ngôn ngữ (1.695 / 1,695)
 *  - `{n, plural, =0 {…} one {# thẻ} other {# thẻ}}`  số nhiều theo Intl.PluralRules; `#` = n đã định dạng
 *  - `{x, select, a {…} other {…}}`            chọn nhánh theo giá trị (giống / khác)
 * Tiếng Việt / tiếng Nhật không phân biệt số nhiều nên chỉ cần `{n} thẻ`; ngôn ngữ có số nhiều (vd. tiếng Anh) viết
 * `{n, plural, one {# card} other {# cards}}` trong CHÍNH khóa đó, không cần khóa phụ.
 */

export type { Dict, MessageKey } from './types'
export { LOCALE_REGISTRY } from './locales'
export type Locale = keyof typeof LOCALE_REGISTRY
export const LOCALES = Object.keys(LOCALE_REGISTRY) as Locale[]
/** Ngôn ngữ mặc định (đầu bảng đăng ký, từ điển gốc). */
export const DEFAULT_LOCALE: Locale = LOCALES[0]
/** Tên ngôn ngữ luôn hiện bằng chính ngôn ngữ đó (không dịch). */
export const LOCALE_NAMES = Object.fromEntries(LOCALES.map((l) => [l, LOCALE_REGISTRY[l].name])) as Record<Locale, string>

const KEY = 'jla:v1:locale'

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && Object.hasOwn(LOCALE_REGISTRY, v)

function stored(): Locale {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return isLocale(v) ? v : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

let locale: Locale = stored()
let dict: Dict | null = null
const listeners = new Set<() => void>()

function applyDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.title = LOCALE_REGISTRY[locale].title
}

/** Nạp từ điển của ngôn ngữ đã lưu; gọi trước khi render lần đầu. */
export async function initLocale(): Promise<void> {
  dict = (await LOCALE_REGISTRY[locale].load()).default
  applyDocument()
}

/** Đổi ngôn ngữ: nạp từ điển, lưu, cập nhật <html lang> + <title>, render lại. */
export async function setLocale(next: Locale): Promise<void> {
  const d = (await LOCALE_REGISTRY[next].load()).default
  locale = next
  dict = d
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // không lưu được: vẫn đổi trong phiên này
  }
  applyDocument()
  listeners.forEach((l) => l())
}

export const getLocale = () => locale

export function subscribeLocale(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale)
}

/* ───────────── Định dạng chuỗi ───────────── */

export type Params = Record<string, string | number | boolean | null | undefined>

/** Vị trí dấu `}` khớp với `{` ở `open` (có lồng nhau); -1 nếu không khớp. */
function closing(s: string, open: number): number {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}' && --depth === 0) return i
  }
  return -1
}

const ARG = /^\s*(\w+)\s*(?:,\s*(plural|select|number)\s*(?:,([\s\S]*))?)?$/

/** Các nhánh `sel {text}` của plural / select. */
function branches(spec: string): Map<string, string> {
  const out = new Map<string, string>()
  let i = 0
  while (i < spec.length) {
    const m = /^\s*(=?[\w-]+)\s*\{/.exec(spec.slice(i))
    if (!m) break
    const open = i + m[0].length - 1
    const close = closing(spec, open)
    if (close < 0) break
    out.set(m[1], spec.slice(open + 1, close))
    i = close + 1
  }
  return out
}

const empty = (v: unknown) => v === false || v === null || v === undefined

/** Định dạng một chuỗi theo cú pháp ở đầu file với `intl` (vd. 'vi-VN'). Thuần, dùng được trong test. */
export function formatMessage(msg: string, params: Params | undefined, intl: string): string {
  if (!msg.includes('{')) return msg
  let out = ''
  let i = 0
  while (i < msg.length) {
    const open = msg.indexOf('{', i)
    if (open < 0) {
      out += msg.slice(i)
      break
    }
    out += msg.slice(i, open)
    const close = closing(msg, open)
    if (close < 0) {
      out += msg.slice(open)
      break
    }
    out += argument(msg.slice(open + 1, close), params, intl) ?? msg.slice(open, close + 1)
    i = close + 1
  }
  return out
}

function argument(body: string, params: Params | undefined, intl: string): string | null {
  const m = ARG.exec(body)
  if (!m || !params || !(m[1] in params)) return null
  const v = params[m[1]]
  const type = m[2]
  if (!type) return empty(v) ? '' : String(v)
  if (type === 'number') return empty(v) ? '' : Number(v).toLocaleString(intl)
  const opts = branches(m[3] ?? '')
  if (type === 'select') return formatMessage(opts.get(String(v)) ?? opts.get('other') ?? '', params, intl)
  const n = Number(v)
  const text = opts.get(`=${n}`) ?? opts.get(new Intl.PluralRules(intl).select(n)) ?? opts.get('other') ?? ''
  return formatMessage(text.replace(/#/g, n.toLocaleString(intl)), params, intl)
}

/** Tên tham số dùng trong chuỗi (kể cả trong nhánh plural / select): test so khớp giữa các ngôn ngữ. */
export function messageParams(msg: string): string[] {
  const names = new Set<string>()
  const walk = (s: string) => {
    let i = 0
    while ((i = s.indexOf('{', i)) >= 0) {
      const close = closing(s, i)
      if (close < 0) return
      const m = ARG.exec(s.slice(i + 1, close))
      if (m) {
        names.add(m[1])
        if (m[3]) for (const b of branches(m[3]).values()) walk(b)
      }
      i = close + 1
    }
  }
  walk(msg)
  return [...names].sort()
}

/** Dịch một khóa; tham số theo cú pháp ở đầu file. */
export function t(key: MessageKey, params?: Params): string {
  const s = dict?.[key]
  if (s === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] thiếu khóa hoặc chưa nạp từ điển: ${key}`)
    return key
  }
  return formatMessage(s, params, intlLocale())
}

/** Chỉ dùng trong test (Vitest): đặt từ điển đồng bộ. */
export function __setDictForTest(next: Locale, d: Dict) {
  locale = next
  dict = d
}

/** Mã BCP 47 cho Intl (ngày giờ, số, số nhiều) theo bảng đăng ký. */
export const intlLocale = () => LOCALE_REGISTRY[locale].intl

export const formatDate = (ms: number | Date, opts?: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleDateString(intlLocale(), opts)
export const formatDateTime = (ms: number | Date, opts?: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleString(intlLocale(), opts)
export const formatNumber = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(intlLocale(), opts)
/** Ngày dạng số ngắn theo ngôn ngữ: 18/11/2026 (vi) · 2026/11/18 (ja). */
export const formatShortDate = (d: number | Date) => formatDate(d, { year: 'numeric', month: '2-digit', day: '2-digit' })

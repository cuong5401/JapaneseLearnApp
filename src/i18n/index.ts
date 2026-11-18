import { useSyncExternalStore } from 'react'
import type viDict from './vi'

/**
 * Ngôn ngữ giao diện (Tiếng Việt / 日本語). Từ điển tự viết, khóa có kiểu chặt:
 *  - `vi.ts` là gốc (`as const`), `ja.ts` phải có đủ đúng các khóa đó (TypeScript báo lỗi nếu thiếu / thừa).
 *  - Cả hai từ điển tải lười (chunk riêng, SW precache); `main.tsx` chờ `initLocale()` trước khi render.
 *  - Đổi ngôn ngữ: nạp từ điển rồi báo cho `LocaleRoot` render lại cả cây (key = ngôn ngữ), không tải lại trang.
 * Chỉ chữ GIAO DIỆN đi qua đây. Dữ liệu học (nghĩa, Hán Việt, giải thích…) giữ nguyên tiếng Việt.
 * Nội dung gửi AI theo "Ngôn ngữ giải thích của AI" (`lib/ai/content`), không theo ngôn ngữ giao diện.
 */

export type MessageKey = keyof typeof viDict
export type Dict = Record<MessageKey, string>
export type Locale = 'vi' | 'ja'
export const LOCALES: Locale[] = ['vi', 'ja']
/** Tên ngôn ngữ luôn hiện bằng chính ngôn ngữ đó (không dịch). */
export const LOCALE_NAMES: Record<Locale, string> = { vi: 'Tiếng Việt', ja: '日本語' } // i18n-ignore

const KEY = 'jla:v1:locale'
const loaders: Record<Locale, () => Promise<{ default: Dict }>> = {
  vi: () => import('./vi') as Promise<{ default: Dict }>,
  ja: () => import('./ja'),
}

export const isLocale = (v: unknown): v is Locale => v === 'vi' || v === 'ja'

function stored(): Locale {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return isLocale(v) ? v : 'vi'
  } catch {
    return 'vi'
  }
}

let locale: Locale = stored()
let dict: Dict | null = null
const listeners = new Set<() => void>()

const TITLE: Record<Locale, string> = { vi: 'Kotonoha | Học tiếng Nhật', ja: 'Kotonoha | 日本語学習' } // i18n-ignore

function applyDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.title = TITLE[locale]
}

/** Nạp từ điển của ngôn ngữ đã lưu; gọi trước khi render lần đầu. */
export async function initLocale(): Promise<void> {
  dict = (await loaders[locale]()).default
  applyDocument()
}

/** Đổi ngôn ngữ: nạp từ điển, lưu, cập nhật <html lang> + <title>, render lại. */
export async function setLocale(next: Locale): Promise<void> {
  const d = (await loaders[next]()).default
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

/** Dịch một khóa; `{ten}` trong chuỗi thay bằng `params.ten`. */
export function t(key: MessageKey, params?: Record<string, string | number | boolean | null | undefined>): string {
  const s = dict?.[key]
  if (s === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] thiếu khóa hoặc chưa nạp từ điển: ${key}`)
    return key
  }
  return params ? s.replace(/\{(\w+)\}/g, (m, p: string) => (p in params ? (params[p] === false || params[p] == null ? '' : String(params[p])) : m)) : s
}

/** Chỉ dùng trong test (Vitest): đặt từ điển đồng bộ. */
export function __setDictForTest(next: Locale, d: Dict) {
  locale = next
  dict = d
}

/** Mã BCP 47 cho Intl (ngày giờ, số). */
export const intlLocale = () => (locale === 'ja' ? 'ja-JP' : 'vi-VN')

export const formatDate = (ms: number, opts?: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleDateString(intlLocale(), opts)
export const formatDateTime = (ms: number, opts?: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleString(intlLocale(), opts)
export const formatNumber = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(intlLocale(), opts)

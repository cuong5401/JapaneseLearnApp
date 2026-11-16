import { useSyncExternalStore } from 'react'
import { readJSON, writeJSON } from '../storage'

/** Tùy chọn phiếu luyện viết; nhớ lần chọn trước (localStorage `jla:v1:writing-options`, chỉ là cài đặt hiển thị). */
export interface WritingOptions {
  paper: Paper
  perPage: 4 | 5 | 6
  cols: 8 | 10 | 12
  rows: 2 | 3 | 4
  /** Số ô chữ mờ ở hàng đầu; 'row' = cả hàng */
  fade: number | 'row'
  /** Chữ mờ nhạt dần từ trái sang phải */
  fadeGradient: boolean
  /** Số thứ tự nét ở ô chữ mẫu */
  numbers: boolean
  guide: Guide
  showHanViet: boolean
  showOn: boolean
  showKun: boolean
  /** Số từ ví dụ (chữ Hán) */
  examples: 0 | 1 | 2
}

export type Paper = 'A4' | 'B5' | 'Letter'
export type Guide = 'cross' | 'quad' | 'none'

export const PAPERS: Paper[] = ['A4', 'B5', 'Letter']
export const PER_PAGE = [4, 5, 6] as const
export const COLS = [8, 10, 12] as const
export const ROWS = [2, 3, 4] as const
export const GUIDES: Guide[] = ['cross', 'quad', 'none']

export const DEFAULT_OPTIONS: WritingOptions = {
  paper: 'A4',
  perPage: 5,
  cols: 10,
  rows: 2,
  fade: 'row',
  fadeGradient: true,
  numbers: true,
  guide: 'cross',
  showHanViet: true,
  showOn: true,
  showKun: true,
  examples: 0,
}

const pick = <T>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

/** Chuẩn hóa dữ liệu đọc từ localStorage (giá trị lạ → mặc định). */
export function sanitizeOptions(raw: unknown): WritingOptions {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof WritingOptions, unknown>>
  const d = DEFAULT_OPTIONS
  const fade = r.fade === 'row' ? 'row' : Number.isInteger(r.fade) && (r.fade as number) >= 0 && (r.fade as number) <= 12 ? (r.fade as number) : d.fade
  return {
    paper: pick(PAPERS, r.paper, d.paper),
    perPage: pick(PER_PAGE, r.perPage, d.perPage),
    cols: pick(COLS, r.cols, d.cols),
    rows: pick(ROWS, r.rows, d.rows),
    fade,
    fadeGradient: bool(r.fadeGradient, d.fadeGradient),
    numbers: bool(r.numbers, d.numbers),
    guide: pick(GUIDES, r.guide, d.guide),
    showHanViet: bool(r.showHanViet, d.showHanViet),
    showOn: bool(r.showOn, d.showOn),
    showKun: bool(r.showKun, d.showKun),
    examples: pick([0, 1, 2] as const, r.examples, d.examples),
  }
}

/** Số ô chữ mờ thực tế (không vượt quá số ô mỗi hàng). */
export const fadeCount = (o: Pick<WritingOptions, 'fade' | 'cols'>) => (o.fade === 'row' ? o.cols : Math.min(o.fade, o.cols))

const KEY = 'writing-options'
let options = sanitizeOptions(readJSON(KEY, {}))
const listeners = new Set<() => void>()

export function setWritingOptions(patch: Partial<WritingOptions>) {
  options = sanitizeOptions({ ...options, ...patch })
  writeJSON(KEY, options)
  listeners.forEach((l) => l())
}

export function useWritingOptions(): WritingOptions {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => options,
  )
}

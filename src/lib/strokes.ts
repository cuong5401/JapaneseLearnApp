import { useEffect, useSyncExternalStore } from 'react'

/**
 * Thứ tự nét (KanjiVG, Ulrich Apel, CC BY-SA 3.0): public/data/strokes/<hex>.json, sinh bằng scripts/import-strokes.py.
 * Đọc strokes/index.json trước: chữ không có trong index thì không tải (không có request 404 trên console).
 */
export interface Stroke {
  /** Path SVG trong hệ tọa độ 109×109, vẽ theo đúng hướng viết */
  d: string
  /** Số thứ tự nét (1…) */
  n: number
  /** Vị trí đặt số thứ tự nét */
  x: number
  y: number
}

export interface StrokeData {
  char: string
  strokes: Stroke[]
}

export const STROKE_CREDIT = 'Dữ liệu thứ tự nét: KanjiVG (Ulrich Apel), CC BY-SA'
export const STROKE_VIEWBOX = 109

const BASE = `${import.meta.env.BASE_URL ?? '/'}data/`

export const strokeFile = (ch: string) => `strokes/${ch.codePointAt(0)!.toString(16)}.json`

/** Kiểm tra + sắp xếp dữ liệu một chữ; sai định dạng thì null. */
export function parseStrokeData(raw: unknown): StrokeData | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<StrokeData>
  if (typeof r.char !== 'string' || !Array.isArray(r.strokes)) return null
  const strokes = r.strokes.filter(
    (s): s is Stroke => !!s && typeof s.d === 'string' && s.d.length > 0 && Number.isInteger(s.n) && typeof s.x === 'number' && typeof s.y === 'number',
  )
  if (!strokes.length || strokes.length !== r.strokes.length) return null
  return { char: r.char, strokes: [...strokes].sort((a, b) => a.n - b.n) }
}

const NUM = /-?\d*\.?\d+(?:e-?\d+)?/g

/** Điểm đầu của path (sau lệnh M). */
export function firstPoint(d: string): [number, number] {
  const [x, y] = (d.match(NUM) ?? []).map(Number)
  return [x, y]
}

/**
 * Điểm cuối của path gồm M + các đoạn c/C/s/S/l/L (dạng KanjiVG). Đủ để biết hướng nét trong test.
 */
export function lastPoint(d: string): [number, number] {
  let x = 0
  let y = 0
  for (const seg of d.match(/[MmCcSsLlHhVvZz][^MmCcSsLlHhVvZz]*/g) ?? []) {
    const cmd = seg[0]
    const n = (seg.slice(1).match(NUM) ?? []).map(Number)
    const rel = cmd === cmd.toLowerCase()
    const size = { m: 2, l: 2, c: 6, s: 4, h: 1, v: 1, z: 0 }[cmd.toLowerCase() as 'm']
    for (let i = 0; size && i + size <= n.length; i += size) {
      const g = n.slice(i, i + size)
      if (cmd.toLowerCase() === 'h') x = rel ? x + g[0] : g[0]
      else if (cmd.toLowerCase() === 'v') y = rel ? y + g[0] : g[0]
      else {
        const [ex, ey] = g.slice(-2)
        x = rel ? x + ex : ex
        y = rel ? y + ey : ey
      }
    }
  }
  return [x, y]
}

/* ───────────── Store tải dữ liệu ───────────── */

export type StrokeState = { status: 'loading' } | { status: 'ready'; data: StrokeData } | { status: 'missing' } | { status: 'error' }

let index: Promise<Set<string>> | null = null
const states = new Map<string, StrokeState>()
const listeners = new Set<() => void>()
const LOADING: StrokeState = { status: 'loading' }

function set(ch: string, s: StrokeState) {
  states.set(ch, s)
  listeners.forEach((l) => l())
}

function loadIndex(): Promise<Set<string>> {
  index ??= fetch(`${BASE}strokes/index.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j: { chars?: string }) => new Set([...(j.chars ?? '')]))
    .catch((e) => {
      index = null // lần sau thử lại
      throw e
    })
  return index
}

function request(ch: string) {
  if (states.has(ch)) return
  states.set(ch, LOADING)
  loadIndex()
    .then(async (chars) => {
      if (!chars.has(ch)) return set(ch, { status: 'missing' })
      const r = await fetch(`${BASE}${strokeFile(ch)}`)
      const data = r.ok ? parseStrokeData(await r.json()) : null
      set(ch, data ? { status: 'ready', data } : { status: 'missing' })
    })
    .catch(() => set(ch, { status: 'error' }))
}

/** Dữ liệu thứ tự nét của một chữ (tải lười, dùng chung cache). */
export function useStrokes(ch: string): StrokeState {
  useEffect(() => request(ch), [ch])
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => states.get(ch) ?? LOADING,
  )
}

/** Thử lại sau lỗi mạng. */
export function retryStrokes(ch: string) {
  if (states.get(ch)?.status === 'error') {
    states.delete(ch)
    request(ch)
  }
}

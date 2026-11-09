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

type Pt = [number, number]

/**
 * Đi qua path dạng KanjiVG (M + c/C/s/S/l/L/h/v): trả về điểm đầu, điểm cuối, tiếp tuyến đầu và cuối.
 */
function walk(d: string): { start: Pt; end: Pt; startDir: Pt; endDir: Pt; length: number } {
  let x = 0
  let y = 0
  let start: Pt = [0, 0]
  let startDir: Pt | null = null
  let ctrl: Pt = [0, 0] // điểm điều khiển cuối trước điểm hiện tại
  let length = 0 // độ dài đường gấp khúc qua mọi điểm (≥ độ dài thật của đường cong)
  const take = (v: Pt) => {
    if (!startDir && (Math.abs(v[0] - start[0]) > 0.05 || Math.abs(v[1] - start[1]) > 0.05)) startDir = [v[0] - start[0], v[1] - start[1]]
  }
  for (const seg of d.match(/[MmCcSsLlHhVvZz][^MmCcSsLlHhVvZz]*/g) ?? []) {
    const cmd = seg[0]
    const lc = cmd.toLowerCase()
    const n = (seg.slice(1).match(NUM) ?? []).map(Number)
    const rel = cmd === lc
    const size = { m: 2, l: 2, c: 6, s: 4, h: 1, v: 1, z: 0 }[lc as 'm']
    for (let i = 0; size && i + size <= n.length; i += size) {
      const g = n.slice(i, i + size)
      const abs = (j: number): Pt => (rel ? [x + g[j], y + g[j + 1]] : [g[j], g[j + 1]])
      if (lc === 'm') {
        ;[x, y] = abs(0)
        start = [x, y]
        ctrl = [x, y]
        continue
      }
      let pts: Pt[]
      if (lc === 'c') pts = [abs(0), abs(2), abs(4)]
      else if (lc === 's') pts = [abs(0), abs(2)]
      else if (lc === 'l') pts = [abs(0)]
      else if (lc === 'h') pts = [[rel ? x + g[0] : g[0], y]]
      else pts = [[x, rel ? y + g[0] : g[0]]]
      pts.forEach(take)
      let prev: Pt = [x, y]
      for (const q of pts) {
        length += Math.hypot(q[0] - prev[0], q[1] - prev[1])
        prev = q
      }
      const last = pts[pts.length - 1]
      ctrl = pts.length > 1 ? pts[pts.length - 2] : [x, y]
      ;[x, y] = last
    }
  }
  const end: Pt = [x, y]
  let endDir: Pt = [end[0] - ctrl[0], end[1] - ctrl[1]]
  if (Math.hypot(...endDir) < 0.05) endDir = [end[0] - start[0], end[1] - start[1]]
  return { start, end, startDir: startDir ?? [0, 1], endDir, length }
}

/** Điểm cuối của path. Đủ để biết hướng nét trong test. */
export const lastPoint = (d: string): Pt => walk(d).end

/** Độ dài xấp xỉ của nét (đường gấp khúc qua các điểm điều khiển và điểm cuối). */
export const approxLength = (d: string): number => walk(d).length

const unit = ([a, b]: Pt): Pt => {
  const l = Math.hypot(a, b) || 1
  return [a / l, b / l]
}

/** Hướng (vector đơn vị) ở đầu nét: chiều đặt bút. */
export const startDir = (d: string): Pt => unit(walk(d).startDir)

/** Điểm cuối + hướng (vector đơn vị) ở cuối nét: đặt mũi tên chỉ hướng viết. */
export function strokeEnd(d: string): { at: Pt; dir: Pt } {
  const w = walk(d)
  return { at: w.end, dir: unit(w.endDir) }
}

/**
 * Tâm vòng số thứ tự cho từng nét (bán kính r, đơn vị viewBox 109): sát điểm đặt bút, dịch ra ngoài nét
 * theo pháp tuyến; đè lên vòng khác thì thử vị trí gốc của KanjiVG rồi các vị trí khác.
 */
export function labelPositions(strokes: readonly Stroke[], r: number): Pt[] {
  const min = r
  const max = STROKE_VIEWBOX - r
  const clamp = ([a, b]: Pt): Pt => [Math.min(max, Math.max(min, a)), Math.min(max, Math.max(min, b))]
  const gap = 2 * r + 0.5
  const placed: Pt[] = []
  for (const s of strokes) {
    const p = firstPoint(s.d)
    const [tx, ty] = startDir(s.d)
    const off = 5 + r * 0.6
    // ưu tiên: hai bên pháp tuyến, vị trí gốc KanjiVG, phía trước điểm đặt bút; rồi dò vòng quanh P0 xa dần
    const cands: Pt[] = [
      [p[0] - ty * off, p[1] + tx * off],
      [p[0] + ty * off, p[1] - tx * off],
      [s.x + 2, s.y - 3],
      [p[0] - tx * off, p[1] - ty * off],
    ]
    for (let k = 1; k <= 6; k++) {
      const dist = off + k * 2.5
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        cands.push([p[0] + Math.cos(a) * dist, p[1] + Math.sin(a) * dist])
      }
    }
    const cs = cands.map(clamp)
    const dist = (c: Pt) => Math.min(Infinity, ...placed.map((q) => Math.hypot(c[0] - q[0], c[1] - q[1])))
    const ok = cs.find((c) => dist(c) > gap)
    placed.push(ok ?? cs.reduce((x, y) => (dist(y) > dist(x) ? y : x)))
  }
  return placed
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

/* ───────────── Kiểm tra cú pháp path (test dữ liệu) ───────────── */

const SVG_TOKEN = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)|([\s,]+)|(.)/g
const ARITY: Record<string, number> = { m: 2, l: 2, t: 2, c: 6, s: 4, q: 4, h: 1, v: 1, z: 0 }

/**
 * Lỗi cú pháp của một path SVG (rỗng = hợp lệ): ký tự lạ, lệnh thiếu / thừa tham số, số "-0"
 * (dấu hiệu nén sai: "14.62-0.02" làm tròn thành "14.60" làm hỏng phần còn lại của path).
 */
export function pathErrors(d: string): string[] {
  const errors: string[] = []
  if (/-0(?![.\d]*[1-9])/.test(d)) errors.push('có số "-0"')
  const tokens: (string | number)[] = []
  for (const m of d.matchAll(SVG_TOKEN)) {
    if (m[4]) errors.push(`ký tự lạ "${m[4]}"`)
    else if (m[1]) tokens.push(m[1])
    else if (m[2]) tokens.push(Number(m[2]))
  }
  if (typeof tokens[0] !== 'string' || tokens[0].toLowerCase() !== 'm') errors.push('không bắt đầu bằng M')
  for (let i = 0; i < tokens.length; ) {
    const cmd = tokens[i++]
    if (typeof cmd !== 'string') {
      errors.push('số không thuộc lệnh nào')
      continue
    }
    const n = ARITY[cmd.toLowerCase()]
    if (n === undefined) {
      errors.push(`lệnh ${cmd} không hỗ trợ`)
      continue
    }
    let count = 0
    while (i < tokens.length && typeof tokens[i] === 'number') {
      count++
      i++
    }
    if (n === 0 ? count !== 0 : count === 0 || count % n !== 0) errors.push(`lệnh ${cmd} có ${count} tham số`)
  }
  return errors
}

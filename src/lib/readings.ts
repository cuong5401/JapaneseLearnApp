import { useEffect, useSyncExternalStore } from 'react'

/**
 * Âm On / Kun, số nét, cấp JLPT cũ từ KANJIDIC2 (EDRDG, CC BY-SA 4.0): public/data/kanji/kanji-readings.json,
 * sinh bằng scripts/import-kanjidic.py. Không nằm trong manifest; tải một lần khi cần (panel chi tiết, Luyện viết).
 */
export interface KanjiReading {
  /** Âm On (katakana) */
  on: string[]
  /** Âm Kun (hiragana) theo ký hiệu KANJIDIC2: "ひと.つ" (sau dấu chấm là okurigana), "ひと-" (tiền tố) */
  kun: string[]
  /** Số nét */
  s?: number
  /** Cấp JLPT cũ (1–4) */
  jlpt?: number
}

export const READINGS_CREDIT = 'Âm On / Kun: KANJIDIC2 (EDRDG), CC BY-SA 4.0'

const URL = `${import.meta.env.BASE_URL ?? '/'}data/kanji/kanji-readings.json`

/** Kiểm tra dữ liệu thô; mục sai định dạng bị bỏ. */
export function parseReadings(raw: unknown): Map<string, KanjiReading> {
  const out = new Map<string, KanjiReading>()
  const chars = (raw as { chars?: unknown } | null)?.chars
  if (!chars || typeof chars !== 'object') return out
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [])
  for (const [ch, v] of Object.entries(chars as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue
    const e = v as Partial<KanjiReading>
    out.set(ch, {
      on: strings(e.on),
      kun: strings(e.kun),
      ...(Number.isInteger(e.s) ? { s: e.s } : {}),
      ...(Number.isInteger(e.jlpt) ? { jlpt: e.jlpt } : {}),
    })
  }
  return out
}

/** Một âm Kun tách phần: tiền tố "-", gốc, okurigana (sau dấu "."), hậu tố "-". */
export interface KunParts {
  before: string
  stem: string
  okurigana: string
  after: string
}

export function kunParts(kun: string): KunParts {
  const before = kun.startsWith('-') ? '-' : ''
  const after = kun.length > 1 && kun.endsWith('-') ? '-' : ''
  const core = kun.slice(before.length, kun.length - after.length)
  const dot = core.indexOf('.')
  return dot < 0
    ? { before, stem: core, okurigana: '', after }
    : { before, stem: core.slice(0, dot), okurigana: core.slice(dot + 1), after }
}

/** Dạng hiển thị một âm Kun: "ひと.つ" → "ひとつ", giữ "-" của tiền tố / hậu tố ("ひと-"). */
export const formatKun = (kun: string): string => {
  const p = kunParts(kun)
  return p.before + p.stem + p.okurigana + p.after
}

/**
 * Âm Kun gọn để hiển thị (giữ ký hiệu KANJIDIC2): bỏ âm trùng sau khi bỏ dấu "." (うまれ / う.まれ), và bỏ dạng
 * tiền tố / hậu tố "-" khi đã có dạng thường cùng gốc (合: あ.う, -あ.う, あい-, -あい → あ.う, あ.い).
 */
export function uniqueKun(kun: readonly string[]): string[] {
  const core = (k: string) => k.replace(/[.-]/g, '')
  const plain = new Set(kun.filter((k) => !k.includes('-')).map(core))
  const seen = new Set<string>()
  return kun.filter((k) => {
    const c = core(k)
    const key = k.includes('-') ? (plain.has(c) ? null : `-${c}`) : c
    if (key === null || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Âm Kun đã gộp và định dạng: ["ひと-", "ひと.つ"] → ["ひと-", "ひとつ"]. */
export function displayKun(kun: readonly string[]): string[] {
  return uniqueKun(kun).map(formatKun)
}

/* ───────────── Store ───────────── */

let data: Map<string, KanjiReading> | null = null
let pending: Promise<Map<string, KanjiReading>> | null = null
let failed = false
const listeners = new Set<() => void>()

/** Tải bảng âm đọc (một lần; lỗi thì lần sau thử lại). */
export function loadReadings(): Promise<Map<string, KanjiReading>> {
  if (data) return Promise.resolve(data)
  pending ??= fetch(URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Lỗi ${r.status} khi tải âm đọc`))))
    .then((raw) => {
      data = parseReadings(raw)
      failed = false
      listeners.forEach((l) => l())
      return data
    })
    .catch((e) => {
      pending = null
      failed = true
      listeners.forEach((l) => l())
      throw e
    })
  return pending
}

export type ReadingsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; map: Map<string, KanjiReading> }

let snapshot: ReadingsState = { status: 'loading' }
function current(): ReadingsState {
  const next: ReadingsState = data ? { status: 'ready', map: data } : failed ? { status: 'error' } : { status: 'loading' }
  if (next.status !== snapshot.status || (next.status === 'ready' && snapshot.status === 'ready' && next.map !== snapshot.map)) snapshot = next
  return snapshot
}

/** Bảng âm đọc cho React (tải lười, dùng chung). */
export function useReadings(): ReadingsState {
  useEffect(() => {
    if (!data) loadReadings().catch(() => {})
  }, [])
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    current,
  )
}

/** Chỉ dùng trong test. */
export const __testing = {
  set(map: Map<string, KanjiReading> | null) {
    data = map
    pending = null
    failed = false
    listeners.forEach((l) => l())
  },
}

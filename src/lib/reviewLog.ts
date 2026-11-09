import { useSyncExternalStore } from 'react'
import type { Grade } from '../types'
import { readJSON, writeJSON } from './storage'

/**
 * Lịch sử ôn (để thống kê và sau này tối ưu tham số FSRS). localStorage `jla:v1:review-log`, dạng nén:
 * `{ v: 1, ids: string[], rows: number[] }`, mỗi lượt 6 số liên tiếp:
 *   [chỉ số id trong `ids`, thời điểm (giây), rating 1–4, state trước khi chấm 0–3, elapsed_days, scheduled_days].
 * Giữ tối đa MAX_LOGS lượt gần nhất. Có trong Xuất/Nhập tiến độ.
 */
export interface ReviewEntry {
  id: string
  /** ms */
  at: number
  rating: Grade
  /** State trước khi chấm: 0 Mới, 1 Đang học, 2 Ôn tập, 3 Học lại */
  state: 0 | 1 | 2 | 3
  elapsed_days: number
  scheduled_days: number
}

export interface PackedLog {
  v: 1
  ids: string[]
  rows: number[]
}

export const MAX_LOGS = 20_000
const W = 6

export const emptyLog = (): PackedLog => ({ v: 1, ids: [], rows: [] })

export function unpack(p: PackedLog): ReviewEntry[] {
  const out: ReviewEntry[] = []
  for (let i = 0; i + W <= p.rows.length; i += W) {
    const [idx, sec, rating, state, elapsed, scheduled] = p.rows.slice(i, i + W)
    out.push({ id: p.ids[idx], at: sec * 1000, rating: rating as Grade, state: state as ReviewEntry['state'], elapsed_days: elapsed, scheduled_days: scheduled })
  }
  return out
}

/** Nén danh sách (đã sắp theo thời gian), chỉ giữ MAX_LOGS lượt cuối. */
export function pack(entries: readonly ReviewEntry[]): PackedLog {
  const keep = entries.slice(-MAX_LOGS)
  const ids: string[] = []
  const index = new Map<string, number>()
  const rows: number[] = []
  for (const e of keep) {
    let i = index.get(e.id)
    if (i === undefined) {
      i = ids.push(e.id) - 1
      index.set(e.id, i)
    }
    rows.push(i, Math.round(e.at / 1000), e.rating, e.state, Math.round(e.elapsed_days), Math.round(e.scheduled_days))
  }
  return { v: 1, ids, rows }
}

/** Đọc dữ liệu bất kỳ (localStorage, file nhập): sai định dạng thì null. */
export function sanitizeLog(raw: unknown): PackedLog | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<PackedLog>
  if (r.v !== 1 || !Array.isArray(r.ids) || !Array.isArray(r.rows)) return null
  if (!r.ids.every((x) => typeof x === 'string')) return null
  const rows: number[] = []
  for (let i = 0; i + W <= r.rows.length; i += W) {
    const row = r.rows.slice(i, i + W)
    const [idx, sec, rating, state] = row
    if (!row.every((x) => typeof x === 'number' && Number.isFinite(x))) continue
    if (!(idx >= 0 && idx < r.ids.length) || sec <= 0 || rating < 1 || rating > 4 || state < 0 || state > 3) continue
    rows.push(...row)
  }
  return pack(unpack({ v: 1, ids: r.ids, rows }))
}

/** Gộp hai lịch sử: bỏ lượt trùng (cùng thẻ, cùng thời điểm), sắp theo thời gian. */
export function mergeLogs(a: PackedLog, b: PackedLog): PackedLog {
  const seen = new Set<string>()
  const all = [...unpack(a), ...unpack(b)].filter((e) => {
    const k = `${e.id}@${Math.round(e.at / 1000)}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  all.sort((x, y) => x.at - y.at)
  return pack(all)
}

/** Đầu ngày (0h giờ máy) của `now`. */
export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Số thẻ Mới đã học và số lượt ôn thẻ Ôn tập trong ngày của `now`. */
export function todayCounts(entries: readonly ReviewEntry[], now: number) {
  const from = startOfDay(now)
  const seenNew = new Set<string>()
  let reviews = 0
  for (let i = entries.length - 1; i >= 0 && entries[i].at >= from; i--) {
    const e = entries[i]
    if (e.state === 0) seenNew.add(e.id)
    else if (e.state === 2) reviews++
  }
  return { newCards: seenNew.size, reviews }
}

/** Tỷ lệ nhớ thực tế: lượt Hard/Good/Easy ÷ tổng lượt ôn thẻ Ôn tập trong `days` ngày gần nhất. */
export function retentionRate(entries: readonly ReviewEntry[], now: number, days = 30) {
  const from = now - days * 86_400_000
  let total = 0
  let ok = 0
  for (const e of entries) {
    if (e.at < from || e.state !== 2) continue
    total++
    if (e.rating > 1) ok++
  }
  return { total, ok, rate: total ? ok / total : null }
}

/* ───────────── Store ───────────── */

let log: PackedLog = sanitizeLog(readJSON<unknown>('review-log', null)) ?? emptyLog()
let entries: ReviewEntry[] = unpack(log)
const listeners = new Set<() => void>()

function commit(next: ReviewEntry[]) {
  entries = next.slice(-MAX_LOGS)
  log = pack(entries)
  writeJSON('review-log', log)
  listeners.forEach((l) => l())
}

export const reviewLog = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => entries,
  packed: () => log,
  append(e: ReviewEntry) {
    commit([...entries, e])
  },
  /** Hoàn tác: bỏ lượt chấm gần nhất của thẻ `id`. */
  removeLast(id: string) {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].id === id) {
        commit([...entries.slice(0, i), ...entries.slice(i + 1)])
        return
      }
    }
  },
  replace(p: PackedLog) {
    commit(unpack(p))
  },
  reset() {
    commit([])
  },
}

export const useReviewLog = () => useSyncExternalStore(reviewLog.subscribe, reviewLog.getSnapshot)

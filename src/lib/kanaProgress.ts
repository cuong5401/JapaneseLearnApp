import { useSyncExternalStore } from 'react'
import type { KanaChar } from '../types'
import { readJSON, writeJSON } from './storage'

/**
 * Mức thuộc từng chữ kana (localStorage `jla:v1:kana`, có trong Xuất/Nhập tiến độ).
 * "Đã thuộc" = đúng ngay lần đầu 3 lần liên tiếp; sai một lần là về "đang học".
 */
export interface KanaStat {
  /** Số lần đúng ngay lần đầu */
  right: number
  /** Số lần sai (kể cả khi hỏi lại trong phiên) */
  wrong: number
  /** Chuỗi đúng ngay lần đầu liên tiếp */
  streak: number
  /** Lần luyện gần nhất (ms) */
  last: number
}

export type KanaLevel = 'new' | 'learning' | 'mastered'

export const MASTERED_STREAK = 3

export function kanaLevel(stat: KanaStat | undefined): KanaLevel {
  if (!stat || stat.right + stat.wrong === 0) return 'new'
  return stat.streak >= MASTERED_STREAK ? 'mastered' : 'learning'
}

/**
 * Cập nhật sau một câu trả lời.
 *  - `firstAttempt`: lần trả lời đầu tiên của lượt đó trong phiên. Chỉ lần này tính vào chuỗi.
 *  - Sai (bất kể lần nào) thì cộng `wrong` và xóa chuỗi.
 */
export function updateStat(stat: KanaStat | undefined, correct: boolean, firstAttempt: boolean, now: number): KanaStat {
  const s = stat ?? { right: 0, wrong: 0, streak: 0, last: 0 }
  if (!correct) return { ...s, wrong: s.wrong + 1, streak: 0, last: now }
  if (!firstAttempt) return { ...s, last: now }
  return { ...s, right: s.right + 1, streak: s.streak + 1, last: now }
}

/** Chữ yếu: sai nhiều nhất trước (rồi tới tỉ lệ sai, chuỗi ngắn), tối đa `limit` chữ. */
export function weakest(chars: readonly KanaChar[], stats: Record<string, KanaStat>, limit = 20): KanaChar[] {
  return chars
    .filter((k) => (stats[k.id]?.wrong ?? 0) > 0)
    .sort((a, b) => {
      const sa = stats[a.id]
      const sb = stats[b.id]
      return sb.wrong - sa.wrong || sb.wrong / (sb.wrong + sb.right) - sa.wrong / (sa.wrong + sa.right) || sa.streak - sb.streak
    })
    .slice(0, limit)
}

export function isKanaStat(v: unknown): v is KanaStat {
  if (!v || typeof v !== 'object') return false
  const s = v as KanaStat
  return [s.right, s.wrong, s.streak, s.last].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)
}

/** Gộp hai bản: mỗi chữ giữ bản luyện gần nhất. */
export function mergeKanaStats(current: Record<string, KanaStat>, incoming: Record<string, KanaStat>) {
  const stats = { ...current }
  let changed = 0
  for (const [id, s] of Object.entries(incoming)) {
    if (!stats[id] || s.last > stats[id].last) {
      stats[id] = s
      changed++
    }
  }
  return { stats, changed }
}

let stats: Record<string, KanaStat> = readJSON<Record<string, KanaStat>>('kana', {})
const listeners = new Set<() => void>()

function commit(next: Record<string, KanaStat>) {
  stats = next
  writeJSON('kana', stats)
  listeners.forEach((l) => l())
}

export const kanaProgress = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => stats,
  record(id: string, correct: boolean, firstAttempt: boolean) {
    commit({ ...stats, [id]: updateStat(stats[id], correct, firstAttempt, Date.now()) })
  },
  replace(next: Record<string, KanaStat>) {
    commit({ ...next })
  },
  reset() {
    commit({})
  },
}

export function useKanaStats(): Record<string, KanaStat> {
  return useSyncExternalStore(kanaProgress.subscribe, kanaProgress.getSnapshot)
}

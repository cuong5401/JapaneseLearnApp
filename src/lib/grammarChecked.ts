import { useSyncExternalStore } from 'react'
import { readJSON, writeJSON } from './storage'

/**
 * Mẫu ngữ pháp do Kotonoha tự soạn (`auto: true`) mà bạn đã đọc và bấm "Đã kiểm tra".
 * Lưu `{ id: thời điểm kiểm tra }` trong localStorage, có trong file Xuất / Nhập tiến độ.
 */
export type CheckedMap = Record<string, number>

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function sanitizeChecked(raw: unknown): CheckedMap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: CheckedMap = {}
  for (const [id, at] of Object.entries(raw)) if (/^gn\d-[0-9a-f]{8}$/.test(id) && isNum(at)) out[id] = at
  return out
}

export function toggleChecked(map: CheckedMap, id: string, now: number): CheckedMap {
  const next = { ...map }
  if (id in next) delete next[id]
  else next[id] = now
  return next
}

/** Hợp hai bên; mẫu có ở cả hai thì giữ thời điểm kiểm tra sớm hơn. */
export function mergeChecked(current: CheckedMap, incoming: CheckedMap): { map: CheckedMap; added: number } {
  const map = { ...current }
  let added = 0
  for (const [id, at] of Object.entries(incoming)) {
    if (!(id in map)) {
      map[id] = at
      added++
    } else if (at < map[id]) map[id] = at
  }
  return { map, added }
}

let state: CheckedMap = sanitizeChecked(readJSON<unknown>('grammar-checked', null)) ?? {}
const listeners = new Set<() => void>()

function commit(next: CheckedMap) {
  state = next
  writeJSON('grammar-checked', state)
  listeners.forEach((l) => l())
}

export const grammarChecked = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => state,
  toggle: (id: string) => commit(toggleChecked(state, id, Date.now())),
  replace: (next: CheckedMap) => commit(next),
}

export function useGrammarChecked(): CheckedMap {
  return useSyncExternalStore(grammarChecked.subscribe, grammarChecked.getSnapshot)
}

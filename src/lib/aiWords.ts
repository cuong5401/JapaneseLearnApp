import { useSyncExternalStore } from 'react'
import type { VocabItem } from '../types'
import { readJSON, writeJSON } from './storage'

/**
 * Từ do "Hỏi AI" gợi ý mà không có trong dữ liệu Kotonoha. Lưu riêng (id `aw-<8 hex>`) để sổ tay, flashcard
 * và ôn tập dùng như từ thường. Có trong Xuất / Nhập tiến độ (chỉ là dữ liệu từ vựng, không có API key).
 */
export interface AiWordItem {
  id: string
  word: string
  reading: string
  meaning: string
  hanViet: string
  addedAt: number
}

/** FNV-1a 32 bit: id ổn định theo chữ + cách đọc (lưu lại cùng một từ không tạo bản sao). */
function hash8(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export const aiWordId = (word: string, reading: string) => `aw-${hash8(`${word}|${reading}`)}`
export const isAiWordId = (id: string) => /^aw-[0-9a-f]{8}$/.test(id)

export const aiWordToVocab = (w: AiWordItem): VocabItem => ({
  id: w.id,
  word: w.word,
  reading: w.reading,
  meaning: w.meaning,
  ...(w.hanViet ? { hanViet: w.hanViet } : {}),
})

export function sanitizeAiWords(raw: unknown): Record<string, AiWordItem> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, AiWordItem> = {}
  for (const [id, v] of Object.entries(raw)) {
    if (!isAiWordId(id) || !v || typeof v !== 'object') continue
    const o = v as Partial<AiWordItem>
    if (typeof o.word !== 'string' || typeof o.meaning !== 'string' || !o.word.trim()) continue
    out[id] = {
      id,
      word: o.word,
      reading: typeof o.reading === 'string' ? o.reading : '',
      meaning: o.meaning,
      hanViet: typeof o.hanViet === 'string' ? o.hanViet : '',
      addedAt: Number(o.addedAt) || 0,
    }
  }
  return out
}

/** Gộp khi nhập: thêm từ chưa có, không ghi đè từ đang có. */
export function mergeAiWords(current: Record<string, AiWordItem>, incoming: Record<string, AiWordItem>) {
  const map = { ...current }
  let added = 0
  for (const [id, w] of Object.entries(incoming)) {
    if (!map[id]) {
      map[id] = w
      added++
    }
  }
  return { map, added }
}

let state: Record<string, AiWordItem> = sanitizeAiWords(readJSON<unknown>('ai-words', null)) ?? {}
const listeners = new Set<() => void>()
function commit(next: Record<string, AiWordItem>) {
  state = next
  writeJSON('ai-words', state)
  listeners.forEach((l) => l())
}

export const aiWords = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => state,
  get: (id: string) => state[id],
  /** Lưu (hoặc lấy lại) từ; trả id. */
  save(w: { word: string; reading: string; meaning: string; hanViet: string }): string {
    const id = aiWordId(w.word, w.reading)
    if (!state[id]) commit({ ...state, [id]: { id, ...w, addedAt: Date.now() } })
    return id
  },
  replace: (next: Record<string, AiWordItem>) => commit(next),
}

export const useAiWords = () => useSyncExternalStore(aiWords.subscribe, aiWords.getSnapshot)

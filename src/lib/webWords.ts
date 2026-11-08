import { useSyncExternalStore } from 'react'
import { aiWordId, type AiWordItem } from './aiWords'

/**
 * Từ tra online (Mazii) cho thẻ "Chữ Hán ngẫu nhiên": chỉ giữ trong phiên (sessionStorage),
 * không vào Xuất tiến độ. Dùng id `aw-…` như từ AI gợi ý: khi người dùng lưu vào sổ tay,
 * từ được chép sang kho "Từ AI gợi ý" (aiWords) để không mất sau phiên.
 */
const KEY = 'jla:web-words'

function load(): Record<string, AiWordItem> {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, AiWordItem>) : {}
  } catch {
    return {}
  }
}

let state: Record<string, AiWordItem> = load()
const listeners = new Set<() => void>()

export const webWords = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => state,
  get: (id: string): AiWordItem | undefined => state[id],
  /** Thêm nhiều từ; trả id theo đúng thứ tự. */
  addAll(words: readonly { word: string; reading: string; meaning: string }[]): string[] {
    const next = { ...state }
    let changed = false
    const ids = words.map((w) => {
      const id = aiWordId(w.word, w.reading)
      if (!next[id]) {
        next[id] = { id, word: w.word, reading: w.reading, meaning: w.meaning, hanViet: '', addedAt: Date.now() }
        changed = true
      }
      return id
    })
    if (changed) {
      state = next
      try {
        sessionStorage.setItem(KEY, JSON.stringify(state))
      } catch {
        // Bộ nhớ phiên bị chặn: vẫn dùng được trong lần mở trang này.
      }
      listeners.forEach((l) => l())
    }
    return ids
  },
}

export const useWebWords = () => useSyncExternalStore(webWords.subscribe, webWords.getSnapshot)

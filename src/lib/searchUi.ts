import { useSyncExternalStore } from 'react'

/** Hộp tìm kiếm toàn cục: mở từ Layout (nút, phím /) hoặc từ trang khác (nút "Vẽ chữ" ở trang Kanji). */
export type SearchUi = { open: false } | { open: true; draw: boolean }

let state: SearchUi = { open: false }
const listeners = new Set<() => void>()
const set = (next: SearchUi) => {
  state = next
  listeners.forEach((l) => l())
}

export const searchUi = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => state,
  open: (opts: { draw?: boolean } = {}) => set({ open: true, draw: Boolean(opts.draw) }),
  close: () => set({ open: false }),
}

export const useSearchUi = () => useSyncExternalStore(searchUi.subscribe, searchUi.getSnapshot)

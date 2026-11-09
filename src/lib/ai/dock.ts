import { useEffect, useSyncExternalStore } from 'react'
import { readJSON, writeJSON } from '../storage'
import { isChatMode, type ChatMode } from './prompts'
import { aiSession } from './session'
import type { AiImage } from './types'

/** Câu hỏi gửi từ chỗ khác (nút "Hỏi AI", "Nhờ AI đoán" ở bảng vẽ) vào khung chat nổi. */
export interface DockRequest {
  mode: ChatMode
  text: string
  image?: AiImage
}

export interface DockState {
  open: boolean
  /** Vị trí tab thu gọn: px tính từ đỉnh màn hình; null = mặc định */
  tabY: number | null
  /** Cuộc trò chuyện đang hiện trong khung */
  convId: string | null
  mode: ChatMode
  /** Có câu trả lời mới trong lúc thu gọn */
  unread: boolean
  /** Số màn học đang mở (flashcard, bảng vẽ, luyện kana): > 0 thì tab thu nhỏ, mờ đi */
  quiet: number
  request: DockRequest | null
}

const KEY = 'ai-dock'
type Saved = Pick<DockState, 'open' | 'tabY' | 'convId' | 'mode'>

function load(): DockState {
  const s = readJSON<Partial<Saved> | null>(KEY, null) ?? {}
  return {
    open: s.open === true,
    tabY: typeof s.tabY === 'number' && Number.isFinite(s.tabY) ? s.tabY : null,
    convId: typeof s.convId === 'string' ? s.convId : null,
    mode: isChatMode(s.mode) ? s.mode : 'lookup',
    unread: false,
    quiet: 0,
    request: null,
  }
}

let state = load()
const listeners = new Set<() => void>()

function set(patch: Partial<DockState>) {
  state = { ...state, ...patch }
  const { open, tabY, convId, mode } = state
  writeJSON(KEY, { open, tabY, convId, mode } satisfies Saved)
  listeners.forEach((l) => l())
}

export const aiDock = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => state,
  open: () => set({ open: true, unread: false }),
  close: () => set({ open: false }),
  setTabY: (tabY: number) => set({ tabY: Math.round(tabY) }),
  setConv: (convId: string | null) => set({ convId }),
  setMode: (mode: ChatMode) => set({ mode }),
  clearUnread: () => state.unread && set({ unread: false }),
  /** Mở khung và gửi (hoặc điền sẵn nếu chưa có key) câu hỏi. */
  ask: (request: DockRequest) => set({ open: true, unread: false, request, mode: request.mode }),
  takeRequest(): DockRequest | null {
    const r = state.request
    if (r) set({ request: null })
    return r
  },
  quietEnter: () => set({ quiet: state.quiet + 1 }),
  quietLeave: () => set({ quiet: Math.max(0, state.quiet - 1) }),
}

// Câu trả lời xong trong lúc khung thu gọn: chấm đỏ trên tab.
aiSession.onFinish(() => {
  if (!state.open) set({ unread: true })
})

export const useAiDock = () => useSyncExternalStore(aiDock.subscribe, aiDock.getSnapshot)

/** Màn học cần tập trung (vuốt thẻ, vẽ chữ, luyện kana): tab "Hỏi AI" thu nhỏ và mờ đi khi màn này mở. */
export function useDockQuiet(active = true) {
  useEffect(() => {
    if (!active) return
    aiDock.quietEnter()
    return () => aiDock.quietLeave()
  }, [active])
}

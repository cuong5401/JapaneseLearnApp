import { useSyncExternalStore } from 'react'
import { readJSON, writeJSON } from '../storage'
import { isChatMode, type ChatMode } from './prompts'
import type { AiMessage } from './types'

/**
 * Lịch sử "Hỏi AI": tối đa 10 cuộc trò chuyện trong localStorage. Tạo cuộc thứ 11 thì xóa cuộc cũ nhất
 * KHÔNG ghim (cuộc ghim vẫn tính vào giới hạn 10). Ảnh không lưu (chỉ ghi chú), để không đầy bộ nhớ.
 */
export const MAX_CONVERSATIONS = 10
/** Mỗi lượt chỉ gửi tối đa 20 tin gần nhất của cuộc đó. */
export const SEND_WINDOW = 20

export interface StoredMessage {
  role: 'user' | 'assistant'
  text: string
  /** Tin của người dùng có kèm ảnh (ảnh không lưu lại) */
  hadImage?: boolean
  /** Câu trả lời bị dừng giữa chừng hoặc lỗi */
  error?: string
  /** Tra từ: mục tìm thấy trong dữ liệu Kotonoha cho câu hỏi này (hiện thẻ ngay, gửi kèm cho AI) */
  hits?: LocalHit[]
  at: number
}

/** Mục tìm thấy trong dữ liệu app (từ vựng hoặc chữ Hán). */
export interface LocalHit {
  kind: 'word' | 'kanji'
  id: string
  title: string
  reading?: string
  meaning: string
}

export interface Conversation {
  id: string
  title: string
  mode: ChatMode
  pinned: boolean
  createdAt: number
  updatedAt: number
  messages: StoredMessage[]
}

export type AddResult = { ok: true; list: Conversation[]; removed?: Conversation } | { ok: false; reason: 'all-pinned' }

/** Thêm cuộc mới lên đầu; đủ 10 thì bỏ cuộc cũ nhất (theo updatedAt) không ghim. */
export function addConversation(list: readonly Conversation[], c: Conversation): AddResult {
  if (list.length < MAX_CONVERSATIONS) return { ok: true, list: [c, ...list] }
  const unpinned = list.filter((x) => !x.pinned)
  if (unpinned.length === 0) return { ok: false, reason: 'all-pinned' }
  const oldest = unpinned.reduce((a, b) => (b.updatedAt < a.updatedAt ? b : a))
  return { ok: true, list: [c, ...list.filter((x) => x.id !== oldest.id)], removed: oldest }
}

export const updateConversation = (list: readonly Conversation[], id: string, patch: (c: Conversation) => Conversation) =>
  list.map((c) => (c.id === id ? patch(c) : c))

export function renameConversation(list: readonly Conversation[], id: string, title: string, now: number): Conversation[] {
  const t = title.trim().slice(0, 80)
  return t ? updateConversation(list, id, (c) => ({ ...c, title: t, updatedAt: now })) : [...list]
}

export const removeConversation = (list: readonly Conversation[], id: string) => list.filter((c) => c.id !== id)

export const togglePin = (list: readonly Conversation[], id: string) => updateConversation(list, id, (c) => ({ ...c, pinned: !c.pinned }))

export function appendMessage(list: readonly Conversation[], id: string, m: StoredMessage): Conversation[] {
  return updateConversation(list, id, (c) => ({ ...c, messages: [...c.messages, m], updatedAt: m.at }))
}

/** Sửa tin cuối (câu trả lời đang stream / lỗi). */
export function replaceLast(list: readonly Conversation[], id: string, m: StoredMessage): Conversation[] {
  return updateConversation(list, id, (c) => ({ ...c, messages: [...c.messages.slice(0, -1), m], updatedAt: m.at }))
}

/** 20 tin gần nhất để gửi; bỏ tin lỗi / rỗng; tin đầu tiên gửi đi phải là của người dùng. */
export function sendWindow(messages: readonly StoredMessage[]): AiMessage[] {
  const usable = messages.filter((m) => !m.error && m.text.trim())
  const win = usable.slice(-SEND_WINDOW)
  while (win.length && win[0].role !== 'user') win.shift()
  return win.map((m) => ({ role: m.role, text: m.text }))
}

/** Tiêu đề tự động từ câu hỏi đầu tiên. */
export const titleFrom = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 48 ? `${t.slice(0, 47)}…` : t || 'Cuộc trò chuyện mới'
}

function sanitize(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return []
  const out: Conversation[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const c = r as Partial<Conversation>
    if (typeof c.id !== 'string' || !Array.isArray(c.messages)) continue
    out.push({
      id: c.id,
      title: typeof c.title === 'string' ? c.title : 'Cuộc trò chuyện',
      mode: isChatMode(c.mode) ? c.mode : 'lookup',
      pinned: Boolean(c.pinned),
      createdAt: Number(c.createdAt) || 0,
      updatedAt: Number(c.updatedAt) || 0,
      messages: c.messages.filter((m): m is StoredMessage => Boolean(m) && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string'),
    })
  }
  return out.slice(0, MAX_CONVERSATIONS)
}

/* ───────────── Store ───────────── */

let state: Conversation[] = sanitize(readJSON<unknown>('ai-chats', []))
const listeners = new Set<() => void>()
function commit(next: Conversation[]) {
  state = next
  writeJSON('ai-chats', state)
  listeners.forEach((l) => l())
}

export const chats = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => state,
  /** Tạo cuộc mới; trả id, hoặc null nếu cả 10 cuộc đều đang ghim. */
  create(mode: ChatMode, title: string, now = Date.now()): string | null {
    const c: Conversation = { id: `c-${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, title, mode, pinned: false, createdAt: now, updatedAt: now, messages: [] }
    const r = addConversation(state, c)
    if (!r.ok) return null
    commit(r.list)
    return c.id
  },
  append: (id: string, m: StoredMessage) => commit(appendMessage(state, id, m)),
  replaceLast: (id: string, m: StoredMessage) => commit(replaceLast(state, id, m)),
  /** Bỏ tin cuối (câu trả lời lỗi, trước khi thử lại). */
  dropLast: (id: string) => commit(updateConversation(state, id, (c) => ({ ...c, messages: c.messages.slice(0, -1) }))),
  rename: (id: string, title: string) => commit(renameConversation(state, id, title, Date.now())),
  remove: (id: string) => commit(removeConversation(state, id)),
  togglePin: (id: string) => commit(togglePin(state, id)),
  setMode: (id: string, mode: ChatMode) => commit(updateConversation(state, id, (c) => ({ ...c, mode }))),
  clearAll: () => commit([]),
}

export const useChats = () => useSyncExternalStore(chats.subscribe, chats.getSnapshot)

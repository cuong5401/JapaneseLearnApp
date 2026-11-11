import { useSyncExternalStore } from 'react'
import { readJSON, writeJSON } from './storage'

/**
 * Sổ tay: người học lưu mục khó (từ, chữ Hán, bộ thủ, mẫu ngữ pháp…) vào một hoặc nhiều sổ.
 * Chỉ lưu id mục (`ref`), không chép dữ liệu; dữ liệu tra lại bằng useEntries khi mở sổ.
 * Các hàm biến đổi là hàm thuần (trả state mới) để test được; store bên dưới lo lưu localStorage.
 */

export interface Notebook {
  id: string
  name: string
  /** Khóa màu trong NOTEBOOK_COLORS */
  color: NotebookColor
  createdAt: number
  updatedAt: number
}

/** Câu ví dụ lưu kèm một từ trong sổ tay (Tatoeba hoặc AI tạo). */
export interface SavedExample {
  ja: string
  /** Câu dịch (tiếng Việt, hoặc tiếng Anh nếu chưa có) */
  tr: string
  src: 'tatoeba' | 'ai'
  /** Id câu Tatoeba (để ghi nguồn / mở câu gốc) */
  tid?: number
}

/** Mỗi từ giữ tối đa chừng này câu ví dụ. */
export const MAX_SAVED_EXAMPLES = 5

export interface NotebookItem {
  ref: string
  addedAt: number
  /** Câu ví dụ người dùng lưu kèm từ này */
  examples?: SavedExample[]
}

export interface NotebookState {
  /** Thứ tự trong mảng là thứ tự hiển thị */
  books: Notebook[]
  items: Record<string, NotebookItem[]>
  /** Sổ dùng gần nhất (lưu nhanh khi nhấn giữ nút đánh dấu) */
  lastUsed?: string
}

/** Bảng màu có sẵn; giá trị thật là biến CSS --nb-* (đổi theo theme) trong index.css. */
export const NOTEBOOK_COLORS = ['kihada', 'beni', 'ai', 'matsu', 'fuji', 'sakura', 'sora', 'sumi'] as const
export type NotebookColor = (typeof NOTEBOOK_COLORS)[number]

export const COLOR_LABEL: Record<NotebookColor, string> = {
  kihada: 'Vàng hoàng bá',
  beni: 'Đỏ son',
  ai: 'Chàm',
  matsu: 'Xanh tùng',
  fuji: 'Tím hoa tử đằng',
  sakura: 'Hồng anh đào',
  sora: 'Xanh trời',
  sumi: 'Mực',
}

export const DEFAULT_BOOK_ID = 'default'

export function initialState(now = 0): NotebookState {
  return {
    books: [{ id: DEFAULT_BOOK_ID, name: 'Từ khó', color: 'kihada', createdAt: now, updatedAt: now }],
    items: { [DEFAULT_BOOK_ID]: [] },
  }
}

const touch = (s: NotebookState, id: string, now: number): Notebook[] =>
  s.books.map((b) => (b.id === id ? { ...b, updatedAt: now } : b))

export function createBook(s: NotebookState, name: string, color: NotebookColor, id: string, now: number): NotebookState {
  const clean = name.trim().slice(0, 60) || 'Sổ tay mới'
  return {
    ...s,
    books: [...s.books, { id, name: clean, color, createdAt: now, updatedAt: now }],
    items: { ...s.items, [id]: [] },
  }
}

export function renameBook(s: NotebookState, id: string, name: string, now: number): NotebookState {
  const clean = name.trim().slice(0, 60)
  if (!clean) return s
  return { ...s, books: s.books.map((b) => (b.id === id ? { ...b, name: clean, updatedAt: now } : b)) }
}

export function recolorBook(s: NotebookState, id: string, color: NotebookColor, now: number): NotebookState {
  return { ...s, books: s.books.map((b) => (b.id === id ? { ...b, color, updatedAt: now } : b)) }
}

/** Xóa sổ (không xóa được sổ cuối cùng). */
export function deleteBook(s: NotebookState, id: string): NotebookState {
  if (s.books.length <= 1 || !s.books.some((b) => b.id === id)) return s
  const items = { ...s.items }
  delete items[id]
  return { books: s.books.filter((b) => b.id !== id), items, lastUsed: s.lastUsed === id ? undefined : s.lastUsed }
}

/** Đổi chỗ sổ lên (-1) hoặc xuống (+1). */
export function moveBook(s: NotebookState, id: string, delta: -1 | 1): NotebookState {
  const i = s.books.findIndex((b) => b.id === id)
  const j = i + delta
  if (i === -1 || j < 0 || j >= s.books.length) return s
  const books = [...s.books]
  ;[books[i], books[j]] = [books[j], books[i]]
  return { ...s, books }
}

export const hasItem = (s: NotebookState, bookId: string, ref: string) => (s.items[bookId] ?? []).some((it) => it.ref === ref)

const sameExample = (a: SavedExample, b: SavedExample) => a.ja === b.ja

/** Gắn câu ví dụ vào từ trong sổ (thêm từ vào sổ nếu chưa có). Trùng câu thì giữ nguyên; tối đa MAX_SAVED_EXAMPLES. */
export function addExample(s: NotebookState, bookId: string, ref: string, ex: SavedExample, now: number): NotebookState {
  const withItem = addItem(s, bookId, ref, now)
  const list = withItem.items[bookId] ?? []
  return {
    ...withItem,
    items: {
      ...withItem.items,
      [bookId]: list.map((it) => {
        if (it.ref !== ref || it.examples?.some((x) => sameExample(x, ex))) return it
        return { ...it, examples: [...(it.examples ?? []), ex].slice(-MAX_SAVED_EXAMPLES) }
      }),
    },
  }
}

function sanitizeExamples(v: unknown): SavedExample[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: SavedExample[] = []
  for (const e of v) {
    if (!e || typeof e.ja !== 'string' || !e.ja.trim() || typeof e.tr !== 'string') continue
    out.push({ ja: e.ja.slice(0, 300), tr: e.tr.slice(0, 500), src: e.src === 'ai' ? 'ai' : 'tatoeba', ...(Number.isInteger(e.tid) ? { tid: e.tid } : {}) })
  }
  return out.length ? out.slice(-MAX_SAVED_EXAMPLES) : undefined
}

export function addItem(s: NotebookState, bookId: string, ref: string, now: number): NotebookState {
  if (!s.books.some((b) => b.id === bookId) || hasItem(s, bookId, ref)) return { ...s, lastUsed: bookId }
  return {
    books: touch(s, bookId, now),
    items: { ...s.items, [bookId]: [...(s.items[bookId] ?? []), { ref, addedAt: now }] },
    lastUsed: bookId,
  }
}

export function removeItem(s: NotebookState, bookId: string, ref: string, now: number): NotebookState {
  if (!hasItem(s, bookId, ref)) return s
  return { ...s, books: touch(s, bookId, now), items: { ...s.items, [bookId]: s.items[bookId].filter((it) => it.ref !== ref) } }
}

export function toggleItem(s: NotebookState, bookId: string, ref: string, now: number): NotebookState {
  return hasItem(s, bookId, ref) ? removeItem(s, bookId, ref, now) : addItem(s, bookId, ref, now)
}

export const booksContaining = (s: NotebookState, ref: string) => s.books.filter((b) => hasItem(s, b.id, ref))
export const isSaved = (s: NotebookState, ref: string) => s.books.some((b) => hasItem(s, b.id, ref))
export const itemCount = (s: NotebookState, bookId: string) => s.items[bookId]?.length ?? 0

/** Sổ cho lưu nhanh: sổ dùng gần nhất nếu còn, không thì sổ đầu tiên. */
export function quickSaveTarget(s: NotebookState): Notebook {
  return s.books.find((b) => b.id === s.lastUsed) ?? s.books[0]
}

/* ───────────── Xuất / nhập ───────────── */

const isColor = (v: unknown): v is NotebookColor => typeof v === 'string' && (NOTEBOOK_COLORS as readonly string[]).includes(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Đọc dữ liệu sổ tay từ file nhập; bỏ phần hỏng. Trả null nếu không dùng được. */
export function sanitizeState(v: unknown): NotebookState | null {
  if (!v || typeof v !== 'object') return null
  const raw = v as Partial<NotebookState>
  if (!Array.isArray(raw.books)) return null
  const books: Notebook[] = []
  for (const b of raw.books) {
    if (!b || typeof b.id !== 'string' || typeof b.name !== 'string' || books.some((x) => x.id === b.id)) continue
    books.push({
      id: b.id,
      name: b.name.slice(0, 60) || 'Sổ tay',
      color: isColor(b.color) ? b.color : 'ai',
      createdAt: isNum(b.createdAt) ? b.createdAt : 0,
      updatedAt: isNum(b.updatedAt) ? b.updatedAt : 0,
    })
  }
  if (books.length === 0) return null
  const items: Record<string, NotebookItem[]> = {}
  for (const b of books) {
    const list = Array.isArray(raw.items?.[b.id]) ? raw.items![b.id] : []
    const seen = new Set<string>()
    items[b.id] = list.filter((it) => {
      if (!it || typeof it.ref !== 'string' || seen.has(it.ref)) return false
      seen.add(it.ref)
      return true
    }).map((it) => {
      const examples = sanitizeExamples((it as NotebookItem).examples)
      return { ref: it.ref, addedAt: isNum(it.addedAt) ? it.addedAt : 0, ...(examples ? { examples } : {}) }
    })
  }
  return { books, items, lastUsed: typeof raw.lastUsed === 'string' ? raw.lastUsed : undefined }
}

/**
 * Gộp sổ tay nhập vào: sổ trùng id thì hợp các mục (giữ ngày thêm sớm hơn) và lấy tên/màu của bản sửa sau;
 * sổ mới thì thêm vào cuối. Không xóa gì ở máy này.
 */
export function mergeNotebooks(current: NotebookState, incoming: NotebookState) {
  const books = [...current.books]
  const items = { ...current.items }
  let addedBooks = 0
  let addedItems = 0
  for (const b of incoming.books) {
    const i = books.findIndex((x) => x.id === b.id)
    if (i === -1) {
      books.push(b)
      items[b.id] = [...(incoming.items[b.id] ?? [])]
      addedBooks++
      addedItems += items[b.id].length
      continue
    }
    if (b.updatedAt > books[i].updatedAt) books[i] = { ...books[i], name: b.name, color: b.color, updatedAt: b.updatedAt }
    const mine = new Map((items[b.id] ?? []).map((it) => [it.ref, it]))
    for (const it of incoming.items[b.id] ?? []) {
      const have = mine.get(it.ref)
      if (!have) {
        mine.set(it.ref, it)
        addedItems++
      } else {
        // Hợp câu ví dụ của hai bên (không trùng câu), giữ ngày thêm sớm hơn.
        const examples = [...(have.examples ?? [])]
        for (const ex of it.examples ?? []) if (!examples.some((x) => sameExample(x, ex))) examples.push(ex)
        const base = it.addedAt < have.addedAt ? it : have
        mine.set(it.ref, examples.length ? { ...base, examples: examples.slice(-MAX_SAVED_EXAMPLES) } : base)
      }
    }
    items[b.id] = [...mine.values()].sort((a, c) => a.addedAt - c.addedAt)
  }
  return { state: { books, items, lastUsed: current.lastUsed }, addedBooks, addedItems }
}

/* ───────────── Store ───────────── */

let state: NotebookState = sanitizeState(readJSON<unknown>('notebooks', null)) ?? initialState(Date.now())
const listeners = new Set<() => void>()

function commit(next: NotebookState) {
  if (next === state) return
  state = next
  writeJSON('notebooks', state)
  listeners.forEach((l) => l())
}

const newId = () => `nb-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const notebooks = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot: () => state,
  create(name: string, color: NotebookColor): string {
    const id = newId()
    commit(createBook(state, name, color, id, Date.now()))
    return id
  },
  rename: (id: string, name: string) => commit(renameBook(state, id, name, Date.now())),
  recolor: (id: string, color: NotebookColor) => commit(recolorBook(state, id, color, Date.now())),
  remove: (id: string) => commit(deleteBook(state, id)),
  move: (id: string, delta: -1 | 1) => commit(moveBook(state, id, delta)),
  add: (bookId: string, ref: string) => commit(addItem(state, bookId, ref, Date.now())),
  removeItem: (bookId: string, ref: string) => commit(removeItem(state, bookId, ref, Date.now())),
  toggle: (bookId: string, ref: string) => commit(toggleItem(state, bookId, ref, Date.now())),
  /** Lưu nhanh vào sổ dùng gần nhất; trả về sổ đã lưu. */
  quickSave(ref: string): Notebook {
    const target = quickSaveTarget(state)
    commit(addItem(state, target.id, ref, Date.now()))
    return target
  },
  /** Lưu câu ví dụ kèm từ vào sổ dùng gần nhất; trả sổ đã lưu. */
  saveExample(ref: string, ex: SavedExample): Notebook {
    const target = quickSaveTarget(state)
    commit(addExample(state, target.id, ref, ex, Date.now()))
    return target
  },
  replace: (next: NotebookState) => commit(next),
}

export function useNotebooks(): NotebookState {
  return useSyncExternalStore(notebooks.subscribe, notebooks.getSnapshot)
}

import type { ExampleItem } from './tatoeba'

/**
 * Cache câu ví dụ theo id từ: IndexedDB (db "kotonoha", store "examples"), hạn 30 ngày, tối đa 2.000 từ
 * (quá thì xóa mục cũ nhất). IndexedDB bị chặn (riêng tư, test) thì dùng bộ nhớ.
 */
export const TTL_MS = 30 * 86_400_000
export const MAX_ENTRIES = 2000

export interface CacheEntry {
  /** id từ */
  id: string
  at: number
  items: ExampleItem[]
  /** Trang Tatoeba tiếp theo ("Ví dụ khác" khi đã xem hết) */
  next: string | null
  src: 'tatoeba' | 'ai'
}

export interface ExampleStore {
  get(id: string): Promise<CacheEntry | undefined>
  put(entry: CacheEntry): Promise<void>
}

export const isFresh = (e: CacheEntry | undefined, now: number): e is CacheEntry => Boolean(e && now - e.at < TTL_MS)

/** Bản bộ nhớ (Vitest, hoặc khi không mở được IndexedDB). */
export function memoryStore(max = MAX_ENTRIES): ExampleStore & { size: () => number } {
  const map = new Map<string, CacheEntry>()
  return {
    size: () => map.size,
    get: async (id) => map.get(id),
    put: async (e) => {
      map.set(e.id, e)
      if (map.size > max) {
        const oldest = [...map.values()].sort((a, b) => a.at - b.at).slice(0, map.size - max)
        for (const o of oldest) map.delete(o.id)
      }
    },
  }
}

const DB = 'kotonoha'
const STORE = 'examples'

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => {
      const s = r.result.createObjectStore(STORE, { keyPath: 'id' })
      s.createIndex('at', 'at')
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function idbStore(): ExampleStore {
  let db: Promise<IDBDatabase> | null = null
  const getDb = () => (db ??= openDb())
  return {
    async get(id) {
      const tx = (await getDb()).transaction(STORE, 'readonly')
      return (await req(tx.objectStore(STORE).get(id))) as CacheEntry | undefined
    },
    async put(e) {
      const tx = (await getDb()).transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      store.put(e)
      const count = await req(store.count())
      if (count > MAX_ENTRIES) {
        // Xóa các mục cũ nhất theo thời điểm lưu.
        let extra = count - MAX_ENTRIES
        const cursor = store.index('at').openCursor()
        await new Promise<void>((resolve, reject) => {
          cursor.onsuccess = () => {
            const c = cursor.result
            if (!c || extra <= 0) return resolve()
            c.delete()
            extra--
            c.continue()
          }
          cursor.onerror = () => reject(cursor.error)
        })
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
  }
}

let store: ExampleStore | null = null

/** Store dùng trong app: IndexedDB nếu có, lỗi thì chuyển sang bộ nhớ (không làm hỏng khối ví dụ). */
export function exampleStore(): ExampleStore {
  if (store) return store
  const mem = memoryStore()
  if (typeof indexedDB === 'undefined') return (store = mem)
  const idb = idbStore()
  store = {
    get: (id) => idb.get(id).catch(() => mem.get(id)),
    put: (e) => idb.put(e).catch(() => mem.put(e)),
  }
  return store
}

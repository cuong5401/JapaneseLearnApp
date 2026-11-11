import { useEffect, useRef, useState } from 'react'
import { generateExamples, translateToVi } from '../lib/ai/complete'
import { aiSettings } from '../lib/ai/settings'
import { exampleStore, isFresh, type CacheEntry } from '../lib/examples/cache'
import { PAGE, fetchTatoeba, rankExamples, searchTerms, type ExampleItem } from '../lib/examples/tatoeba'
import { LEVELS, type Level, type VocabItem } from '../types'

export type ExamplesState =
  | { status: 'loading' }
  | { status: 'ready'; entry: CacheEntry; page: number; more: boolean }
  /** Có mạng nhưng không có câu phù hợp (và không có AI key / AI lỗi) */
  | { status: 'empty' }
  /** Mất mạng, không có cache: ẩn khối */
  | { status: 'offline' }

/** Cấp của từ theo tiền tố id (n5-…); không rõ thì dùng trình độ trong Cài đặt AI. */
function levelOf(id: string): Level {
  const m = /^n([1-5])-/.exec(id)
  return m ? (`N${m[1]}` as Level) : (LEVELS.includes(aiSettings.getSnapshot().level) ? aiSettings.getSnapshot().level : 'N3')
}

const aiItems = (list: { ja: string; vi: string }[]): ExampleItem[] => list.map((x, i) => ({ key: `ai:${i}`, ja: x.ja, vi: x.vi, src: 'ai' }))

/**
 * Câu ví dụ cho chi tiết một từ: cache (IndexedDB, 30 ngày) → Tatoeba (khi có mạng) → AI tạo 3 câu (khi có key)
 * → "Chưa tìm thấy". Chỉ gọi mạng khi mở chi tiết; đóng panel / đổi từ thì hủy request (AbortController).
 */
export function useWordExamples(item: Pick<VocabItem, 'id' | 'word' | 'reading' | 'meaning' | 'alt'>) {
  const [st, setSt] = useState<{ id: string; s: ExamplesState }>({ id: item.id, s: { status: 'loading' } })
  const state: ExamplesState = st.id === item.id ? st.s : { status: 'loading' }
  const set = (s: ExamplesState) => setSt({ id: item.id, s })
  const ctrlRef = useRef<AbortController | null>(null)
  const terms = searchTerms(item.word, item.alt)

  useEffect(() => {
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    const id = item.id
    const put = (s: ExamplesState) => {
      if (!ctrl.signal.aborted) setSt({ id, s })
    }
    const t = searchTerms(item.word, item.alt)
    const store = exampleStore()
    void (async () => {
      const cached = await store.get(id)
      if (ctrl.signal.aborted) return
      if (isFresh(cached, Date.now()) && cached.items.length) return put({ status: 'ready', entry: cached, page: 0, more: false })
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return put(cached?.items.length ? { status: 'ready', entry: cached, page: 0, more: false } : { status: 'offline' })
      }
      try {
        const r = await fetchTatoeba(t, { signal: ctrl.signal })
        const items = rankExamples(r.items, t)
        if (items.length) {
          const entry: CacheEntry = { id, at: Date.now(), items, next: r.next, src: 'tatoeba' }
          void store.put(entry)
          return put({ status: 'ready', entry, page: 0, more: false })
        }
      } catch {
        if (ctrl.signal.aborted) return
      }
      // Tatoeba không có câu phù hợp hoặc lỗi: AI tạo 3 câu nếu đã có key.
      if (!aiSettings.getSnapshot().hasKey) return put({ status: 'empty' })
      try {
        const list = await generateExamples(item.word, item.reading, item.meaning, levelOf(id), ctrl.signal)
        const entry: CacheEntry = { id, at: Date.now(), items: aiItems(list), next: null, src: 'ai' }
        void store.put(entry)
        put({ status: 'ready', entry, page: 0, more: false })
      } catch {
        put({ status: 'empty' })
      }
    })()
    return () => ctrl.abort()
  }, [item.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = state.status === 'ready' ? state.entry.items.slice(state.page * PAGE, state.page * PAGE + PAGE) : []

  /** "Ví dụ khác": bộ 3 câu tiếp theo; hết thì tải trang Tatoeba sau; không còn gì thì quay về bộ đầu. */
  const more = async () => {
    if (state.status !== 'ready' || state.more) return
    const { entry, page } = state
    if ((page + 1) * PAGE < entry.items.length) return set({ ...state, page: page + 1 })
    if (!entry.next || !navigator.onLine) return set({ ...state, page: 0 })
    set({ ...state, more: true })
    try {
      const r = await fetchTatoeba(terms, { next: entry.next, signal: ctrlRef.current?.signal })
      const added = rankExamples(r.items, terms, entry.items)
      const next: CacheEntry = { ...entry, items: [...entry.items, ...added], next: r.next, at: Date.now() }
      void exampleStore().put(next)
      set({ status: 'ready', entry: next, page: added.length ? page + 1 : 0, more: false })
    } catch {
      set({ ...state, page: 0, more: false })
    }
  }

  /** Dịch câu (đang chỉ có tiếng Anh) sang tiếng Việt bằng AI; lưu vào cache. */
  const translate = async (key: string) => {
    if (state.status !== 'ready') return
    const it = state.entry.items.find((x) => x.key === key)
    if (!it) return
    const vi = await translateToVi(it.ja, it.en, ctrlRef.current?.signal)
    const entry: CacheEntry = { ...state.entry, items: state.entry.items.map((x) => (x.key === key ? { ...x, vi, viByAi: true } : x)) }
    void exampleStore().put(entry)
    setSt((cur) => (cur.id === item.id && cur.s.status === 'ready' ? { id: item.id, s: { ...cur.s, entry } } : cur))
  }

  return { state, shown, terms, more, translate }
}

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { TERM_BY_ID, VOCAB_DECK_INFO, deckKeyForId, getTerms } from '../data'
import { MANIFEST, dataStore, indexById, pathForId, request, type LoadStatus } from '../lib/dataStore'
import { charOfRef } from '../lib/chars'
import { withRadicalIds } from '../lib/radicals'
import type {
  DataManifest,
  Deck,
  GrammarEntry,
  KanjiEntry,
  Level,
  RadicalEntry,
  RadicalItem,
  StudyEntry,
  VocabItem,
} from '../types'

export interface Loadable<T> {
  status: LoadStatus
  data?: T
  error?: string
  retry: () => void
}

function useStoreVersion() {
  return useSyncExternalStore(dataStore.subscribe, dataStore.getVersion)
}

/** Tải nhiều file cùng lúc; trạng thái chung = lỗi nếu có file lỗi, đang tải nếu còn file chưa xong. */
export function useFiles(paths: readonly string[]) {
  useStoreVersion()
  const key = paths.join('|')
  useEffect(() => {
    if (key) key.split('|').forEach((p) => request(p))
  }, [key])
  const states = paths.map((p) => dataStore.get(p))
  const error = states.find((s) => s?.status === 'error')?.error
  const status: LoadStatus = error ? 'error' : states.every((s) => s?.status === 'ready') ? 'ready' : 'loading'
  return {
    status,
    error,
    data: states.map((s) => s?.data),
    retry: () => paths.forEach((p) => request(p, true)),
  }
}

function useFile<T>(path: string | null): Loadable<T> {
  const r = useFiles(path ? [path] : [])
  if (!path) return { status: 'loading', retry: () => {} }
  return { status: r.status, error: r.error, data: r.data[0] as T | undefined, retry: r.retry }
}

export const useManifest = () => useFile<DataManifest>(MANIFEST)
export const useKanjiIndex = () => useFile<KanjiEntry[]>('kanji/kanji.json')
/** Bộ thủ kèm id rd-001… (gắn một lần cho mỗi mảng dữ liệu). */
export function useRadicals(): Loadable<RadicalItem[]> {
  const r = useFile<RadicalEntry[]>('kanji/radicals.json')
  return { ...r, data: r.data ? withRadicalIds(r.data) : undefined }
}
export const useGrammar = (level: Level) => useFile<GrammarEntry[]>(`grammar/${level.toLowerCase()}.json`)

/** Từ vựng của một bộ: bộ public/data được tải về, nhóm thuật ngữ có sẵn thì trả ngay. */
export function useVocab(deck: Deck): Loadable<VocabItem[]> {
  const file = useFile<VocabItem[]>(deck.kind === 'vocab' ? VOCAB_DECK_INFO[deck.key].path : null)
  if (deck.kind === 'terms') return { status: 'ready', data: getTerms(deck.category), retry: () => {} }
  return file
}

export interface EntriesResult {
  status: LoadStatus
  error?: string
  retry: () => void
  /** Chỉ chứa các ID tìm thấy; ID không còn tồn tại bị bỏ qua. */
  entries: Map<string, StudyEntry>
}

/** Tra mục theo ID bất kỳ: tự tải các file cần theo tiền tố ID (n5-, cp-, kj-, gn4-…). */
export function useEntries(ids: readonly string[]): EntriesResult {
  const idsKey = ids.join('|')
  const paths = useMemo(() => {
    const set = new Set<string>()
    for (const id of idsKey ? idsKey.split('|') : []) {
      const p = pathForId(id)
      if (p) set.add(p)
    }
    return [...set].sort()
  }, [idsKey])
  const files = useFiles(paths)
  const version = useStoreVersion()
  const ready = files.status === 'ready'
  const dataKey = files.data

  const entries = useMemo(() => {
    const map = new Map<string, StudyEntry>()
    if (!ready) return map
    const byPath = new Map(paths.map((p, i) => [p, dataKey[i] as { id: string }[] | undefined]))
    for (const id of idsKey ? idsKey.split('|') : []) {
      const term = TERM_BY_ID.get(id)
      if (term) {
        map.set(id, { kind: 'word', item: term.item, deck: { kind: 'terms', category: term.category } })
        continue
      }
      const ch = charOfRef(id)
      if (ch) {
        map.set(id, { kind: 'char', item: { id, char: ch } })
        continue
      }
      const path = pathForId(id)
      const raw = path ? byPath.get(path) : undefined
      const list = path === 'kanji/radicals.json' && raw ? withRadicalIds(raw as unknown as RadicalEntry[]) : raw
      const item = list ? indexById(list).get(id) : undefined
      if (!item || !path) continue
      if (path === 'kanji/radicals.json') map.set(id, { kind: 'radical', item: item as RadicalItem })
      else if (path.startsWith('kanji/')) map.set(id, { kind: 'kanji', item: item as KanjiEntry })
      else if (path.startsWith('grammar/')) map.set(id, { kind: 'grammar', item: item as GrammarEntry })
      else {
        const key = deckKeyForId(id)
        if (key) map.set(id, { kind: 'word', item: item as VocabItem, deck: { kind: 'vocab', key } })
      }
    }
    return map
    // `dataKey` là mảng mới mỗi lần render; `version` đổi đúng khi dữ liệu trong kho đổi.
  }, [ready, idsKey, paths, version]) // eslint-disable-line react-hooks/exhaustive-deps

  return { status: files.status, error: files.error, retry: files.retry, entries }
}

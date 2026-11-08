import { useMemo } from 'react'
import { TERM_INFO, VOCAB_DECK_INFO, getTerms } from '../data'
import { PUBLIC_BUILD } from '../lib/edition'
import { grammarDocs, kanjiDocs, vocabDocs, type SearchDoc } from '../lib/search'
import { LEVELS, TERM_CATEGORIES, VOCAB_DECKS, type GrammarEntry, type KanjiEntry, type VocabItem } from '../types'
import { useFiles } from './useData'

const VOCAB_PATHS = VOCAB_DECKS.map((k) => VOCAB_DECK_INFO[k].path)
// Bản public không có file ngữ pháp: không tải, không tìm.
const GRAMMAR_PATHS = PUBLIC_BUILD ? [] : LEVELS.map((l) => `grammar/${l.toLowerCase()}.json`)
export const SEARCH_PATHS = [...VOCAB_PATHS, 'kanji/kanji.json', ...GRAMMAR_PATHS]

/** Chỉ mục tìm kiếm dựng một lần cho mỗi file dữ liệu. */
const docCache = new WeakMap<object, SearchDoc[]>()
function docsFor(data: unknown, path: string): SearchDoc[] {
  if (!Array.isArray(data)) return []
  let docs = docCache.get(data)
  if (!docs) {
    if (path.startsWith('vocab/')) {
      const info = VOCAB_DECKS.map((k) => VOCAB_DECK_INFO[k]).find((d) => d.path === path)!
      docs = vocabDocs(data as VocabItem[], info.level ?? info.name)
    } else if (path.startsWith('kanji/')) docs = kanjiDocs(data as KanjiEntry[])
    else docs = grammarDocs(data as GrammarEntry[], path.slice(8, 10).toUpperCase() as (typeof LEVELS)[number])
    docCache.set(data, docs)
  }
  return docs
}

const termDocs: SearchDoc[] = TERM_CATEGORIES.flatMap((c) => vocabDocs(getTerms(c), TERM_INFO[c].name))

/** Tài liệu tìm kiếm (từ vựng, chữ Hán, ngữ pháp, thuật ngữ) của tìm kiếm chung và "Hỏi AI" → Tra từ. */
export function useSearchDocs() {
  const files = useFiles(SEARCH_PATHS)
  const loaded = files.data.filter(Boolean).length
  const docs = useMemo(
    () => [...files.data.flatMap((d, i) => docsFor(d, SEARCH_PATHS[i])), ...termDocs],
    // files.data là mảng mới mỗi lần render; số file đã tải là đủ để biết khi nào dựng lại.
    [loaded], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return { docs, files, loaded, total: SEARCH_PATHS.length }
}

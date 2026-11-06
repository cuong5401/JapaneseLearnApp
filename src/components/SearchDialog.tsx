import { motion } from 'motion/react'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { TERM_INFO, VOCAB_DECK_INFO, getTerms } from '../data'
import { useFiles } from '../hooks/useData'
import { grammarDocs, kanjiDocs, search, vocabDocs, type SearchDoc, type SearchKind } from '../lib/search'
import { LEVELS, TERM_CATEGORIES, VOCAB_DECKS, type GrammarEntry, type KanjiEntry, type VocabItem } from '../types'

const VOCAB_PATHS = VOCAB_DECKS.map((k) => VOCAB_DECK_INFO[k].path)
const GRAMMAR_PATHS = LEVELS.map((l) => `grammar/${l.toLowerCase()}.json`)
const PATHS = [...VOCAB_PATHS, 'kanji/kanji.json', ...GRAMMAR_PATHS]

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

const termDocs: SearchDoc[] = TERM_CATEGORIES.flatMap((c) =>
  vocabDocs(getTerms(c), TERM_INFO[c].name),
)

const GROUPS: { kind: SearchKind; title: string }[] = [
  { kind: 'word', title: 'Từ vựng' },
  { kind: 'kanji', title: 'Chữ Hán' },
  { kind: 'grammar', title: 'Ngữ pháp' },
]

export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [active, setActive] = useState(0)
  const files = useFiles(PATHS)

  const loaded = files.data.filter(Boolean).length
  const docs = useMemo(
    () => [...files.data.flatMap((d, i) => docsFor(d, PATHS[i])), ...termDocs],
    // files.data là mảng mới mỗi lần render; số file đã tải là đủ để biết khi nào dựng lại.
    [loaded], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const results = useMemo(() => search(docs, deferred), [docs, deferred])
  const flat = useMemo(() => GROUPS.flatMap((g) => results[g.kind]), [results])

  useEffect(() => {
    inputRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const open = (doc: SearchDoc) => {
    onClose()
    navigate(doc.href)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(flat.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault()
      open(flat[active])
    }
  }

  // Vị trí bắt đầu của từng nhóm trong danh sách phẳng (dùng cho phím mũi tên).
  const offsets = GROUPS.map((_, gi) => GROUPS.slice(0, gi).reduce((n, g) => n + results[g.kind].length, 0))
  const pending = loaded < PATHS.length

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:p-6 sm:pt-[10vh]" onKeyDown={onKeyDown}>
      <motion.div className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="relative flex h-dvh w-full max-w-2xl flex-col overflow-hidden bg-paper pt-[env(safe-area-inset-top)] shadow-2xl sm:h-auto sm:max-h-[75vh] sm:rounded-2xl sm:border sm:border-line"
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <svg viewBox="0 0 24 24" className="ml-1 size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="search-results"
            aria-activedescendant={flat[active] ? `sr-${flat[active].id}` : undefined}
            aria-label="Tìm từ, chữ Hán, ngữ pháp"
            placeholder="Chữ Nhật, kana, romaji, Hán Việt hoặc nghĩa"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-14 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-base placeholder:text-muted"
          />
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg px-3 text-sm text-muted hover:bg-sunken hover:text-ink">
            Đóng
          </button>
        </div>

        <div ref={listRef} id="search-results" role="listbox" aria-label="Kết quả tìm kiếm" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {files.status === 'error' && (
            <p className="m-3 rounded-lg bg-beni-soft p-3 text-sm text-beni">
              Một số dữ liệu chưa tải được.{' '}
              <button type="button" onClick={files.retry} className="font-semibold underline">
                Thử lại
              </button>
            </p>
          )}
          {!deferred.trim() ? (
            <p className="px-3 py-6 text-sm text-muted">
              Ví dụ: 参加, さんか, sanka, tham gia, THAM.{pending && ` Đang tải dữ liệu (${loaded}/${PATHS.length})…`}
            </p>
          ) : flat.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted">{pending ? `Đang tải dữ liệu (${loaded}/${PATHS.length})…` : `Không tìm thấy "${deferred}". Thử bỏ dấu hoặc gõ ngắn hơn.`}</p>
          ) : (
            <>
              {GROUPS.map((g, gi) =>
                results[g.kind].length ? (
                  <section key={g.kind} className="mb-2">
                    <h3 className="px-3 pt-2 pb-1 text-xs font-semibold text-muted">
                      {g.title} ({results[g.kind].length})
                    </h3>
                    {results[g.kind].map((doc, j) => {
                      const i = offsets[gi] + j
                      return (
                        <button
                          key={doc.kind + doc.id}
                          id={`sr-${doc.id}`}
                          type="button"
                          role="option"
                          aria-selected={i === active}
                          data-index={i}
                          onMouseMove={() => setActive(i)}
                          onClick={() => open(doc)}
                          className={`flex w-full items-baseline gap-3 rounded-lg px-3 py-2.5 text-left ${i === active ? 'bg-ai-soft' : ''}`}
                        >
                          <span lang="ja" className="shrink-0 font-jp text-lg font-semibold">
                            {doc.title}
                          </span>
                          <span className="min-w-0 flex-1">
                            {doc.reading && (
                              <span lang={doc.kind === 'kanji' ? undefined : 'ja'} className={`mr-2 text-sm ${doc.kind === 'kanji' ? 'font-semibold tracking-wide text-ai' : 'font-jp text-muted'}`}>
                                {doc.reading}
                              </span>
                            )}
                            <span className="line-clamp-2 text-sm">{doc.subtitle}</span>
                          </span>
                          <span className="shrink-0 rounded-md bg-sunken px-1.5 py-0.5 text-xs text-muted">{doc.badge}</span>
                        </button>
                      )
                    })}
                  </section>
                ) : null,
              )}
              {pending && <p className="px-3 py-2 text-xs text-muted">Đang tải thêm dữ liệu ({loaded}/{PATHS.length}), kết quả có thể thay đổi.</p>}
            </>
          )}
        </div>
        <p className="hidden border-t border-line px-4 py-2 text-xs text-muted sm:block">↑ ↓ để chọn, Enter để mở, Esc để đóng. Tối đa 50 kết quả.</p>
      </motion.div>
    </div>,
    document.body,
  )
}

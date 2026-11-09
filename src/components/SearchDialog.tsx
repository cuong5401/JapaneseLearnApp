import { motion } from 'motion/react'
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDetailStack } from '../hooks/useDetailStack'
import { useSearchDocs } from '../hooks/useSearchDocs'
import { aiDock, type DockRequest } from '../lib/ai/dock'
import { setHandoff } from '../lib/ai/handoff'
import { modelSupportsImages } from '../lib/ai/providers'
import { aiSettings, useAiSettings } from '../lib/ai/settings'
import { search, type SearchDoc, type SearchKind } from '../lib/search'

const GROUPS: { kind: SearchKind; title: string }[] = [
  { kind: 'word', title: 'Từ vựng' },
  { kind: 'kanji', title: 'Chữ Hán' },
  { kind: 'grammar', title: 'Ngữ pháp' },
]

/** Bảng vẽ chữ: chunk riêng, kéo theo Web Worker nhận dạng (~2 MB mẫu nét) chỉ khi mở. */
const HandwritingPanel = lazy(() => import('./handwriting/HandwritingPanel'))

export default function SearchDialog({ onClose, initialDraw = false }: { onClose: () => void; initialDraw?: boolean }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const stack = useDetailStack()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [active, setActive] = useState(0)
  const [drawing, setDrawing] = useState(initialDraw)
  const { docs, files, loaded, total } = useSearchDocs()
  const results = useMemo(() => search(docs, deferred), [docs, deferred])
  const flat = useMemo(() => GROUPS.flatMap((g) => results[g.kind]), [results])

  useEffect(() => {
    // Mở thẳng bảng vẽ thì không focus ô nhập (khỏi bật bàn phím điện thoại che khung vẽ).
    if (!initialDraw) inputRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const open = (doc: SearchDoc) => {
    onClose()
    // Từ vựng mở chi tiết ngay trên trang đang xem (ngăn xếp chi tiết); chữ Hán, ngữ pháp mở trang riêng.
    if (doc.kind === 'word') stack.push({ t: 'w', id: doc.id })
    else navigate(doc.href)
  }

  /** Chữ chọn từ bảng vẽ: nối vào cuối ô tìm (vẽ 日 rồi 本 → 日本). */
  const pickDrawn = (ch: string) => {
    setQuery((q) => q + ch)
    setActive(0)
  }
  // "Nhờ AI đoán": chỉ khi đã có key và model nhận ảnh. Ảnh chuyển qua sessionStorage, không qua URL.
  const ai = useAiSettings()
  const canAskAi = ai.hasKey && modelSupportsImages(ai.provider, aiSettings.model())
  const askAiDrawn = (png: string) => {
    if (!png) return
    const request: DockRequest = { mode: 'lookup', text: 'Đây là chữ Hán tôi vẽ tay. Đó là chữ gì?', image: { mime: 'image/png', data: png } }
    onClose()
    // Trang /ai không có khung nổi: chuyển ảnh qua sessionStorage như trước. Trang khác: mở khung chat nổi.
    if (pathname.startsWith('/ai')) {
      setHandoff(request)
      navigate('/ai')
    } else aiDock.ask(request)
  }
  const viewDrawn = (ch: string) => {
    onClose()
    navigate(`/kanji?k=${encodeURIComponent(ch)}`)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      // Esc đóng bảng vẽ trước, lần nữa mới đóng hộp tìm.
      if (drawing) setDrawing(false)
      else onClose()
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
  const pending = loaded < total

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
        className={`relative flex h-dvh w-full max-w-2xl flex-col overflow-hidden bg-paper pt-[env(safe-area-inset-top)] shadow-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-line ${drawing ? 'sm:min-h-[39rem]' : ''}`}
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
          <button
            type="button"
            onClick={() => setDrawing((d) => !d)}
            aria-label="Vẽ chữ để tìm"
            aria-pressed={drawing}
            title="Vẽ chữ để tìm"
            data-draw-toggle
            className={`grid size-10 shrink-0 place-items-center rounded-lg ${drawing ? 'bg-ai-soft text-ai' : 'text-muted hover:bg-sunken hover:text-ink'}`}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
              <path d="m13.5 6.5 4 4" />
            </svg>
          </button>
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg px-3 text-sm text-muted hover:bg-sunken hover:text-ink">
            Đóng
          </button>
        </div>

        {drawing && (
          // Điện thoại: sheet neo đáy hộp tìm (kết quả vẫn thấy phía trên); desktop: popover dưới ô nhập.
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 bottom-0 z-10 max-h-[75%] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.12)] sm:inset-x-auto sm:top-[3.75rem] sm:right-3 sm:bottom-auto sm:max-h-none sm:w-[22rem] sm:rounded-2xl sm:border sm:pb-4 sm:shadow-xl"
          >
            <div aria-hidden className="mx-auto -mt-1.5 mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
            <Suspense fallback={<p className="py-10 text-center text-sm text-muted">Đang mở bảng vẽ…</p>}>
              <HandwritingPanel onPick={pickDrawn} onView={viewDrawn} onClose={() => setDrawing(false)} onAskAi={canAskAi ? askAiDrawn : undefined} />
            </Suspense>
          </motion.div>
        )}

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
              Ví dụ: 参加, さんか, sanka, tham gia, THAM.{pending && ` Đang tải dữ liệu (${loaded}/${total})…`}
            </p>
          ) : flat.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted">{pending ? `Đang tải dữ liệu (${loaded}/${total})…` : `Không tìm thấy "${deferred}". Thử bỏ dấu hoặc gõ ngắn hơn.`}</p>
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
              {pending && <p className="px-3 py-2 text-xs text-muted">Đang tải thêm dữ liệu ({loaded}/{total}), kết quả có thể thay đổi.</p>}
            </>
          )}
        </div>
        <p className="hidden border-t border-line px-4 py-2 text-xs text-muted sm:block">↑ ↓ để chọn, Enter để mở, Esc để đóng. Tối đa 50 kết quả.</p>
      </motion.div>
    </div>,
    document.body,
  )
}

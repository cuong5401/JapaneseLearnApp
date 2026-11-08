import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet'
import { PageHeader } from '../components/PageHeader'
import { AssistantBubble, SetupCard, UserBubble } from '../components/ai/ChatParts'
import { HistoryList } from '../components/ai/HistoryList'
import { useAiChat } from '../hooks/useAiChat'
import { useSearchDocs } from '../hooks/useSearchDocs'
import { takeHandoff } from '../lib/ai/handoff'
import { chats, titleFrom, useChats, type LocalHit } from '../lib/ai/history'
import { isChatMode, MODES, type ChatMode } from '../lib/ai/prompts'
import { providerInfo } from '../lib/ai/providers'
import { useAiSettings } from '../lib/ai/settings'
import type { AiImage } from '../lib/ai/types'
import { normalizeKana, search, type SearchDoc } from '../lib/search'
import { showToast } from '../lib/toast'

/** Tra từ: mục khớp trong dữ liệu Kotonoha (khớp đúng chữ / cách đọc trước, tối đa 3 mục). */
function findLocalHits(docs: readonly SearchDoc[], q: string): LocalHit[] {
  const query = q.trim()
  if (!query || query.length > 20 || docs.length === 0) return []
  const r = search(docs, query, 20)
  const kana = normalizeKana(query)
  const exact = (d: SearchDoc) => d.title === query || (d.reading && normalizeKana(d.reading) === kana)
  const words = [...r.word.filter(exact), ...r.word.filter((d) => !exact(d))].slice(0, exact(r.word[0] ?? ({} as SearchDoc)) ? 3 : 2)
  const kanji = [...query].length === 1 ? r.kanji.filter((d) => d.title === query).slice(0, 1) : []
  return [...kanji, ...words].map((d) => ({ kind: d.kind === 'kanji' ? 'kanji' : 'word', id: d.id, title: d.title, reading: d.reading, meaning: d.subtitle }))
}

export function AskAi() {
  const settings = useAiSettings()
  const list = useChats()
  const [params, setParams] = useSearchParams()
  const activeId = params.get('c')
  const active = list.find((c) => c.id === activeId) ?? null
  const [mode, setMode] = useState<ChatMode>(active?.mode ?? (isChatMode(params.get('mode')) ? (params.get('mode') as ChatMode) : 'lookup'))
  const [draft, setDraft] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const chat = useAiChat()
  const { docs } = useSearchDocs()
  const endRef = useRef<HTMLDivElement>(null)
  const ready = settings.hasKey
  const modeInfo = MODES.find((m) => m.id === mode)!

  const open = (id: string | null) => {
    setHistoryOpen(false)
    const c = list.find((x) => x.id === id)
    if (c) setMode(c.mode)
    setParams(id ? { c: id } : {}, { replace: false })
  }

  /** Gửi: tạo cuộc mới nếu chưa có hoặc đã đổi chế độ. */
  const send = (text: string, opts: { mode?: ChatMode; image?: AiImage } = {}) => {
    const m = opts.mode ?? mode
    const q = text.trim()
    if (!q || chat.busy || !settings.hasKey) return
    let id = active && active.mode === m ? active.id : null
    if (!id) {
      id = chats.create(m, titleFrom(q))
      if (!id) {
        showToast('Đã đủ 10 cuộc trò chuyện đều được ghim. Bỏ ghim một cuộc để tạo cuộc mới.')
        return
      }
      setParams({ c: id }, { replace: Boolean(params.get('q')) })
    }
    setDraft('')
    void chat.ask(id, { text: q, mode: m, image: opts.image, hits: m === 'lookup' && !opts.image ? findLocalHits(docs, q) : undefined })
  }

  // Mở từ chỗ khác: /ai?mode=…&q=… hoặc ảnh khung vẽ (sessionStorage) → tự gửi một lần.
  // Hoãn một nhịp để StrictMode (chạy effect hai lần ở dev) không gửi trùng hay hủy yêu cầu.
  // Chạy theo từng lần điều hướng (location.key) để "Nhờ AI đoán" khi đang ở sẵn /ai vẫn được nhận.
  const location = useLocation()
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (handled.current === location.key) return
    const t = setTimeout(() => {
      if (handled.current === location.key) return
      handled.current = location.key
      const h = takeHandoff()
      const q = params.get('q')
      const m = isChatMode(params.get('mode')) ? (params.get('mode') as ChatMode) : mode
      if (h && settings.hasKey) {
        setMode(h.mode)
        send(h.text, { mode: h.mode, image: h.image })
      } else if (q && settings.hasKey) {
        setMode(m)
        send(q, { mode: m })
      } else if (q) {
        setDraft(q)
        setMode(m)
      }
    }, 0)
    return () => clearTimeout(t)
    // Chỉ chạy khi vào trang hoặc điều hướng tới /ai lần nữa.
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cuộn theo câu trả lời khi người dùng đang ở cuối trang.
  const liveText = chat.live?.text
  const count = active?.messages.length ?? 0
  useEffect(() => {
    const el = endRef.current
    if (!el) return
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240
    if (nearBottom || liveText === '') el.scrollIntoView({ block: 'end' })
  }, [liveText, count])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(draft)
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(draft)
    }
  }

  const streamingHere = chat.live && chat.live.convId === active?.id
  const lastIndex = (active?.messages.length ?? 0) - 1
  const providerName = settings.provider === 'mock' ? 'Mock (test)' : (providerInfo(settings.provider)?.name ?? '')
  const history = useMemo(() => <HistoryList list={list} activeId={active?.id ?? null} onOpen={open} onNew={() => open(null)} />, [list, active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden lg:block" aria-label="Lịch sử trò chuyện">
        <div className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pr-1">
          <h2 className="mb-3 px-2 text-sm font-semibold text-muted">Lịch sử</h2>
          {history}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <PageHeader title="Hỏi AI">
          <button type="button" onClick={() => setHistoryOpen(true)} className="min-h-11 rounded-lg border border-line px-3 text-sm font-medium hover:bg-sunken lg:hidden">
            Lịch sử ({list.length})
          </button>
        </PageHeader>

        <div role="group" aria-label="Chế độ" className="-mt-2 mb-4 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              data-mode={m.id}
              onClick={() => setMode(m.id)}
              className={`min-h-10 rounded-full border px-3.5 text-sm font-medium ${mode === m.id ? 'border-ai bg-ai text-on-ai' : 'border-line bg-surface hover:border-ai'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {!ready ? (
          <SetupCard />
        ) : (
          <>
            <div className="space-y-4" aria-live="polite">
              {!active || active.messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
                  <p className="font-medium text-ink">{modeInfo.label}</p>
                  <p className="mt-1 text-sm">{modeInfo.placeholder}</p>
                  <p className="mt-3 text-xs">
                    Đang dùng {providerName} · trình độ {settings.level}. Đổi trong Cài đặt.
                  </p>
                </div>
              ) : (
                active.messages.map((m, i) =>
                  m.role === 'user' ? (
                    <UserBubble key={i} m={m} />
                  ) : (
                    <AssistantBubble key={i} text={m.text} error={m.error} onRetry={i === lastIndex && m.error && !chat.busy ? () => void chat.retry(active.id, active.mode) : undefined} />
                  ),
                )
              )}
              {streamingHere && <AssistantBubble text={chat.live!.text} streaming />}
            </div>
            <div ref={endRef} className="h-2" />

            <form
              onSubmit={onSubmit}
              className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-4 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg md:bottom-4"
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">Câu hỏi</span>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  rows={Math.min(5, Math.max(1, draft.split('\n').length))}
                  placeholder={modeInfo.placeholder}
                  data-ai-input
                  className="block max-h-40 w-full resize-none bg-transparent px-2 py-2 outline-none placeholder:text-muted"
                />
              </label>
              {chat.busy ? (
                <button type="button" onClick={chat.stop} className="min-h-11 shrink-0 rounded-xl border-2 border-beni px-4 font-semibold text-beni hover:bg-beni-soft">
                  Dừng
                </button>
              ) : (
                <button type="submit" disabled={!draft.trim()} className="min-h-11 shrink-0 rounded-xl bg-ai px-4 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40">
                  Gửi
                </button>
              )}
            </form>
          </>
        )}
      </div>

      <BottomSheet open={historyOpen} onClose={() => setHistoryOpen(false)} label="Lịch sử trò chuyện">
        {history}
      </BottomSheet>
    </div>
  )
}

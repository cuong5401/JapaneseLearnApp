import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet'
import { PageHeader } from '../components/PageHeader'
import { ChatThread, Composer, ModeChips, SetupCard } from '../components/ai/ChatParts'
import { HistoryList } from '../components/ai/HistoryList'
import { useAiChat } from '../hooks/useAiChat'
import { useChatSend } from '../hooks/useChatSend'
import { aiDock } from '../lib/ai/dock'
import { takeHandoff } from '../lib/ai/handoff'
import { useChats } from '../lib/ai/history'
import { isChatMode, MODES, type ChatMode } from '../lib/ai/prompts'
import { providerInfo } from '../lib/ai/providers'
import { useAiSettings } from '../lib/ai/settings'
import type { AiImage } from '../lib/ai/types'

/** Trang "Hỏi AI" toàn màn hình (khung chat nổi mở rộng ra đây). */
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
  const endRef = useRef<HTMLDivElement>(null)
  const ready = settings.hasKey
  const modeInfo = MODES.find((m) => m.id === mode)!
  const sendTo = useChatSend(active, (id) => setParams({ c: id }, { replace: Boolean(params.get('q')) }))

  // Đang ở trang đầy đủ: khung chat nổi tiếp tục cuộc đang xem ở đây khi rời trang.
  useEffect(() => {
    if (active) aiDock.setConv(active.id)
    aiDock.clearUnread()
  }, [active, chat.live])

  const open = (id: string | null) => {
    setHistoryOpen(false)
    const c = list.find((x) => x.id === id)
    if (c) setMode(c.mode)
    setParams(id ? { c: id } : {}, { replace: false })
  }

  const send = (text: string, opts: { mode?: ChatMode; image?: AiImage } = {}) => {
    if (sendTo(text, { mode: opts.mode ?? mode, image: opts.image })) setDraft('')
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

        <div className="-mt-2 mb-4">
          <ModeChips mode={mode} onChange={setMode} />
        </div>

        {!ready ? (
          <SetupCard />
        ) : (
          <>
            <ChatThread
              active={active}
              mode={mode}
              live={chat.live}
              busy={chat.busy}
              onRetry={(c) => void chat.retry(c.id, c.mode)}
              footnote={`Đang dùng ${providerName} · trình độ ${settings.level}. Đổi trong Cài đặt.`}
            />
            <div ref={endRef} className="h-2" />

            <Composer
              draft={draft}
              setDraft={setDraft}
              onSend={() => send(draft)}
              busy={chat.busy}
              onStop={chat.stop}
              placeholder={modeInfo.placeholder}
              className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-4 rounded-2xl border border-line bg-surface p-2 shadow-lg md:bottom-4"
            />
          </>
        )}
      </div>

      <BottomSheet open={historyOpen} onClose={() => setHistoryOpen(false)} label="Lịch sử trò chuyện">
        {history}
      </BottomSheet>
    </div>
  )
}

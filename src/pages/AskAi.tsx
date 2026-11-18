import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet'
import { PageHeader } from '../components/PageHeader'
import { ChatThread, Composer, ConversationTitle, PlusIcon, SetupCard } from '../components/ai/ChatParts'
import { HistoryList } from '../components/ai/HistoryList'
import { useAiChat } from '../hooks/useAiChat'
import { useChatSend } from '../hooks/useChatSend'
import { aiDock } from '../lib/ai/dock'
import { takeHandoff } from '../lib/ai/handoff'
import { useChats } from '../lib/ai/history'
import { DEFAULT_MODE, isChatMode, modeInfo, type ChatMode } from '../lib/ai/prompts'
import { providerInfo } from '../lib/ai/providers'
import { useAiSettings } from '../lib/ai/settings'
import type { AiImage } from '../lib/ai/types'
import { t as tr } from '../i18n'

/** Trang "Hỏi AI" toàn màn hình (khung chat nổi mở rộng ra đây). */
export function AskAi() {
  const settings = useAiSettings()
  const list = useChats()
  const [params, setParams] = useSearchParams()
  const activeId = params.get('c')
  const active = list.find((c) => c.id === activeId) ?? null
  // Chế độ cho cuộc MỚI (màn chọn chế độ); cuộc đang mở dùng chế độ của nó.
  const [picked, setMode] = useState<ChatMode>(isChatMode(params.get('mode')) ? (params.get('mode') as ChatMode) : DEFAULT_MODE)
  const mode = active?.mode ?? picked
  const [draft, setDraft] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const chat = useAiChat()
  const endRef = useRef<HTMLDivElement>(null)
  const ready = settings.hasKey
  const sendTo = useChatSend(active, (id) => setParams({ c: id }, { replace: Boolean(params.get('q')) }))

  // Đang ở trang đầy đủ: khung chat nổi tiếp tục cuộc đang xem ở đây khi rời trang.
  useEffect(() => {
    if (active) aiDock.setConv(active.id)
    aiDock.clearUnread()
  }, [active, chat.live])

  const open = (id: string | null) => {
    setHistoryOpen(false)
    if (!id) setMode(DEFAULT_MODE)
    setParams(id ? { c: id } : {}, { replace: false })
  }

  const send = (text: string, opts: { mode?: ChatMode; image?: AiImage; fresh?: boolean } = {}) => {
    if (sendTo(text, { mode: opts.mode ?? mode, image: opts.image, fresh: opts.fresh })) setDraft('')
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
        send(h.text, { mode: h.mode, image: h.image, fresh: true })
      } else if (q && settings.hasKey) {
        setMode(m)
        send(q, { mode: m, fresh: true })
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
      <aside className="hidden lg:block" aria-label={tr('askAi.lichSuTroChuyen')}>
        <div className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pr-1">
          <h2 className="mb-3 px-2 text-sm font-semibold text-muted">{tr('askAi.lichSu2')}</h2>
          {history}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <PageHeader title={tr('common.hoiAi')}>
          <button
            type="button"
            onClick={() => open(null)}
            data-ai-new
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium hover:border-ai hover:text-ai"
          >
            <PlusIcon />
            {tr('chatParts.newChat')}
          </button>
          <button type="button" onClick={() => setHistoryOpen(true)} className="min-h-11 rounded-lg border border-line px-3 text-sm font-medium hover:bg-sunken lg:hidden">{tr('askAi.lichSu', { length: list.length })}</button>
        </PageHeader>

        <ConversationTitle active={active} className="-mt-2 mb-4 h-6" />

        {!ready ? (
          <SetupCard />
        ) : (
          <>
            <ChatThread
              active={active}
              mode={mode}
              onPickMode={setMode}
              live={chat.live}
              busy={chat.busy}
              onRetry={(c) => void chat.retry(c.id, c.mode)}
              footnote={tr('askAi.dangDungTrinhDo', { providerName, level: settings.level })}
            />
            <div ref={endRef} className="h-2" />

            <Composer
              draft={draft}
              setDraft={setDraft}
              onSend={() => send(draft)}
              busy={chat.busy}
              onStop={chat.stop}
              placeholder={modeInfo(mode).placeholder}
              className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-4 rounded-2xl border border-line bg-surface p-2 shadow-lg md:bottom-4"
            />
          </>
        )}
      </div>

      <BottomSheet open={historyOpen} onClose={() => setHistoryOpen(false)} label={tr('askAi.lichSuTroChuyen')}>
        {history}
      </BottomSheet>
    </div>
  )
}

import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useAiChat } from '../../hooks/useAiChat'
import { useAiPageContext } from '../../hooks/useAiPageContext'
import { useChatSend } from '../../hooks/useChatSend'
import { aiDock, dockMemory, useAiDock } from '../../lib/ai/dock'
import { useChats } from '../../lib/ai/history'
import { MODES } from '../../lib/ai/prompts'
import { useAiSettings } from '../../lib/ai/settings'
import { lockedScrollY } from '../../lib/scrollLock'
import { ChatThread, Composer, ModeChips } from './ChatParts'

interface Props {
  onCollapse: () => void
  onExpand: (convId: string | null) => void
  /** Rời khung để sang trang khác (Cài đặt): thu gọn mà không lùi lịch sử */
  onLeave: () => void
  inputRef: RefObject<HTMLTextAreaElement | null>
  /** Cử chỉ vuốt sang phải để thu gọn (điện thoại): chỉ gắn vào header */
  headerProps?: HTMLAttributes<HTMLDivElement>
  /** Bàn phím ảo đang mở: cuộn xuống tin mới nhất */
  keyboard?: boolean
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </svg>
  )
}

/**
 * Nội dung khung chat nổi: dùng chung phiên chat, lịch sử và chế độ với trang /ai.
 * Chữ đang gõ dở và vị trí cuộn giữ trong `dockMemory` nên còn nguyên khi thu gọn / mở lại.
 */
export default function DockChat({ onCollapse, onExpand, onLeave, inputRef, headerProps, keyboard = false }: Props) {
  const dock = useAiDock()
  const settings = useAiSettings()
  const list = useChats()
  const chat = useAiChat()
  const context = useAiPageContext()
  const active = list.find((c) => c.id === dock.convId) ?? null
  const mode = dock.mode
  const [draft, setDraftState] = useState(() => dockMemory.draft)
  const setDraft = (s: string) => {
    dockMemory.draft = s
    setDraftState(s)
  }
  const scrollRef = useRef<HTMLDivElement>(null)
  const send = useChatSend(active, (id) => aiDock.setConv(id))
  const placeholder = MODES.find((m) => m.id === mode)!.placeholder

  // Câu hỏi gửi từ nút "Hỏi AI" / bảng vẽ: tự gửi nếu đã có key, chưa có thì điền sẵn.
  // Hoãn một nhịp (như trang /ai) để StrictMode chạy effect hai lần không gửi trùng.
  useEffect(() => {
    if (!dock.request) return
    const t = setTimeout(() => {
      const r = aiDock.takeRequest()
      if (r && !send(r.text, { mode: r.mode, image: r.image })) setDraft(r.text)
    }, 0)
    return () => clearTimeout(t)
  }, [dock.request]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gắn lại khung (vd. rời trang /ai): về đúng vị trí cuộn cũ.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && dockMemory.scrollTop >= 0) el.scrollTop = dockMemory.scrollTop
  }, [settings.hasKey])

  // Cuộn theo câu trả lời khi đang ở gần cuối khung; bàn phím mở thì về tin mới nhất.
  const liveText = chat.live?.text
  const count = active?.messages.length ?? 0
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (keyboard || el.scrollHeight - el.scrollTop - el.clientHeight < 160 || liveText === '') el.scrollTop = el.scrollHeight
  }, [liveText, count, active?.id, keyboard])

  const onSend = () => {
    if (send(draft, { mode })) setDraft('')
  }

  // iOS có thể vẫn cuộn cửa sổ khi focus ô nhập dù trang đang bị khóa (body fixed): đặt lại về 0.
  const onInputFocus = () => {
    requestAnimationFrame(() => {
      if (lockedScrollY() !== null && window.scrollY !== 0) window.scrollTo(0, 0)
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div {...headerProps} data-dock-header style={{ touchAction: 'none' }} className="shrink-0 border-b border-line px-3 pt-2 pb-2 select-none">
        <div className="flex items-center gap-1">
          <h2 id="ai-dock-title" className="flex items-center gap-2 font-bold">
            <span lang="ja" aria-hidden className="grid size-7 place-items-center rounded-[3px] bg-ai font-jp text-sm text-on-ai">
              問
            </span>
            Hỏi AI
          </h2>
          <button
            type="button"
            onClick={() => onExpand(active?.id ?? null)}
            aria-label="Mở rộng toàn màn hình"
            title="Mở rộng toàn màn hình"
            data-dock-expand
            className="ml-auto grid size-10 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
          >
            <ExpandIcon />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Thu gọn"
            title="Thu gọn (Esc)"
            data-dock-collapse
            className="grid size-10 place-items-center rounded-lg text-2xl leading-none text-muted hover:bg-sunken hover:text-ink"
          >
            <span aria-hidden>›</span>
          </button>
        </div>
        <div className="mt-1.5">
          <ModeChips mode={mode} onChange={aiDock.setMode} compact />
        </div>
      </div>

      {!settings.hasKey ? (
        <div data-ai-setup className="flex-1 overflow-y-auto overscroll-contain p-4">
          <p className="font-semibold">Chưa có API key</p>
          <p className="mt-1 text-sm text-muted">
            Kotonoha gọi thẳng AI (Gemini có hạn mức miễn phí, hoặc Claude) bằng key của bạn. Key chỉ lưu trên máy này. Mở Cài đặt → mục AI để dán key.
          </p>
          <Link to="/settings#ai" onClick={onLeave} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">
            Mở Cài đặt
          </Link>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            data-dock-scroll
            onScroll={(e) => {
              dockMemory.scrollTop = e.currentTarget.scrollTop
            }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
          >
            <ChatThread active={active} mode={mode} live={chat.live} busy={chat.busy} onRetry={(c) => void chat.retry(c.id, c.mode)} />
          </div>
          <div data-dock-composer style={{ touchAction: 'none' }} className="shrink-0 border-t border-line">
            <Composer
              inputRef={inputRef}
              draft={draft}
              setDraft={setDraft}
              onSend={onSend}
              busy={chat.busy}
              onStop={chat.stop}
              placeholder={placeholder}
              maxRows={4}
              onFocus={onInputFocus}
              inputClassName="touch-pan-y"
              className="p-2"
              before={
                context && (
                  <button
                    type="button"
                    data-ai-context
                    onClick={() => {
                      aiDock.setMode(context.mode)
                      setDraft(context.text)
                      inputRef.current?.focus({ preventScroll: true })
                    }}
                    className="mb-1.5 inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-ai/40 bg-ai-soft px-3 text-sm font-medium text-ai hover:border-ai"
                  >
                    <span className="shrink-0">Hỏi về</span>
                    <span lang="ja" className="truncate font-jp">
                      {context.label}
                    </span>
                  </button>
                )
              }
            />
          </div>
        </>
      )}
    </div>
  )
}

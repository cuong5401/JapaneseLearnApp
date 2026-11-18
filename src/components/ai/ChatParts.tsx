import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useDetailStack } from '../../hooks/useDetailStack'
import type { Conversation, LocalHit, StoredMessage } from '../../lib/ai/history'
import { extractWords } from '../../lib/ai/parse'
import { MODES, modeInfo, type ChatMode } from '../../lib/ai/prompts'
import { PROVIDERS } from '../../lib/ai/providers'
import type { LiveAnswer } from '../../lib/ai/session'
import { AiWordCard } from './AiWordCard'
import { AiMarkdown } from './Markdown'
import { t } from '../../i18n'

/** Mục tìm thấy trong dữ liệu Kotonoha (Tra từ): hiện ngay, bấm mở chi tiết trong ngăn xếp. */
export function LocalHits({ hits }: { hits: LocalHit[] }) {
  const stack = useDetailStack()
  return (
    <div className="mt-2 rounded-xl border border-matsu/40 bg-matsu-soft/40 p-3" data-local-hits>
      <p className="mb-1.5 text-xs font-semibold text-matsu">{t('chatParts.coTrongDuLieu')}</p>
      <ul className="space-y-1">
        {hits.map((h) => (
          <li key={h.kind + h.id}>
            <button
              type="button"
              onClick={() => stack.open(h.kind === 'kanji' ? { t: 'k', ch: h.title } : { t: 'w', id: h.id })}
              className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface"
            >
              <span lang="ja" className="shrink-0 font-jp text-lg font-semibold">
                {h.title}
              </span>
              {h.reading && (
                <span lang={h.kind === 'kanji' ? undefined : 'ja'} className={`text-sm ${h.kind === 'kanji' ? 'font-semibold text-ai' : 'font-jp text-muted'}`}>
                  {h.reading}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{h.meaning}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function UserBubble({ m }: { m: StoredMessage }) {
  return (
    <div className="flex flex-col items-end" data-msg="user">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ai px-4 py-2.5 whitespace-pre-wrap text-on-ai">
        {m.hadImage && <span className="mb-1 block text-xs opacity-80">{t('chatParts.anhKhungVe')}</span>}
        {m.text}
      </div>
      {m.hits && m.hits.length > 0 && (
        <div className="w-full">
          <LocalHits hits={m.hits} />
        </div>
      )}
    </div>
  )
}

/** Câu trả lời của AI: Markdown + thẻ từ; `streaming` = đang hiện dần. */
export function AssistantBubble({ text, error, streaming, onRetry }: { text: string; error?: string; streaming?: boolean; onRetry?: () => void }) {
  const { body, words } = extractWords(text)
  return (
    <div data-msg="assistant" data-streaming={streaming ? 'true' : undefined} className="@container min-w-0">
      <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
        {body ? <AiMarkdown text={body} /> : streaming ? <span className="inline-block animate-pulse text-muted">{t('chatParts.dangTraLoi')}</span> : null}
        {streaming && body && <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ai align-middle" />}
        {error && (
          <p role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-beni">
            {error}
            {onRetry && (
              <button type="button" onClick={onRetry} className="min-h-11 rounded-lg border border-beni px-3 text-sm hover:bg-beni-soft">{t('common.thuLai')}</button>
            )}
          </p>
        )}
      </div>
      {!streaming && words.length > 0 && (
        <ul aria-label={t('chatParts.tuVungTrongCau')} className="mt-2 grid gap-2 @md:grid-cols-2">
          {words.map((w) => (
            <AiWordCard key={w.word} w={w} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Chưa có API key: hướng dẫn thiết lập thay vì báo lỗi. */
export function SetupCard() {
  return (
    <section data-ai-setup className="rounded-2xl border border-ai bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-bold">{t('chatParts.thietLapHoiAi')}</h2>
      <p className="mt-1 text-sm text-muted">{t('chatParts.kotonohaLaTrangTinh')}</p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
        <li>{t('chatParts.layApiKey')}{' '}
          {PROVIDERS.map((p, i) => (
            <span key={p.id}>
              {i > 0 && t('chatParts.hoac')}
              <a href={p.keyUrl} target="_blank" rel="noreferrer noopener" className="font-medium text-ai underline">
                {p.name}
              </a>
            </span>
          ))}{t('chatParts.geminiCoHanMuc')}</li>
        <li>{t('chatParts.moCaiDatMuc')}</li>
        <li>{t('chatParts.bamKiemTraKet')}</li>
      </ol>
      <Link to="/settings#ai" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">{t('chatParts.moCaiDatAi')}</Link>
    </section>
  )
}

/** Nhãn nhỏ chế độ của cuộc trò chuyện (cạnh tên cuộc, trong lịch sử). */
export function ModeBadge({ mode, className = '' }: { mode: ChatMode; className?: string }) {
  return (
    <span data-mode-badge={mode} className={`inline-flex shrink-0 items-center rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-semibold text-ai ${className}`}>
      {modeInfo(mode).label}
    </span>
  )
}

/**
 * Màn trống của cuộc trò chuyện mới: 5 thẻ chọn chế độ (Hỗn hợp chọn sẵn). Có thể gõ câu hỏi luôn ở ô bên dưới
 * (dùng chế độ đang chọn). Chế độ cố định theo cuộc trò chuyện sau khi gửi câu đầu.
 */
export function ModePicker({ mode, onChange, compact = false }: { mode: ChatMode; onChange: (m: ChatMode) => void; compact?: boolean }) {
  return (
    <div data-mode-picker>
      <p id="mode-picker-title" className="font-semibold">
        {t('chatParts.chooseMode')}
      </p>
      <p className="mt-0.5 text-sm text-muted">{t('chatParts.chooseModeHint')}</p>
      <div role="radiogroup" aria-labelledby="mode-picker-title" className={`mt-3 grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {MODES.map((m) => {
          const on = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-mode={m.id}
              onClick={() => onChange(m.id)}
              className={`flex min-h-14 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors ${
                on ? 'border-ai bg-ai-soft' : 'border-line bg-surface hover:border-ai/60'
              }`}
            >
              <span lang="ja" aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-[3px] border font-jp text-base ${on ? 'border-ai bg-ai text-on-ai' : 'border-cell-line text-ai'}`}>
                {m.glyph}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${on ? 'text-ai' : ''}`}>{m.label}</span>
                <span className="block truncate text-xs text-muted">{m.desc}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Tin nhắn của một cuộc + câu trả lời đang hiện dần; cuộc mới (chưa có tin) thì hiện thẻ chọn chế độ. */
export function ChatThread({ active, mode, onPickMode, live, busy, onRetry, footnote, compact = false }: {
  active: Conversation | null
  /** Chế độ đang chọn cho cuộc mới */
  mode: ChatMode
  onPickMode: (m: ChatMode) => void
  live: LiveAnswer
  busy: boolean
  onRetry: (c: Conversation) => void
  footnote?: ReactNode
  compact?: boolean
}) {
  const lastIndex = (active?.messages.length ?? 0) - 1
  const streamingHere = live && live.convId === active?.id
  return (
    <div className="space-y-4" aria-live="polite">
      {!active || active.messages.length === 0 ? (
        <>
          <ModePicker mode={active?.mode ?? mode} onChange={onPickMode} compact={compact} />
          {footnote && <p className="text-xs text-muted">{footnote}</p>}
        </>
      ) : (
        active.messages.map((m, i) =>
          m.role === 'user' ? (
            <UserBubble key={i} m={m} />
          ) : (
            <AssistantBubble key={i} text={m.text} error={m.error} onRetry={i === lastIndex && m.error && !busy ? () => onRetry(active) : undefined} />
          ),
        )
      )}
      {streamingHere && <AssistantBubble text={live.text} streaming />}
    </div>
  )
}

/** Tên cuộc trò chuyện đang xem + nhãn chế độ (cố định theo cuộc). */
export function ConversationTitle({ active, className = '' }: { active: Conversation | null; className?: string }) {
  if (!active) return null
  return (
    <p className={`flex min-w-0 items-center gap-2 ${className}`} data-conversation-title>
      <span className="truncate text-sm font-medium">{active.title}</span>
      <ModeBadge mode={active.mode} />
    </p>
  )
}

/** Icon "+" của nút Cuộc trò chuyện mới. */
export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/**
 * Ô soạn câu hỏi: Enter gửi, Shift+Enter xuống dòng; đang trả lời thì hiện nút Dừng.
 * Textarea tự giãn theo nội dung, tối đa `maxRows` dòng (quá thì cuộn trong ô); chữ 16px để iOS không phóng to.
 */
export function Composer({ draft, setDraft, onSend, busy, onStop, placeholder, className = '', inputRef, before, maxRows = 5, onFocus, inputClassName = '' }: {
  draft: string
  setDraft: (s: string) => void
  onSend: () => void
  busy: boolean
  onStop: () => void
  placeholder: string
  className?: string
  inputRef?: RefObject<HTMLTextAreaElement | null>
  before?: ReactNode
  maxRows?: number
  onFocus?: () => void
  inputClassName?: string
}) {
  const ownRef = useRef<HTMLTextAreaElement>(null)
  const ref = inputRef ?? ownRef
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const cs = getComputedStyle(el)
    const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
    const max = Math.round(line * maxRows + pad)
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
  }, [draft, maxRows, ref])
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSend()
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      onSend()
    }
  }
  return (
    <form onSubmit={onSubmit} className={className}>
      {before}
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t('chatParts.cauHoi')}</span>
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onFocus={onFocus}
            rows={1}
            enterKeyHint="send"
            placeholder={placeholder}
            data-ai-input
            className={`block w-full resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted ${inputClassName}`}
          />
        </label>
        {busy ? (
          <button type="button" onClick={onStop} className="min-h-11 shrink-0 rounded-xl border-2 border-beni px-4 font-semibold text-beni hover:bg-beni-soft">{t('chatParts.dung')}</button>
        ) : (
          <button type="submit" disabled={!draft.trim()} className="min-h-11 shrink-0 rounded-xl bg-ai px-4 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40">{t('chatParts.gui')}</button>
        )}
      </div>
    </form>
  )
}

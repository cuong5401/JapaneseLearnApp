import { Link } from 'react-router-dom'
import { useDetailStack } from '../../hooks/useDetailStack'
import type { LocalHit, StoredMessage } from '../../lib/ai/history'
import { extractWords } from '../../lib/ai/parse'
import { PROVIDERS } from '../../lib/ai/providers'
import { AiWordCard } from './AiWordCard'
import { AiMarkdown } from './Markdown'

/** Mục tìm thấy trong dữ liệu Kotonoha (Tra từ): hiện ngay, bấm mở chi tiết trong ngăn xếp. */
export function LocalHits({ hits }: { hits: LocalHit[] }) {
  const stack = useDetailStack()
  return (
    <div className="mt-2 rounded-xl border border-matsu/40 bg-matsu-soft/40 p-3" data-local-hits>
      <p className="mb-1.5 text-xs font-semibold text-matsu">Có trong dữ liệu Kotonoha</p>
      <ul className="space-y-1">
        {hits.map((h) => (
          <li key={h.kind + h.id}>
            <button
              type="button"
              onClick={() => stack.push(h.kind === 'kanji' ? { t: 'k', ch: h.title } : { t: 'w', id: h.id })}
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
        {m.hadImage && <span className="mb-1 block text-xs opacity-80">[Ảnh khung vẽ]</span>}
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
    <div data-msg="assistant" data-streaming={streaming ? 'true' : undefined} className="min-w-0">
      <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
        {body ? <AiMarkdown text={body} /> : streaming ? <span className="inline-block animate-pulse text-muted">Đang trả lời…</span> : null}
        {streaming && body && <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ai align-middle" />}
        {error && (
          <p role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-beni">
            {error}
            {onRetry && (
              <button type="button" onClick={onRetry} className="min-h-9 rounded-lg border border-beni px-3 text-sm hover:bg-beni-soft">
                Thử lại
              </button>
            )}
          </p>
        )}
      </div>
      {!streaming && words.length > 0 && (
        <ul aria-label="Từ vựng trong câu trả lời" className="mt-2 grid gap-2 sm:grid-cols-2">
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
      <h2 className="text-lg font-bold">Thiết lập Hỏi AI</h2>
      <p className="mt-1 text-sm text-muted">Kotonoha là trang tĩnh, không có máy chủ: trình duyệt gọi thẳng AI bằng API key của bạn. Key chỉ lưu trên máy này.</p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
        <li>
          Lấy API key:{' '}
          {PROVIDERS.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ' hoặc '}
              <a href={p.keyUrl} target="_blank" rel="noreferrer noopener" className="font-medium text-ai underline">
                {p.name}
              </a>
            </span>
          ))}
          . Gemini có hạn mức miễn phí.
        </li>
        <li>Mở Cài đặt → mục AI, chọn nhà cung cấp và dán key.</li>
        <li>Bấm "Kiểm tra kết nối", rồi quay lại đây để hỏi.</li>
      </ol>
      <Link to="/settings#ai" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">
        Mở Cài đặt AI
      </Link>
    </section>
  )
}

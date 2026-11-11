import { useState } from 'react'
import { useWordExamples } from '../../hooks/useWordExamples'
import { useAiSettings } from '../../lib/ai/settings'
import { audioUrl, highlight, sentenceUrl, type ExampleItem, type SearchTerms } from '../../lib/examples/tatoeba'
import { notebooks } from '../../lib/notebooks'
import { speak, speechSupported } from '../../lib/speech'
import { showToast } from '../../lib/toast'
import type { VocabItem } from '../../types'
import { Skeleton } from '../LoadState'

/** Chiều cao một câu (2 dòng chữ + dòng nút): skeleton và câu thật bằng nhau → không layout shift. */
const ROW = 'min-h-[7rem]'

function play(it: ExampleItem) {
  if (it.audioId) {
    const a = new Audio(audioUrl(it.audioId))
    a.play().catch(() => speak(it.ja))
  } else speak(it.ja)
}

function IconButton({ label, onClick, children, title }: { label: string; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-ai hover:bg-ai-soft"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  )
}

function Sentence({ it, terms, wordId, canTranslate, onTranslate }: { it: ExampleItem; terms: SearchTerms; wordId: string; canTranslate: boolean; onTranslate: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const save = () => {
    const book = notebooks.saveExample(wordId, { ja: it.ja, tr: it.vi ?? it.en ?? '', src: it.src, ...(it.tid ? { tid: it.tid } : {}) })
    showToast(`Đã lưu câu vào ${book.name}`)
  }
  const translate = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await onTranslate()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className={`flex items-start gap-2 py-2.5 ${ROW}`} data-example={it.key}>
      <div className="min-w-0 flex-1">
        <p lang="ja" className="font-jp text-lg leading-snug break-words">
          {highlight(it.ja, terms).map((seg, i) =>
            seg.hit ? (
              <mark key={i} className="bg-transparent font-bold text-beni">
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
        {it.vi ? (
          <p className="mt-0.5 text-sm text-muted" data-example-vi>
            {it.vi}
            {it.viByAi && <span className="ml-1.5 text-xs">(AI dịch)</span>}
          </p>
        ) : it.en ? (
          <p className="mt-0.5 text-sm text-muted" data-example-en>
            <span className="mr-1.5 rounded border border-line px-1 text-[10px] font-semibold tracking-wide">EN</span>
            {it.en}
            {canTranslate && (
              <button type="button" onClick={translate} disabled={busy} className="ml-2 font-medium text-ai hover:underline disabled:opacity-50">
                {busy ? 'Đang dịch…' : failed ? 'Dịch lại' : 'Dịch sang tiếng Việt'}
              </button>
            )}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">
          {it.src === 'ai' ? (
            <span className="rounded bg-kihada-soft px-1.5 py-0.5 font-semibold text-ink" data-example-ai>
              AI tạo
            </span>
          ) : (
            <a
              href={sentenceUrl(it.tid!)}
              target="_blank"
              rel="noreferrer noopener"
              title={`Tatoeba, CC BY 2.0 FR${it.owner ? `, ${it.owner}` : ''}${it.audioBy ? `; âm thanh: ${it.audioBy}` : ''}`}
              className="hover:text-ai hover:underline"
              data-example-source
            >
              Tatoeba
            </a>
          )}
        </p>
      </div>
      {(it.audioId || speechSupported) && (
        <IconButton label={`Nghe câu: ${it.ja}`} title={it.audioId ? 'Nghe (giọng thật, Tatoeba)' : 'Nghe'} onClick={() => play(it)}>
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        </IconButton>
      )}
      <IconButton label="Lưu câu vào sổ tay" onClick={save}>
        <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" />
      </IconButton>
    </li>
  )
}

/**
 * Khối "Ví dụ" dưới nghĩa của từ (trang chi tiết và panel / sheet): câu Tatoeba (hoặc AI tạo), tô đậm từ, dịch,
 * nghe, ghi nguồn, lưu vào sổ tay. Giữ chỗ 3 câu (skeleton cùng chiều cao) để dữ liệu về không làm nhảy bố cục.
 * Mất mạng mà chưa có cache: ẩn cả khối.
 */
export function WordExamples({ item }: { item: VocabItem }) {
  const { state, shown, terms, more, translate } = useWordExamples(item)
  const ai = useAiSettings()
  if (state.status === 'offline') return null
  const canMore = state.status === 'ready' && (state.entry.items.length > 3 || state.entry.next !== null)
  return (
    <section className="mt-5 border-t border-line pt-4" aria-labelledby={`ex-${item.id}`} data-examples data-examples-status={state.status}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h3 id={`ex-${item.id}`} className="font-semibold">
          Ví dụ
        </h3>
        {canMore && (
          <button type="button" onClick={() => void more()} disabled={state.status === 'ready' && state.more} className="min-h-9 rounded-lg px-2.5 text-sm font-medium text-ai hover:bg-ai-soft disabled:opacity-50">
            {state.status === 'ready' && state.more ? 'Đang tải…' : 'Ví dụ khác'}
          </button>
        )}
      </div>
      <ul className={`divide-y divide-line ${state.status === 'empty' ? '' : 'min-h-[calc(21rem+2px)]'}`} aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' &&
          [0, 1, 2].map((i) => (
            <li key={i} className={`py-2.5 ${ROW}`} aria-hidden>
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="mt-1.5 h-4 w-3/5" />
              <Skeleton className="mt-2 h-3 w-14" />
            </li>
          ))}
        {state.status === 'empty' && <li className="py-3 text-sm text-muted">Chưa tìm thấy ví dụ.</li>}
        {shown.map((it) => (
          <Sentence key={it.key} it={it} terms={terms} wordId={item.id} canTranslate={ai.hasKey} onTranslate={() => translate(it.key)} />
        ))}
      </ul>
    </section>
  )
}

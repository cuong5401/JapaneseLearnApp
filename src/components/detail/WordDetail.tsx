import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useEntries, useKanjiIndex } from '../../hooks/useData'
import { useCards, useNow } from '../../hooks/useProgress'
import { aiWords, isAiWordId } from '../../lib/aiWords'
import type { Frame } from '../../lib/detailStack'
import { webWords } from '../../lib/webWords'
import { progress } from '../../lib/progress'
import { speechText } from '../../lib/speech'
import { formatDelay, STATE } from '../../lib/srs'
import type { VocabItem } from '../../types'
import { GridCell } from '../GridCell'
import { LoadError, Skeleton, SkeletonRows } from '../LoadState'
import { Button } from '../Pressable'
import { SpeakButton } from '../SpeakButton'
import { HanViet, WordMeta } from '../VocabBits'
import { AskAiLink } from '../ai/AskAiLink'
import { WordExamples } from './WordExamples'
import { wordQuestion } from '../../lib/ai/questions'
import { BookmarkButton } from '../notebook/BookmarkButton'

type Push = (f: Frame) => void

/** Danh sách từ (từ liên quan, từ chính): bấm thì mở chi tiết trong ngăn xếp, không rời trang. */
export function WordLinks({ ids, title, onPush }: { ids: string[]; title: string; onPush: Push }) {
  const { status, entries, error, retry } = useEntries(ids)
  if (status === 'error') return <LoadError error={error} onRetry={retry} />
  const words = ids.flatMap((id) => {
    const e = entries.get(id)
    return e?.kind === 'word' ? [e.item] : []
  })
  return (
    <section className="mt-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      {status !== 'ready' ? (
        <SkeletonRows count={ids.length} rowClass="h-[3.25rem] px-4" className="rounded-xl border border-line bg-surface" />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {words.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onPush({ t: 'w', id: w.id })}
                className="flex min-h-[3.25rem] w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3 text-left hover:bg-sunken"
              >
                <span lang="ja" className="font-jp text-lg font-semibold">
                  {w.word}
                </span>
                {w.reading && w.reading !== w.word && (
                  <span lang="ja" className="font-jp text-sm text-muted">
                    {w.reading}
                  </span>
                )}
                <span className="w-full text-sm sm:ml-auto sm:w-auto">{w.meaning}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Các chữ Hán trong từ: bấm thì đẩy chữ đó vào ngăn xếp. */
export function KanjiBreakdown({ word, onPush }: { word: string; onPush: Push }) {
  const index = useKanjiIndex()
  const chars = useMemo(() => [...new Set([...word].filter((c) => /[㐀-鿿]/.test(c)))], [word])
  const found = useMemo(() => {
    if (!index.data) return []
    const byChar = new Map(index.data.map((k) => [k.kanji, k]))
    return chars.map((c) => byChar.get(c)).filter((k) => k !== undefined)
  }, [index.data, chars])
  if (!chars.length || (index.data && !found.length)) return null
  return (
    <section className="mt-6">
      <h3 className="mb-3 font-semibold">Chữ Hán trong từ</h3>
      <ul className="flex flex-wrap gap-3">
        {/* Chưa tải chỉ mục: giữ đúng số ô (số chữ Hán trong từ) cùng kích thước ô thật. */}
        {!index.data && chars.map((c) => <li key={c}><Skeleton className="h-[7.75rem] w-24" /></li>)}
        {found.map((k) => (
          <li key={k.id}>
            <button
              type="button"
              onClick={() => onPush({ t: 'k', ch: k.kanji })}
              aria-label={`Chữ ${k.kanji}, ${k.hanViet}`}
              className="flex w-24 flex-col items-center gap-1.5 rounded-xl border border-line bg-surface p-2.5 hover:border-ai"
            >
              <GridCell className="w-full">{k.kanji}</GridCell>
              <span className="text-xs font-semibold tracking-wide">{k.hanViet}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Nội dung chi tiết một từ, dùng trong panel/bottom sheet và trang /word/:id.
 * `inPanel`: hiện nút "Mở trang đầy đủ".
 */
export function WordDetail({ item, onPush, inPanel = false }: { item: VocabItem; onPush: Push; inPanel?: boolean }) {
  const card = useCards()[item.id]
  const now = useNow()
  const keepWebWord = () => {
    const w = isAiWordId(item.id) && !aiWords.get(item.id) ? webWords.get(item.id) : undefined
    if (w) aiWords.save({ word: w.word, reading: w.reading, meaning: w.meaning, hanViet: w.hanViet })
  }
  return (
    <div data-detail-word={item.id}>
      <article className={inPanel ? '' : 'rounded-2xl border border-line bg-surface p-6'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.reading && item.reading !== item.word && (
              <p lang="ja" className="font-jp text-lg text-muted">
                {item.reading}
              </p>
            )}
            <h2 lang="ja" className="font-jp text-[clamp(2.25rem,9vw,3.25rem)] leading-tight font-bold break-words">
              {item.word}
            </h2>
            <HanViet text={item.hanViet} className="mt-1 text-sm" />
          </div>
          <span className="flex shrink-0 items-center gap-1">
            {/* Từ tra online chỉ sống trong phiên: chép sang kho từ AI trước khi lưu vào sổ tay (pha capture). */}
            <span onPointerDownCapture={keepWebWord} onKeyDownCapture={keepWebWord} onContextMenuCapture={keepWebWord}>
              <BookmarkButton itemRef={item.id} label={item.word} />
            </span>
            <SpeakButton text={speechText(item)} />
          </span>
        </div>
        <p className="mt-5 text-2xl font-semibold">{item.meaning}</p>
        {!item.reading && <p className="mt-1 text-sm text-muted">Từ này chưa có cách đọc trong dữ liệu; nút nghe đọc theo chữ viết.</p>}
        {/* Câu ví dụ thật (Tatoeba) hoặc AI tạo, dưới nghĩa của từ. */}
        <WordExamples key={item.id} item={item} />
        <div className="mt-5">
          <WordMeta item={{ ...item, related: undefined, parent: undefined }} />
        </div>
        {item.example && (
          <div className="mt-5 border-t border-line pt-4">
            <p lang="ja" className="font-jp text-lg">
              {item.example.ja}
            </p>
            <p className="text-muted">{item.example.vi}</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <Button
            onClick={() => (card ? progress.forget(item.id) : progress.markLearned(item.id))}
            className={`min-h-11 rounded-lg px-5 font-semibold ${card ? 'border border-matsu bg-matsu-soft text-matsu' : 'bg-ai text-on-ai hover:opacity-90'}`}
          >
            {card ? 'Đã học, bỏ đánh dấu' : 'Đánh dấu đã học'}
          </Button>
          {card && (
            <span className="text-sm text-muted">
              {card.state === STATE.new ? 'Đang chờ ở trang Ôn tập' : card.due <= now ? 'Đến hạn ôn' : `Ôn lại sau ${formatDelay(card.due - now)}`}
            </span>
          )}
          <AskAiLink question={wordQuestion(item)} />
          {inPanel && (
            <Link to={`/word/${item.id}`} className="ml-auto inline-flex min-h-11 items-center text-sm font-medium text-ai hover:underline">
              Mở trang đầy đủ
            </Link>
          )}
        </div>
      </article>

      {item.parent && <WordLinks ids={[item.parent]} title="Từ chính" onPush={onPush} />}
      {item.related && item.related.length > 0 && <WordLinks ids={item.related} title="Từ liên quan" onPush={onPush} />}
      <KanjiBreakdown word={item.word} onPush={onPush} />
    </div>
  )
}

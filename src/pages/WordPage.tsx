import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GridCell } from '../components/GridCell'
import { LoadError, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Pressable'
import { SpeakButton } from '../components/SpeakButton'
import { HanViet, WordMeta } from '../components/VocabBits'
import { deckPath, deckTitle } from '../data'
import { useEntries, useKanjiIndex, useVocab } from '../hooks/useData'
import { useCards } from '../hooks/useProgress'
import { lessonIndexOf } from '../lib/lessons'
import { progress } from '../lib/progress'
import { useLessonSize } from '../lib/settings'
import { speechText } from '../lib/speech'
import { formatInterval } from '../lib/srs'
import type { Deck, VocabItem } from '../types'
import { NotFound } from './NotFound'

function RelatedList({ ids, title }: { ids: string[]; title: string }) {
  const { status, entries, error, retry } = useEntries(ids)
  if (status === 'error') return <LoadError error={error} onRetry={retry} />
  const words = ids.map((id) => entries.get(id)).filter((e) => e?.kind === 'word')
  return (
    <section className="mt-8">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {status !== 'ready' ? (
        <PageSkeleton rows={Math.min(ids.length, 3)} />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {words.map(
            (e) =>
              e?.kind === 'word' && (
                <li key={e.item.id}>
                  <Link to={`/word/${e.item.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3 hover:bg-sunken">
                    <span lang="ja" className="font-jp text-lg font-semibold">
                      {e.item.word}
                    </span>
                    {e.item.reading && e.item.reading !== e.item.word && (
                      <span lang="ja" className="font-jp text-sm text-muted">
                        {e.item.reading}
                      </span>
                    )}
                    <span className="w-full text-sm sm:ml-auto sm:w-auto">{e.item.meaning}</span>
                  </Link>
                </li>
              ),
          )}
        </ul>
      )}
    </section>
  )
}

/** Các chữ Hán trong từ, nối tới trang Kanji nếu chữ có trong chỉ mục. */
function KanjiBreakdown({ word }: { word: string }) {
  const index = useKanjiIndex()
  const chars = useMemo(() => [...new Set([...word].filter((c) => /[㐀-鿿]/.test(c)))], [word])
  const found = useMemo(() => {
    if (!index.data) return []
    const byChar = new Map(index.data.map((k) => [k.kanji, k]))
    return chars.map((c) => byChar.get(c)).filter((k) => k !== undefined)
  }, [index.data, chars])
  if (!chars.length || !found.length) return null
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-semibold">Chữ Hán trong từ</h2>
      <ul className="flex flex-wrap gap-3">
        {found.map((k) => (
          <li key={k.id}>
            <Link to={`/kanji?c=${encodeURIComponent(k.kanji)}`} className="flex w-24 flex-col items-center gap-1.5 rounded-xl border border-line bg-surface p-2.5 hover:border-ai">
              <GridCell className="w-full">{k.kanji}</GridCell>
              <span className="text-xs font-semibold tracking-wide">{k.hanViet}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function WordDetail({ item, deck, position }: { item: VocabItem; deck: Deck; position: number }) {
  const card = useCards()[item.id]
  const size = useLessonSize()
  const lesson = deck.kind === 'vocab' && position >= 0 ? lessonIndexOf(position, size) + 1 : null
  const back = deck.kind === 'vocab' && lesson ? { to: `${deckPath(deck)}/${lesson}`, label: `${deckTitle(deck)}, Bài ${lesson}` } : { to: deckPath(deck), label: deckTitle(deck) }

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader title="Chi tiết từ" back={back} />
      <article className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
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
          <SpeakButton text={speechText(item)} />
        </div>
        <p className="mt-5 text-2xl font-semibold">{item.meaning}</p>
        {!item.reading && <p className="mt-1 text-sm text-muted">Từ này chưa có cách đọc trong dữ liệu; nút nghe đọc theo chữ viết.</p>}
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
          {card && <span className="text-sm text-muted">Giãn cách ôn hiện tại: {formatInterval(card.interval)}</span>}
        </div>
      </article>

      {item.parent && <RelatedList ids={[item.parent]} title="Từ chính" />}
      {item.related && item.related.length > 0 && <RelatedList ids={item.related} title="Từ liên quan" />}
      <KanjiBreakdown word={item.word} />
    </div>
  )
}

export function WordPage() {
  const { id = '' } = useParams()
  const { status, entries, error, retry } = useEntries([id])
  const entry = entries.get(id)
  const deck: Deck = entry?.kind === 'word' ? entry.deck : { kind: 'vocab', key: 'n5' }
  const vocab = useVocab(deck)
  const position = useMemo(() => (vocab.data ? vocab.data.findIndex((w) => w.id === id) : -1), [vocab.data, id])

  if (status === 'error') return <LoadError error={error} onRetry={retry} />
  if (status !== 'ready') return <PageSkeleton header rows={4} />
  if (!entry || entry.kind !== 'word') return <NotFound />
  return <WordDetail key={id} item={entry.item} deck={entry.deck} position={position} />
}

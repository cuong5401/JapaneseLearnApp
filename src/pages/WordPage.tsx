import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { WordDetail } from '../components/detail/WordDetail'
import { LoadError, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { deckPath, deckTitle } from '../data'
import { useEntries, useVocab } from '../hooks/useData'
import { useDetailStack } from '../hooks/useDetailStack'
import { lessonIndexOf } from '../lib/lessons'
import { useLessonSize } from '../lib/settings'
import type { Deck } from '../types'
import { NotFound } from './NotFound'

export function WordPage() {
  const { id = '' } = useParams()
  const { status, entries, error, retry } = useEntries([id])
  const entry = entries.get(id)
  const deck: Deck = entry?.kind === 'word' ? entry.deck : { kind: 'vocab', key: 'n5' }
  const vocab = useVocab(deck)
  const position = useMemo(() => (vocab.data ? vocab.data.findIndex((w) => w.id === id) : -1), [vocab.data, id])
  const size = useLessonSize()
  // Từ liên quan, chữ Hán trong từ: mở trong ngăn xếp chi tiết, không rời trang.
  const stack = useDetailStack()

  if (status === 'error') return <LoadError error={error} onRetry={retry} />
  if (status !== 'ready') return <PageSkeleton header rows={4} />
  if (!entry || entry.kind !== 'word') return <NotFound />

  const lesson = deck.kind === 'vocab' && position >= 0 ? lessonIndexOf(position, size) + 1 : null
  const back =
    deck.kind === 'vocab' && lesson ? { to: `${deckPath(deck)}/${lesson}`, label: `${deckTitle(deck)}, Bài ${lesson}` } : { to: deckPath(deck), label: deckTitle(deck) }

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader title="Chi tiết từ" back={back} />
      <WordDetail key={id} item={entry.item} onPush={stack.push} />
    </div>
  )
}

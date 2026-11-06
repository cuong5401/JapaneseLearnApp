import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SpeakButton } from '../components/SpeakButton'
import { deckPath, deckTitle, getDeckWords } from '../data'
import { shuffle } from '../lib/answer'
import { progress } from '../lib/progress'
import { useCards } from '../hooks/useProgress'
import { useDeck } from '../hooks/useDeck'
import type { Deck, VocabItem } from '../types'
import { NotFound } from './NotFound'

/** Hiện cách đọc phía trên khi chữ có kanji. */
function Word({ item, className, align = 'center' }: { item: VocabItem; className: string; align?: 'center' | 'left' }) {
  const showReading = item.reading !== item.word
  return (
    <div lang="ja" className={`font-jp ${align === 'left' ? 'text-left' : 'text-center'}`}>
      {showReading && <div className="mb-1 text-lg text-muted">{item.reading}</div>}
      <div className={`font-bold leading-tight ${className}`}>{item.word}</div>
    </div>
  )
}

function FlashcardsInner({ deck }: { deck: Deck }) {
  const source = getDeckWords(deck)
  const [order, setOrder] = useState<VocabItem[]>(source)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const cards = useCards()

  const item = order[index]
  const learned = Boolean(cards[item.id])
  const learnedCount = useMemo(() => source.filter((w) => cards[w.id]).length, [cards, source])

  const go = useCallback(
    (delta: number) => {
      setFlipped(false)
      setIndex((i) => (i + delta + order.length) % order.length)
    },
    [order.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  return (
    <div>
      <PageHeader title="Flashcard" back={{ to: deckPath(deck), label: deckTitle(deck) }}>
        <button
          type="button"
          onClick={() => {
            setOrder(shuffle(source))
            setIndex(0)
            setFlipped(false)
          }}
          className="min-h-10 rounded-lg border border-line px-3 text-sm text-muted hover:text-ink"
        >
          Trộn thẻ
        </button>
      </PageHeader>

      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span className="tabular-nums">
          Thẻ {index + 1}/{order.length}
        </span>
        <span className="tabular-nums">Đã học {learnedCount}/{source.length}</span>
      </div>

      <div className="flip">
        <div
          role="button"
          tabIndex={0}
          aria-label={flipped ? 'Mặt sau, chạm để xem lại mặt trước' : 'Mặt trước, chạm để lật thẻ'}
          onClick={() => setFlipped((f) => !f)}
          className={`flip-inner grid cursor-pointer select-none ${flipped ? 'is-flipped' : ''}`}
        >
          {/* Mặt trước */}
          <div className="flip-face col-start-1 row-start-1 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6">
            <Word item={item} className="text-5xl sm:text-6xl" />
            <p className="mt-8 text-sm text-muted">Chạm để xem nghĩa</p>
          </div>

          {/* Mặt sau */}
          <div className="flip-face flip-back col-start-1 row-start-1 flex min-h-80 flex-col rounded-2xl border border-ai bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <Word item={item} className="text-3xl" align="left" />
              <SpeakButton text={item.reading} />
            </div>
            <p className="mt-5 text-2xl font-semibold">{item.meaning}</p>
            {item.pos && <p className="mt-1 text-sm text-muted">{item.pos}</p>}
            {item.example && (
              <div className="mt-auto border-t border-line pt-4">
                <div className="flex items-start gap-3">
                  <p lang="ja" className="flex-1 font-jp text-lg leading-relaxed">
                    {item.example.ja}
                  </p>
                  <SpeakButton text={item.example.ja} label="Nghe câu ví dụ" size="sm" />
                </div>
                <p className="mt-1 text-muted">{item.example.vi}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr_auto] gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Thẻ trước"
          className="grid min-h-12 w-14 place-items-center rounded-lg border border-line bg-surface hover:bg-sunken"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => (learned ? progress.forget(item.id) : (progress.markLearned(item.id), go(1)))}
          className={`min-h-12 rounded-lg font-semibold transition-colors ${
            learned ? 'border border-matsu bg-matsu-soft text-matsu' : 'bg-ai text-on-ai hover:opacity-90'
          }`}
        >
          {learned ? 'Đã học, chạm để bỏ đánh dấu' : 'Đã học, sang thẻ sau'}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Thẻ sau"
          className="grid min-h-12 w-14 place-items-center rounded-lg border border-line bg-surface hover:bg-sunken"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <p className="mt-3 hidden text-center text-xs text-muted md:block">
        Phím tắt: Space để lật, ← → để chuyển thẻ
      </p>
    </div>
  )
}

export function Flashcards() {
  const deck = useDeck()
  if (!deck) return <NotFound />
  return <FlashcardsInner key={deckPath(deck)} deck={deck} />
}

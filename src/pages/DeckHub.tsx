import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { LEVEL_INFO, TERM_INFO, deckIds, deckPath, deckTitle, getDeckWords, getKanji } from '../data'
import { useDeck } from '../hooks/useDeck'
import { useStats } from '../hooks/useProgress'
import type { Deck } from '../types'
import { NotFound } from './NotFound'

interface Activity {
  to: string
  glyph: string
  title: string
  detail: string
}

function DeckHubInner({ deck }: { deck: Deck }) {
  const ids = useMemo(() => deckIds(deck), [deck])
  const stats = useStats(ids)
  const base = deckPath(deck)
  const words = getDeckWords(deck)
  const sample = words[0]

  const activities: Activity[] = [
    { to: `${base}/flashcards`, glyph: '札', title: 'Flashcard', detail: `${words.length} từ, lật thẻ để xem nghĩa và ví dụ` },
    ...(deck.kind === 'level'
      ? [{ to: `${base}/kanji`, glyph: '漢', title: 'Chữ Hán', detail: `${getKanji(deck.level).length} chữ với âm On, Kun và Hán Việt` }]
      : []),
    { to: `${base}/quiz`, glyph: '問', title: 'Quiz', detail: 'Trắc nghiệm hoặc gõ cách đọc' },
  ]

  const ja = deck.kind === 'level' ? LEVEL_INFO[deck.level].ja : TERM_INFO[deck.category].ja

  return (
    <div>
      <PageHeader title={deckTitle(deck)} back={{ to: '/', label: 'Trang chủ' }}>
        <span lang="ja" className="font-jp text-lg text-muted">
          {ja}
        </span>
      </PageHeader>

      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span>
            Đã học <strong className="tabular-nums">{stats.learned}</strong>/{stats.total}
          </span>
          <span className="text-muted">
            Đã thuộc <strong className="tabular-nums text-ink">{stats.mastered}</strong>
          </span>
        </div>
        <div className="mt-2.5">
          <ProgressBar {...stats} label="Tiến độ bộ này" />
        </div>
        {stats.due > 0 && (
          <Link to="/review" className="mt-3 inline-block text-sm font-medium text-ai hover:underline">
            {stats.due} thẻ của bộ này đang đến hạn ôn
          </Link>
        )}
      </div>

      <ul className="mt-6 space-y-3">
        {activities.map((a) => (
          <li key={a.to}>
            <Link
              to={a.to}
              className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-ai"
            >
              <GridCell className="size-14 text-3xl text-ai">{a.glyph}</GridCell>
              <span className="min-w-0">
                <span className="block font-semibold">{a.title}</span>
                <span className="block text-sm text-muted">{a.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {sample && (
        <p className="mt-8 text-sm text-muted">
          Ví dụ trong bộ này:{' '}
          <span lang="ja" className="font-jp text-ink">
            {sample.word}
          </span>{' '}
          ({sample.meaning})
        </p>
      )}
    </div>
  )
}

export function DeckHub() {
  const deck = useDeck()
  return deck ? <DeckHubInner deck={deck} /> : <NotFound />
}

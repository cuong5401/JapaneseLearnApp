import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GridCell } from '../components/GridCell'
import { PageHeader } from '../components/PageHeader'
import { CardLink } from '../components/Pressable'
import { ProgressBar } from '../components/ProgressBar'
import { Stagger, StaggerItem } from '../components/Stagger'
import { STUDY_PAGE } from '../components/StudyLayout'
import { FlashcardSession } from '../components/study/FlashcardSession'
import { QuizSession } from '../components/study/QuizSession'
import { TERM_INFO, deckPath, deckTitle, getTerms } from '../data'
import { useDeck } from '../hooks/useDeck'
import { useStats } from '../hooks/useProgress'
import type { TermCategory } from '../types'
import { NotFound } from './NotFound'

/** Trang nhóm thuật ngữ chuyên ngành (dữ liệu đóng gói sẵn, không chia bài). */
function TermHub({ category }: { category: TermCategory }) {
  const words = getTerms(category)
  const ids = useMemo(() => words.map((w) => w.id), [words])
  const stats = useStats(ids)
  const deck = { kind: 'terms', category } as const
  const base = deckPath(deck)
  const activities = [
    { to: `${base}/flashcards`, glyph: '札', title: 'Flashcard', detail: `${words.length} thuật ngữ, vuốt để chấm nhớ / chưa nhớ` },
    { to: `${base}/quiz`, glyph: '問', title: 'Quiz', detail: 'Trắc nghiệm hoặc gõ cách đọc' },
  ]

  return (
    <div>
      <PageHeader title={deckTitle(deck)} back={{ to: '/', label: 'Trang chủ' }}>
        <span lang="ja" className="font-jp text-lg text-muted">
          {TERM_INFO[category].ja}
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

      <Stagger as="ul" className="mt-6 grid gap-3 md:grid-cols-2 lg:gap-4">
        {activities.map((a) => (
          <StaggerItem as="li" key={a.to}>
            <CardLink to={a.to} className="flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ai md:p-5">
              <GridCell className="size-14 text-ai">{a.glyph}</GridCell>
              <span className="min-w-0">
                <span className="block font-semibold">{a.title}</span>
                <span className="block text-sm text-muted">{a.detail}</span>
              </span>
            </CardLink>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}

export function DeckHub() {
  const deck = useDeck()
  if (!deck || deck.kind !== 'terms') return <NotFound />
  return <TermHub category={deck.category} />
}

/** /terms/:category/flashcards và /terms/:category/quiz */
export function TermStudy({ mode }: { mode: 'flashcards' | 'quiz' }) {
  const deck = useDeck()
  if (!deck || deck.kind !== 'terms') return <NotFound />
  const words = getTerms(deck.category)
  const back = { to: deckPath(deck), label: `Về ${deckTitle(deck)}` }
  return (
    <div className={STUDY_PAGE}>
      <PageHeader title={mode === 'flashcards' ? 'Flashcard' : 'Quiz'} back={{ to: deckPath(deck), label: deckTitle(deck) }} />
      {mode === 'flashcards' ? (
        <FlashcardSession key={deck.category} items={words} back={back} />
      ) : (
        <QuizSession key={deck.category} items={words} back={back} />
      )}
    </div>
  )
}

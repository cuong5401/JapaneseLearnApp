import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Loaded, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { ButtonLink, CardLink } from '../components/Pressable'
import { ProgressBar } from '../components/ProgressBar'
import { Segmented } from '../components/Segmented'
import { Stagger, StaggerItem } from '../components/Stagger'
import { VOCAB_DECK_INFO, deckTitle } from '../data'
import { useDeck } from '../hooks/useDeck'
import { useVocab } from '../hooks/useData'
import { useCards, useStats } from '../hooks/useProgress'
import { LESSON_SIZES, continueLesson, lessonProgress, splitLessons, type LessonProgress, type LessonState } from '../lib/lessons'
import { setLessonSize, useLessonSize } from '../lib/settings'
import type { VocabDeckKey, VocabItem } from '../types'
import { NotFound } from './NotFound'

const PER_PAGE = 40

const STATE_LABEL: Record<LessonState, { text: string; cls: string }> = {
  new: { text: 'Chưa học', cls: 'text-muted' },
  learning: { text: 'Đang học', cls: 'text-ai' },
  mastered: { text: 'Đã thuộc', cls: 'text-matsu' },
}

function LessonTile({ deck, index, items, progress, current }: { deck: VocabDeckKey; index: number; items: VocabItem[]; progress: LessonProgress; current: boolean }) {
  const state = STATE_LABEL[progress.state]
  return (
    <CardLink
      to={`/vocab/${deck}/${index + 1}`}
      aria-label={`Bài ${index + 1}, ${state.text}, đã học ${progress.learned}/${progress.total}`}
      className={`flex h-full flex-col rounded-xl border p-3.5 transition-colors ${
        current ? 'border-ai bg-ai-soft' : progress.state === 'mastered' ? 'border-matsu/50 bg-surface' : 'border-line bg-surface hover:border-ai'
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">Bài {index + 1}</span>
        <span className={`text-xs font-medium ${state.cls}`}>{state.text}</span>
      </span>
      <span lang="ja" className="mt-1 truncate font-jp text-sm text-muted">
        {items
          .slice(0, 3)
          .map((w) => w.word)
          .join('、')}
      </span>
      <span className="mt-auto flex items-center gap-2 pt-3">
        <ProgressBar {...progress} label={`Tiến độ bài ${index + 1}`} />
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {progress.learned}/{progress.total}
        </span>
      </span>
    </CardLink>
  )
}

function DeckBody({ deckKey, items }: { deckKey: VocabDeckKey; items: VocabItem[] }) {
  const size = useLessonSize()
  const cards = useCards()
  const lessons = useMemo(() => splitLessons(items, size), [items, size])
  const progress = useMemo(() => lessons.map((l) => lessonProgress(l.map((w) => w.id), cards)), [lessons, cards])
  const next = continueLesson(progress)
  const weak = useMemo(() => items.filter((w) => w.weak), [items])
  const weakIds = useMemo(() => weak.map((w) => w.id), [weak])
  const weakStats = useStats(weakIds)
  const allIds = useMemo(() => items.map((w) => w.id), [items])
  const stats = useStats(allIds)
  const pages = Math.ceil(lessons.length / PER_PAGE)
  const [page, setPage] = useState(() => Math.floor(next / PER_PAGE))
  const shownPage = Math.min(page, Math.max(0, pages - 1))
  const info = VOCAB_DECK_INFO[deckKey]

  return (
    <>
      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="text-sm text-muted">
            <AnimatedNumber value={items.length} className="font-semibold text-ink" /> từ, chia thành {lessons.length} bài
          </p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar {...stats} label={`Tiến độ ${deckTitle({ kind: 'vocab', key: deckKey })}`} />
            <span className="shrink-0 text-sm tabular-nums text-muted">
              {stats.learned}/{stats.total}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="text-muted">Mỗi bài</span>
            <Segmented
              size="sm"
              label="Số từ mỗi bài"
              value={size}
              onChange={(v) => {
                setLessonSize(v)
                setPage(0)
              }}
              options={LESSON_SIZES.map((n) => ({ value: n, label: `${n} từ` }))}
            />
          </div>
        </div>
        <ButtonLink
          to={`/vocab/${deckKey}/${next + 1}`}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-ai px-6 font-semibold text-on-ai hover:opacity-90"
        >
          {progress[next]?.state === 'learning' ? `Học tiếp Bài ${next + 1}` : `Học Bài ${next + 1}`}
        </ButtonLink>
      </section>

      {weak.length > 0 && (
        <CardLink
          to={`/vocab/${deckKey}/weak`}
          className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border-2 border-kihada bg-kihada-soft p-5"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Từ chưa thuộc</span>
            <span className="block text-sm text-muted">{weak.length} từ bạn đã đánh dấu "Chưa thuộc" trong file Excel</span>
          </span>
          <span className="flex w-full items-center gap-3 sm:w-56">
            <ProgressBar {...weakStats} label="Tiến độ từ chưa thuộc" />
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {weakStats.learned}/{weakStats.total}
            </span>
          </span>
        </CardLink>
      )}

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Các bài</h2>
        {info.level && (
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link to={`/kanji?level=${info.level}`} className="font-medium text-ai hover:underline">
              Chữ Hán xuất hiện từ {info.level}
            </Link>
            <Link to={`/grammar/${deckKey}`} className="font-medium text-ai hover:underline">
              Ngữ pháp {info.level}
            </Link>
          </span>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Trang danh sách bài" className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: pages }, (_, p) => (
            <button
              key={p}
              type="button"
              aria-current={p === shownPage ? 'page' : undefined}
              onClick={() => setPage(p)}
              className={`min-h-10 rounded-lg border px-3 text-sm tabular-nums ${
                p === shownPage ? 'border-ai bg-ai-soft font-semibold text-ai' : 'border-line text-muted hover:text-ink'
              }`}
            >
              Bài {p * PER_PAGE + 1}–{Math.min(lessons.length, (p + 1) * PER_PAGE)}
            </button>
          ))}
        </nav>
      )}

      <Stagger key={`${size}-${shownPage}`} as="ol" step={0.012} className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {lessons.slice(shownPage * PER_PAGE, (shownPage + 1) * PER_PAGE).map((l, i) => {
          const index = shownPage * PER_PAGE + i
          return (
            <StaggerItem as="li" key={index}>
              <LessonTile deck={deckKey} index={index} items={l} progress={progress[index]} current={index === next} />
            </StaggerItem>
          )
        })}
      </Stagger>
    </>
  )
}

export function VocabDeck() {
  const deck = useDeck()
  const vocab = useVocab(deck ?? { kind: 'vocab', key: 'n5' })
  if (!deck || deck.kind !== 'vocab') return <NotFound />
  const info = VOCAB_DECK_INFO[deck.key]
  return (
    <div>
      <PageHeader title={deckTitle(deck)} back={{ to: '/', label: 'Trang chủ' }}>
        <span lang="ja" className="font-jp text-lg text-muted">
          {info.ja}
        </span>
      </PageHeader>
      <Loaded state={vocab} skeleton={<PageSkeleton grid rows={12} />}>
        {(items) => <DeckBody key={deck.key} deckKey={deck.key} items={items} />}
      </Loaded>
    </div>
  )
}

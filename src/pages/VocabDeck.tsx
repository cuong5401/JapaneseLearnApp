import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LessonGrid } from '../components/LessonGrid'
import { Loaded, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { CardLink } from '../components/Pressable'
import { ProgressBar } from '../components/ProgressBar'
import { VOCAB_DECK_INFO, deckTitle } from '../data'
import { useDeck } from '../hooks/useDeck'
import { useVocab } from '../hooks/useData'
import { useStats } from '../hooks/useProgress'
import type { VocabDeckKey, VocabItem } from '../types'
import { PUBLIC_BUILD } from '../lib/edition'
import { NotFound } from './NotFound'
import { t } from '../i18n'

function DeckBody({ deckKey, items }: { deckKey: VocabDeckKey; items: VocabItem[] }) {
  const weak = useMemo(() => items.filter((w) => w.weak), [items])
  const weakIds = useMemo(() => weak.map((w) => w.id), [weak])
  const weakStats = useStats(weakIds)
  const info = VOCAB_DECK_INFO[deckKey]

  return (
    <LessonGrid
      items={items}
      unit="word"
      title={deckTitle({ kind: 'vocab', key: deckKey })}
      href={(i) => `/vocab/${deckKey}/${i + 1}`}
      preview={(l) =>
        l
          .slice(0, 3)
          .map((w) => w.word)
          .join('、')
      }
      between={
        weak.length > 0 && (
          <CardLink
            to={`/vocab/${deckKey}/weak`}
            className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border-2 border-kihada bg-kihada-soft p-5"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('vocabDeck.tuChuaThuoc')}</span>
              <span className="block text-sm text-muted">{t('vocabDeck.tuBanDaDanh', { length: weak.length })}</span>
            </span>
            <span className="flex w-full items-center gap-3 sm:w-56">
              <ProgressBar {...weakStats} label={t('vocabDeck.tienDoTuChua')} />
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {weakStats.learned}/{weakStats.total}
              </span>
            </span>
          </CardLink>
        )
      }
      links={
        info.level && (
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link to={`/kanji?level=${info.level}`} className="inline-flex min-h-11 items-center font-medium text-ai hover:underline">{t('vocabDeck.chuHanXuatHien', { level: info.level })}</Link>
            {!PUBLIC_BUILD && (
              <Link to={`/grammar/${deckKey}`} className="inline-flex min-h-11 items-center font-medium text-ai hover:underline">{t('common.nguPhap', { level: info.level })}</Link>
            )}
          </span>
        )
      }
    />
  )
}

export function VocabDeck() {
  const deck = useDeck()
  const vocab = useVocab(deck ?? { kind: 'vocab', key: 'n5' })
  if (!deck || deck.kind !== 'vocab') return <NotFound />
  const info = VOCAB_DECK_INFO[deck.key]
  return (
    <div>
      <PageHeader title={deckTitle(deck)}>
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

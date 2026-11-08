import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { GridCell } from '../components/GridCell'
import { LoadError, Skeleton } from '../components/LoadState'
import { ButtonLink, CardLink } from '../components/Pressable'
import { ProgressBar } from '../components/ProgressBar'
import { SpeakButton } from '../components/SpeakButton'
import { Stagger, StaggerItem } from '../components/Stagger'
import { DECK_ID_PREFIX, EXTRA_DECKS, LEVEL_DECKS, TERM_INFO, VOCAB_DECK_INFO, getTerms } from '../data'
import { useEntries, useKanjiIndex, useManifest } from '../hooks/useData'
import { useCards, useDueIds, usePrefixStats } from '../hooks/useProgress'
import { speechText } from '../lib/speech'
import { PUBLIC_BUILD, PUBLIC_GRAMMAR_NOTE } from '../lib/edition'
import { TERM_CATEGORIES, type DataManifest, type KanjiEntry, type TermCategory, type VocabDeckKey } from '../types'

const CARD = 'flex h-full rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ai sm:p-5'

const fileCount = (m: DataManifest | undefined, path: string) => m?.files.find((f) => f.path === path)?.count

/** Chữ Hán của ngày: cố định theo ngày, lấy từ các chữ xuất hiện ở N5–N3. */
function useDayIndex() {
  const [day] = useState(() => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000))
  return day
}

function KanjiOfDay({ kanji }: { kanji: KanjiEntry }) {
  const words = useEntries(kanji.words.slice(0, 2))
  const examples = kanji.words.slice(0, 2).flatMap((id) => {
    const e = words.entries.get(id)
    return e?.kind === 'word' ? [e.item] : []
  })
  return (
    <>
      <div className="mt-4 flex items-center gap-[clamp(1rem,5cqw,1.75rem)]">
        <GridCell className="w-[clamp(6rem,32cqw,10rem)]">{kanji.kanji}</GridCell>
        <div className="min-w-0">
          <p className="text-[clamp(1.5rem,8cqw,2.5rem)] leading-tight font-bold tracking-wide">{kanji.hanViet}</p>
          {kanji.hanVietAlt?.length ? <p className="mt-1 text-muted">Âm khác: {kanji.hanVietAlt.join(', ')}</p> : null}
          <p className="mt-2 text-sm text-muted">
            {kanji.wordCount} từ chứa chữ này{kanji.firstLevel && `, xuất hiện từ ${kanji.firstLevel}`}
          </p>
          <Link to={`/kanji?k=${encodeURIComponent(kanji.kanji)}`} className="mt-1 inline-block text-sm font-medium text-ai hover:underline">
            Xem các từ
          </Link>
        </div>
      </div>
      <ul className="mt-5 min-h-12 space-y-2 border-t border-cell-line/60 pt-4 text-sm">
        {examples.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to={`/word/${w.id}`} lang="ja" className="font-jp text-base hover:text-ai">
              {w.word}
              {w.reading && w.reading !== w.word && <span className="ml-1.5 text-sm text-muted">{w.reading}</span>}
            </Link>
            <span className="text-muted">{w.meaning}</span>
            <span className="ml-auto">
              <SpeakButton text={speechText(w)} size="sm" />
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

function TodayCard() {
  const index = useKanjiIndex()
  const day = useDayIndex()
  const kanji = useMemo(() => {
    const pool = (index.data ?? []).filter((k) => k.firstLevel === 'N5' || k.firstLevel === 'N4' || k.firstLevel === 'N3')
    return pool.length ? pool[day % pool.length] : undefined
  }, [index.data, day])

  return (
    <section aria-labelledby="today" className="@container min-w-0 rounded-2xl bg-ai-soft p-5 sm:p-7">
      <h1 id="today" className="text-sm font-medium text-ai">
        Chữ Hán hôm nay
      </h1>
      {index.status === 'error' ? (
        <div className="mt-4">
          <LoadError error={index.error} onRetry={index.retry} />
        </div>
      ) : kanji ? (
        <KanjiOfDay kanji={kanji} />
      ) : (
        <div className="mt-4 flex items-center gap-6" role="status" aria-label="Đang tải chữ Hán hôm nay">
          <Skeleton className="size-28 shrink-0 bg-surface/60" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-32 bg-surface/60" />
            <Skeleton className="h-4 w-48 bg-surface/60" />
          </div>
        </div>
      )}
    </section>
  )
}

function DueCard() {
  const due = useDueIds().length
  const scheduled = Object.keys(useCards()).length
  return (
    <section
      aria-labelledby="due"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 lg:flex-col lg:flex-nowrap lg:items-start lg:justify-start lg:p-7"
    >
      <div className="lg:flex lg:flex-1 lg:flex-col">
        <h2 id="due" className="font-semibold lg:text-sm lg:font-medium lg:text-muted">
          {due > 0 ? (
            <>
              <span className="lg:hidden">{due} thẻ cần ôn hôm nay</span>
              <span className="hidden lg:inline">Cần ôn hôm nay</span>
            </>
          ) : (
            'Không có thẻ nào đến hạn'
          )}
        </h2>
        <p className="hidden lg:mt-3 lg:block">
          <AnimatedNumber value={due > 0 ? due : scheduled} className={`text-6xl font-bold ${due > 0 ? 'text-ai' : 'text-muted'}`} />
          <span className="ml-2 text-muted">{due > 0 ? 'thẻ' : 'thẻ đang chờ trong lịch ôn'}</span>
        </p>
        <p className="mt-0.5 text-sm text-muted lg:mt-auto lg:pt-4">
          {due > 0 ? 'Ôn đúng lúc sắp quên giúp nhớ lâu hơn.' : 'Học từ mới bằng flashcard hoặc quiz, chúng sẽ tự vào lịch ôn.'}
        </p>
      </div>
      <ButtonLink
        to={due > 0 ? '/review' : '/vocab/n5'}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90 lg:w-full"
      >
        {due > 0 ? 'Ôn tập ngay' : 'Học từ N5'}
      </ButtonLink>
    </section>
  )
}

function DeckCard({ deckKey, manifest }: { deckKey: VocabDeckKey; manifest?: DataManifest }) {
  const info = VOCAB_DECK_INFO[deckKey]
  const total = fileCount(manifest, info.path)
  const stats = usePrefixStats(DECK_ID_PREFIX[deckKey], total ?? 0)
  const lessons = total !== undefined && manifest ? Math.ceil(total / manifest.pageSize) : undefined
  return (
    <CardLink to={`/vocab/${deckKey}`} className={`${CARD} flex-col gap-3 md:gap-4`}>
      <div className="flex items-center gap-4">
        <GridCell fit={info.level ? 0.36 : undefined} className="size-12 font-bold text-ai md:size-14">
          {info.level ?? info.ja.slice(0, 1)}
        </GridCell>
        <div className="min-w-0">
          <p className="font-semibold">{info.name}</p>
          <p lang="ja" className="font-jp text-sm text-muted">
            {info.ja}
          </p>
        </div>
      </div>
      <div className="min-w-0">
        <div className="h-5 text-sm text-muted">{total !== undefined ? `${total} từ, ${lessons} bài` : <Skeleton className="h-4 w-28" />}</div>
        <div className="mt-2.5 flex items-center gap-3">
          <ProgressBar {...stats} label={`Tiến độ ${info.name}`} />
          <span className="shrink-0 text-xs text-muted">
            <AnimatedNumber value={stats.learned} />/{total ?? '…'}
          </span>
        </div>
      </div>
    </CardLink>
  )
}

function TermCard({ category }: { category: TermCategory }) {
  const info = TERM_INFO[category]
  const stats = usePrefixStats(info.prefix, getTerms(category).length, '\\d{3}')
  return (
    <CardLink to={`/terms/${category}`} className={`${CARD} flex-col`}>
      <span lang="ja" className="font-jp text-2xl font-bold tracking-wide text-ai">
        {info.ja}
      </span>
      <span className="mt-3 font-semibold">{info.name}</span>
      <span className="mt-0.5 text-sm text-muted">{info.note}</span>
      <span className="mt-auto flex items-center gap-3 pt-4">
        <ProgressBar {...stats} label={`Tiến độ ${info.name}`} />
        <span className="shrink-0 text-xs text-muted">
          <AnimatedNumber value={stats.learned} />/{stats.total}
        </span>
      </span>
    </CardLink>
  )
}

function StudyMore({ manifest }: { manifest?: DataManifest }) {
  const kanji = fileCount(manifest, 'kanji/kanji.json')
  const radicals = fileCount(manifest, 'kanji/radicals.json')
  const grammar = manifest?.files.filter((f) => f.kind === 'grammar').reduce((n, f) => n + f.count, 0)
  const items = [
    { to: '/kanji', glyph: '漢', title: 'Chữ Hán', detail: kanji !== undefined ? `${kanji} chữ, ${radicals} bộ thủ, quiz âm Hán Việt` : '' },
    { to: '/grammar', glyph: '文', title: 'Ngữ pháp', detail: PUBLIC_BUILD ? PUBLIC_GRAMMAR_NOTE : grammar !== undefined ? `${grammar} mẫu từ N4 đến N1` : '' },
    { to: '/kana', glyph: 'あ', title: 'Luyện kana', detail: 'Hiragana, katakana, gõ romaji' },
  ]
  return (
    <Stagger as="ul" className="grid gap-3 md:grid-cols-3 lg:gap-4">
      {items.map((it) => (
        <StaggerItem as="li" key={it.to}>
          <CardLink to={it.to} className={`${CARD} items-center gap-4`}>
            <GridCell className="size-14 text-ai">{it.glyph}</GridCell>
            <span className="min-w-0">
              <span className="block font-semibold">{it.title}</span>
              <span className="block min-h-5 text-sm text-muted">{it.detail}</span>
            </span>
          </CardLink>
        </StaggerItem>
      ))}
    </Stagger>
  )
}

export function Home() {
  const manifest = useManifest()
  const m = manifest.data

  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <TodayCard />
        <DueCard />
      </div>

      {manifest.status === 'error' && <LoadError error={manifest.error} onRetry={manifest.retry} />}

      <section aria-labelledby="levels">
        <h2 id="levels" className="mb-4 text-xl font-bold tracking-tight">
          Từ vựng JLPT
        </h2>
        <Stagger as="ol" className="grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {LEVEL_DECKS.map((k) => (
            <StaggerItem as="li" key={k}>
              <DeckCard deckKey={k} manifest={m} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="extra">
        <h2 id="extra" className="mb-4 text-xl font-bold tracking-tight">
          Bộ từ khác
        </h2>
        <Stagger as="ul" className="grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {EXTRA_DECKS.map((k) => (
            <StaggerItem as="li" key={k}>
              <DeckCard deckKey={k} manifest={m} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="more">
        <h2 id="more" className="mb-4 text-xl font-bold tracking-tight">
          Chữ Hán, ngữ pháp, kana
        </h2>
        <StudyMore manifest={m} />
      </section>

      <section aria-labelledby="terms">
        <h2 id="terms" className="text-xl font-bold tracking-tight">
          Thuật ngữ chuyên ngành
        </h2>
        <p className="mt-1 text-sm text-muted">Từ vựng dùng hằng ngày ở công ty Nhật.</p>
        <Stagger as="ul" className="mt-4 grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {TERM_CATEGORIES.map((c) => (
            <StaggerItem as="li" key={c}>
              <TermCard category={c} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </div>
  )
}

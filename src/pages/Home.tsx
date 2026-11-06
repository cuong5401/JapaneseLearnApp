import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { GridCell } from '../components/GridCell'
import { ButtonLink, CardLink } from '../components/Pressable'
import { ProgressBar } from '../components/ProgressBar'
import { SpeakButton } from '../components/SpeakButton'
import { Stagger, StaggerItem } from '../components/Stagger'
import { LEVEL_INFO, TERM_INFO, deckIds, getKanji, getVocab } from '../data'
import { useCards, useDueIds, useStats } from '../hooks/useProgress'
import { LEVELS, TERM_CATEGORIES, type Level, type TermCategory } from '../types'

/** Chữ Hán của ngày: cố định theo ngày, lấy từ N5–N3. */
function useKanjiOfDay() {
  const [kanji] = useState(() => {
    const pool = (['N5', 'N4', 'N3'] as Level[]).flatMap((l) => getKanji(l))
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000)
    return pool[day % pool.length]
  })
  return kanji
}

const CARD = 'flex h-full rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ai sm:p-5'

function LevelCard({ level }: { level: Level }) {
  const ids = useMemo(() => deckIds({ kind: 'level', level }), [level])
  const stats = useStats(ids)
  const info = LEVEL_INFO[level]
  return (
    <CardLink to={`/level/${level}`} className={`${CARD} flex-col gap-3 md:gap-4`}>
      <div className="flex items-center gap-4">
        <GridCell fit={0.36} className="size-12 font-bold text-ai md:size-14">{level}</GridCell>
        <div className="min-w-0">
          <p className="font-semibold">{info.name}</p>
          <p lang="ja" className="font-jp text-sm text-muted">
            {info.ja}
          </p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted">
          {getVocab(level).length} từ vựng, {getKanji(level).length} chữ Hán
        </p>
        <div className="mt-2.5 flex items-center gap-3">
          <ProgressBar {...stats} label={`Tiến độ ${level}`} />
          <span className="shrink-0 text-xs text-muted">
            <AnimatedNumber value={stats.learned} />/{stats.total}
          </span>
        </div>
      </div>
    </CardLink>
  )
}

function TermCard({ category }: { category: TermCategory }) {
  const ids = useMemo(() => deckIds({ kind: 'terms', category }), [category])
  const stats = useStats(ids)
  const info = TERM_INFO[category]
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

export function Home() {
  const kanji = useKanjiOfDay()
  const due = useDueIds().length
  const scheduled = Object.keys(useCards()).length
  const compound = kanji.compounds[0]

  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        {/* Chữ của ngày */}
        <section aria-labelledby="today" className="@container min-w-0 rounded-2xl bg-ai-soft p-5 sm:p-7">
          <h1 id="today" className="text-sm font-medium text-ai">
            Chữ Hán hôm nay
          </h1>
          <div className="mt-4 flex items-center gap-[clamp(1rem,5cqw,1.75rem)]">
            <GridCell className="w-[clamp(6rem,32cqw,10rem)]">{kanji.kanji}</GridCell>
            <div className="min-w-0">
              <p className="text-[clamp(1.5rem,8cqw,2.5rem)] font-bold leading-tight tracking-wide">{kanji.hanViet}</p>
              <p className="mt-1 text-muted">{kanji.meaning}</p>
              <dl lang="ja" className="mt-3 space-y-0.5 text-sm">
                {kanji.onyomi.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="font-sans text-muted">On</dt>
                    <dd>{kanji.onyomi.join('、')}</dd>
                  </div>
                )}
                {kanji.kunyomi.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="font-sans text-muted">Kun</dt>
                    <dd>{kanji.kunyomi.join('、')}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cell-line/60 pt-4 text-sm">
            <span lang="ja" className="font-jp">
              {compound.word}
              <span className="ml-1.5 text-muted">{compound.reading}</span>
            </span>
            <span className="text-muted">{compound.meaning}</span>
            <span className="ml-auto">
              <SpeakButton text={compound.reading} size="sm" />
            </span>
          </div>
        </section>

        {/* Lịch ôn */}
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
              {due > 0
                ? 'Ôn đúng lúc sắp quên giúp nhớ lâu hơn.'
                : 'Học từ mới bằng flashcard hoặc quiz, chúng sẽ tự vào lịch ôn.'}
            </p>
          </div>
          <ButtonLink
            to={due > 0 ? '/review' : '/level/N5/flashcards'}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90 lg:w-full"
          >
            {due > 0 ? 'Ôn tập ngay' : 'Học từ N5'}
          </ButtonLink>
        </section>
      </div>

      <section aria-labelledby="levels">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="levels" className="text-xl font-bold tracking-tight">
            Cấp độ JLPT
          </h2>
          <Link to="/kana" className="text-sm font-medium text-ai hover:underline">
            Chưa thuộc kana? Luyện trước
          </Link>
        </div>
        <Stagger as="ol" className="grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {LEVELS.map((l) => (
            <StaggerItem as="li" key={l}>
              <LevelCard level={l} />
            </StaggerItem>
          ))}
        </Stagger>
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

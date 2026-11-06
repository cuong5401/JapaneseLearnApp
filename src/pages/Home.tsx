import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { GridCell } from '../components/GridCell'
import { ProgressBar } from '../components/ProgressBar'
import { SpeakButton } from '../components/SpeakButton'
import { LEVEL_INFO, TERM_INFO, deckIds, getKanji, getVocab, getTerms } from '../data'
import { useDueIds, useStats } from '../hooks/useProgress'
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

function LevelRow({ level }: { level: Level }) {
  const ids = useMemo(() => deckIds({ kind: 'level', level }), [level])
  const stats = useStats(ids)
  const info = LEVEL_INFO[level]
  return (
    <li>
      <Link
        to={`/level/${level}`}
        className="group flex items-center gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-surface sm:px-4"
      >
        <GridCell className="size-14 text-lg font-bold text-ai">{level}</GridCell>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{info.name}</span>
            <span lang="ja" className="text-sm text-muted">
              {info.ja}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {getVocab(level).length} từ vựng, {getKanji(level).length} chữ Hán
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <ProgressBar {...stats} label={`Tiến độ ${level}`} />
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted">
              {stats.learned}/{stats.total}
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}

function TermTile({ category }: { category: TermCategory }) {
  const ids = useMemo(() => deckIds({ kind: 'terms', category }), [category])
  const stats = useStats(ids)
  const info = TERM_INFO[category]
  return (
    <Link
      to={`/terms/${category}`}
      className="flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-ai"
    >
      <span lang="ja" className="font-jp text-2xl font-bold tracking-wide text-ai">
        {info.ja}
      </span>
      <span className="mt-3 font-semibold">{info.name}</span>
      <span className="mt-0.5 text-sm text-muted">{info.note}</span>
      <span className="mt-4 flex items-center gap-3">
        <ProgressBar {...stats} label={`Tiến độ ${info.name}`} />
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {stats.learned}/{getTerms(category).length}
        </span>
      </span>
    </Link>
  )
}

export function Home() {
  const kanji = useKanjiOfDay()
  const due = useDueIds().length

  return (
    <div className="space-y-10">
      {/* Chữ của ngày + lịch ôn */}
      <section aria-labelledby="today" className="rounded-2xl bg-ai-soft p-5 sm:p-7">
        <h1 id="today" className="text-sm font-medium text-ai">
          Chữ Hán hôm nay
        </h1>
        <div className="mt-4 flex items-center gap-5 sm:gap-7">
          <GridCell className="size-32 text-[5.5rem] sm:size-40 sm:text-[7rem]">{kanji.kanji}</GridCell>
          <div className="min-w-0">
            <p className="text-3xl font-bold tracking-wide sm:text-4xl">{kanji.hanViet}</p>
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
            {kanji.compounds[0].word}
            <span className="ml-1.5 text-muted">{kanji.compounds[0].reading}</span>
          </span>
          <span className="text-muted">{kanji.compounds[0].meaning}</span>
          <span className="ml-auto">
            <SpeakButton text={kanji.compounds[0].word} size="sm" />
          </span>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <h2 className="font-semibold">
            {due > 0 ? `${due} thẻ cần ôn hôm nay` : 'Không có thẻ nào đến hạn'}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {due > 0
              ? 'Ôn đúng lúc sắp quên giúp nhớ lâu hơn.'
              : 'Học từ mới bằng flashcard hoặc quiz, chúng sẽ tự vào lịch ôn.'}
          </p>
        </div>
        <Link
          to={due > 0 ? '/review' : '/level/N5/flashcards'}
          className="inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90"
        >
          {due > 0 ? 'Ôn tập ngay' : 'Học từ N5'}
        </Link>
      </section>

      <section aria-labelledby="levels">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="levels" className="text-xl font-bold tracking-tight">
            Cấp độ JLPT
          </h2>
          <Link to="/kana" className="text-sm font-medium text-ai hover:underline">
            Chưa thuộc kana? Luyện trước
          </Link>
        </div>
        <ol className="-mx-3 divide-y divide-line sm:-mx-4">
          {LEVELS.map((l) => (
            <LevelRow key={l} level={l} />
          ))}
        </ol>
      </section>

      <section aria-labelledby="terms">
        <h2 id="terms" className="text-xl font-bold tracking-tight">
          Thuật ngữ chuyên ngành
        </h2>
        <p className="mt-1 text-sm text-muted">Từ vựng dùng hằng ngày ở công ty Nhật.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TERM_CATEGORIES.map((c) => (
            <TermTile key={c} category={c} />
          ))}
        </div>
      </section>
    </div>
  )
}

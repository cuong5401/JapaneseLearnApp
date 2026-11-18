import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Loaded, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { ButtonLink } from '../components/Pressable'
import { Segmented } from '../components/Segmented'
import { SpeakButton } from '../components/SpeakButton'
import { BookmarkButton } from '../components/notebook/BookmarkButton'
import { Stagger, StaggerItem } from '../components/Stagger'
import { LESSON_PAGE, TAB_AREA } from '../components/StudyLayout'
import { HanViet } from '../components/VocabBits'
import { FlashcardSession, type SessionLink } from '../components/study/FlashcardSession'
import { QuizSession } from '../components/study/QuizSession'
import { deckPath, deckTitle } from '../data'
import { useDeck } from '../hooks/useDeck'
import { useVocab } from '../hooks/useData'
import { useCards } from '../hooks/useProgress'
import { isMastered } from '../lib/srs'
import { speechText } from '../lib/speech'
import { splitLessons } from '../lib/lessons'
import { useLessonSize } from '../lib/settings'
import type { Deck, VocabItem } from '../types'
import { NotFound } from './NotFound'
import { t as tr } from '../i18n'

type Tab = 'list' | 'flashcards' | 'quiz'
const TABS: { value: Tab; label: string }[] = [
  { value: 'list', get label() {
    return tr('common.danhSach')
  } },
  { value: 'flashcards', get label() {
    return tr('common.flashcard')
  } },
  { value: 'quiz', get label() {
    return tr('common.quiz')
  } },
]

function StatusDot({ id }: { id: string }) {
  const card = useCards()[id]
  if (!card) return <span className="sr-only">{tr('common.chuaHoc')}</span>
  const mastered = isMastered(card)
  return (
    <span
      title={mastered ? tr('common.daThuoc') : tr('common.daHoc')}
      className={`inline-block size-2.5 shrink-0 rounded-full ${mastered ? 'bg-ai' : 'bg-cell-line'}`}
    >
      <span className="sr-only">{mastered ? tr('common.daThuoc') : tr('common.daHoc')}</span>
    </span>
  )
}

function Extras({ item }: { item: VocabItem }) {
  const bits = [
    item.pos,
    item.alt?.length ? tr('lesson.cachVietKhac', { join: item.alt.join('、') }) : '',
    item.origin ? tr('lesson.gocTiengAnh', { origin: item.origin }) : '',
    item.note,
  ].filter(Boolean)
  const links = (item.related?.length ?? 0) + (item.parent ? 1 : 0)
  if (!bits.length && !links) return null
  return (
    <span className="mt-0.5 block text-xs text-muted">
      {bits.join('. ')}
      {links > 0 && (
        <>
          {bits.length > 0 && '. '}
          <Link to={`/word/${item.id}`} className="relative z-10 font-medium text-ai hover:underline">
            {item.parent ? tr('lesson.xemTuChinh') : tr('lesson.tuLienQuan', { length: item.related!.length })}
          </Link>
        </>
      )}
    </span>
  )
}

/** Bảng trên màn rộng, thẻ dọc trên điện thoại. */
function WordList({ items, start }: { items: VocabItem[]; start: number }) {
  // N1 không có cột Hán Việt: ẩn hẳn cột để bảng không có cột trống.
  const showHanViet = items.some((w) => w.hanViet)
  return (
    <>
      <div className="hidden overflow-x-auto overscroll-x-contain rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-left">
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              <th scope="col" className="w-20 py-3 pl-4 font-medium">
                #
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">{tr('lesson.chu')}</th>
              <th scope="col" className="py-3 pr-4 font-medium">{tr('common.cachDoc')}</th>
              {showHanViet && (
                <th scope="col" className="py-3 pr-4 font-medium whitespace-nowrap">{tr('lesson.hanViet')}</th>
              )}
              <th scope="col" className="py-3 pr-4 font-medium">{tr('lesson.nghia')}</th>
              <th scope="col" className="w-24 py-3 pr-4">
                <span className="sr-only">{tr('lesson.luuNghe')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((w, i) => (
              <tr key={w.id} className="align-middle">
                <td className="py-3 pr-3 pl-4 text-sm tabular-nums text-muted">
                  <span className="flex items-center gap-2">
                    {start + i + 1}
                    <StatusDot id={w.id} />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <Link to={`/word/${w.id}`} lang="ja" className="font-jp text-lg font-semibold hover:text-ai">
                    {w.word}
                  </Link>
                </td>
                <td lang="ja" className="py-3 pr-4 font-jp whitespace-nowrap">
                  {w.reading || <span className="font-sans text-sm text-muted">{tr('lesson.chuaCo')}</span>}
                </td>
                {showHanViet && (
                  <td className="py-3 pr-4">
                    <HanViet text={w.hanViet} />
                  </td>
                )}
                <td className="py-3 pr-4">
                  {w.meaning}
                  <Extras item={w} />
                </td>
                <td className="py-2 pr-4">
                  <span className="flex items-center justify-end gap-1">
                    <BookmarkButton itemRef={w.id} label={w.word} size="sm" />
                    <SpeakButton text={speechText(w)} size="sm" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Stagger as="ol" className="space-y-2 md:hidden">
        {items.map((w, i) => (
          <StaggerItem as="li" key={w.id} className="relative flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="w-7 shrink-0 pt-1 text-xs tabular-nums text-muted">{start + i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                {/* Cả thẻ là vùng chạm mở từ (::after phủ thẻ); nút nghe / lưu nằm trên. */}
                <Link to={`/word/${w.id}`} lang="ja" className="font-jp text-lg font-semibold after:absolute after:inset-0 after:rounded-xl after:content-['']">
                  {w.word}
                </Link>
                {w.reading && w.reading !== w.word && (
                  <span lang="ja" className="font-jp text-sm text-muted">
                    {w.reading}
                  </span>
                )}
                <StatusDot id={w.id} />
              </span>
              <HanViet text={w.hanViet} className="mt-0.5" />
              <span className="mt-1 block">{w.meaning}</span>
              <Extras item={w} />
            </span>
            <span className="relative z-10 flex shrink-0 flex-col items-center gap-1">
              <SpeakButton text={speechText(w)} size="sm" />
              <BookmarkButton itemRef={w.id} label={w.word} size="sm" />
            </span>
          </StaggerItem>
        ))}
      </Stagger>
    </>
  )
}

function LessonBody({ deck, items }: { deck: Deck & { kind: 'vocab' }; items: VocabItem[] }) {
  const { lesson = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const size = useLessonSize()
  const lessons = useMemo(() => splitLessons(items, size), [items, size])
  const weakMode = lesson === 'weak'
  const index = weakMode ? -1 : Number(lesson) - 1
  const tab = (TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'list') as Tab

  const list = useMemo(() => (weakMode ? items.filter((w) => w.weak) : (lessons[index] ?? [])), [weakMode, items, lessons, index])
  if (!weakMode && (!Number.isInteger(index) || index < 0 || index >= lessons.length)) return <NotFound />
  if (list.length === 0) return <NotFound />

  const base = deckPath(deck)
  const title = weakMode ? tr('lesson.tuChuaThuoc') : tr('common.bai', { v: index + 1 })
  const start = weakMode ? 0 : index * size
  const back: SessionLink = { to: base, label: tr('lesson.ve', { deckTitle: deckTitle(deck) }) }
  const nextLesson: SessionLink | undefined =
    !weakMode && index + 1 < lessons.length ? { to: `${base}/${index + 2}?tab=${tab}`, label: tr('common.baiTiepTheoBai', { v: index + 2 }) } : undefined

  return (
    <div className={LESSON_PAGE} data-lesson-page>
      <PageHeader title={title} back={{ to: base, label: deckTitle(deck) }}>
        <span className="text-sm text-muted">
          {weakMode ? tr('lesson.tu', { length: list.length }) : tr('lesson.tuTu', { v: start + 1, v2: start + list.length, length: list.length })}
        </span>
      </PageHeader>

      <div className="mb-6">
        <Segmented
          label={tr('common.cheDoHoc')}
          value={tab}
          onChange={(t) => setParams(t === 'list' ? {} : { tab: t }, { replace: true })}
          options={TABS}
        />
      </div>

      <div className={TAB_AREA} data-tab-area>
      {tab === 'list' && (
        <>
          <WordList items={list} start={start} />
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink
              to={`?tab=flashcards`}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90"
            >{tr('lesson.hocBangFlashcard')}</ButtonLink>
            {nextLesson && (
              <ButtonLink
                to={`${base}/${index + 2}`}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-ai px-5 font-semibold text-ai hover:bg-ai-soft"
              >{tr('lesson.baiTiepTheo')}</ButtonLink>
            )}
          </div>
        </>
      )}
      {tab === 'flashcards' && (
        <div className="mx-auto w-full max-w-[560px] lg:max-w-none">
          <FlashcardSession key={`${lesson}-${size}`} items={list} back={back} next={nextLesson} />
        </div>
      )}
      {tab === 'quiz' && (
        <div className="mx-auto w-full max-w-[560px] lg:max-w-none">
          <QuizSession key={`${lesson}-${size}`} items={list} pool={items} back={back} next={nextLesson} />
        </div>
      )}
      </div>
    </div>
  )
}

export function Lesson() {
  const deck = useDeck()
  const vocab = useVocab(deck ?? { kind: 'vocab', key: 'n5' })
  if (!deck || deck.kind !== 'vocab') return <NotFound />
  return (
    <Loaded state={vocab} skeleton={<PageSkeleton header rows={8} />}>
      {(items) => <LessonBody deck={deck} items={items} />}
    </Loaded>
  )
}

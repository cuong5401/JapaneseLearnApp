import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Loaded, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { ButtonLink } from '../components/Pressable'
import { Segmented } from '../components/Segmented'
import { SpeakButton } from '../components/SpeakButton'
import { Stagger, StaggerItem } from '../components/Stagger'
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

type Tab = 'list' | 'flashcards' | 'quiz'
const TABS: { value: Tab; label: string }[] = [
  { value: 'list', label: 'Danh sách' },
  { value: 'flashcards', label: 'Flashcard' },
  { value: 'quiz', label: 'Quiz' },
]

function StatusDot({ id }: { id: string }) {
  const card = useCards()[id]
  if (!card) return <span className="sr-only">Chưa học</span>
  const mastered = isMastered(card)
  return (
    <span
      title={mastered ? 'Đã thuộc' : 'Đã học'}
      className={`inline-block size-2.5 shrink-0 rounded-full ${mastered ? 'bg-ai' : 'bg-cell-line'}`}
    >
      <span className="sr-only">{mastered ? 'Đã thuộc' : 'Đã học'}</span>
    </span>
  )
}

function Extras({ item }: { item: VocabItem }) {
  const bits = [
    item.pos,
    item.alt?.length ? `Cách viết khác: ${item.alt.join('、')}` : '',
    item.origin ? `Gốc tiếng Anh: ${item.origin}` : '',
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
          <Link to={`/word/${item.id}`} className="font-medium text-ai hover:underline">
            {item.parent ? 'Xem từ chính' : `${item.related!.length} từ liên quan`}
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
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-left">
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              <th scope="col" className="w-20 py-3 pl-4 font-medium">
                #
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">
                Chữ
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">
                Cách đọc
              </th>
              {showHanViet && (
                <th scope="col" className="py-3 pr-4 font-medium whitespace-nowrap">
                  Hán Việt
                </th>
              )}
              <th scope="col" className="py-3 pr-4 font-medium">
                Nghĩa
              </th>
              <th scope="col" className="w-14 py-3 pr-4">
                <span className="sr-only">Nghe</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((w, i) => (
              <tr key={w.id} className="align-top">
                <td className="py-3 pr-3 pl-4 text-sm tabular-nums text-muted">
                  <span className="flex items-center gap-2 pt-1">
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
                  {w.reading || <span className="font-sans text-sm text-muted">Chưa có</span>}
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
                  <SpeakButton text={speechText(w)} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Stagger as="ol" className="space-y-2 md:hidden">
        {items.map((w, i) => (
          <StaggerItem as="li" key={w.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="w-7 shrink-0 pt-1 text-xs tabular-nums text-muted">{start + i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <Link to={`/word/${w.id}`} lang="ja" className="font-jp text-lg font-semibold">
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
            <SpeakButton text={speechText(w)} size="sm" />
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
  const title = weakMode ? 'Từ chưa thuộc' : `Bài ${index + 1}`
  const start = weakMode ? 0 : index * size
  const back: SessionLink = { to: base, label: `Về ${deckTitle(deck)}` }
  const nextLesson: SessionLink | undefined =
    !weakMode && index + 1 < lessons.length ? { to: `${base}/${index + 2}?tab=${tab}`, label: `Bài tiếp theo: Bài ${index + 2}` } : undefined

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader title={title} back={{ to: base, label: deckTitle(deck) }}>
        <span className="text-sm text-muted">
          {weakMode ? `${list.length} từ` : `Từ ${start + 1}–${start + list.length}, ${list.length} từ`}
        </span>
      </PageHeader>

      <div className="mb-6">
        <Segmented
          label="Chế độ học"
          value={tab}
          onChange={(t) => setParams(t === 'list' ? {} : { tab: t }, { replace: true })}
          options={TABS}
        />
      </div>

      {tab === 'list' && (
        <>
          <WordList items={list} start={start} />
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink
              to={`?tab=flashcards`}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90"
            >
              Học bằng flashcard
            </ButtonLink>
            {nextLesson && (
              <ButtonLink
                to={`${base}/${index + 2}`}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-ai px-5 font-semibold text-ai hover:bg-ai-soft"
              >
                Bài tiếp theo
              </ButtonLink>
            )}
          </div>
        </>
      )}
      {tab === 'flashcards' && (
        <div className="mx-auto max-w-[560px] lg:max-w-none">
          <FlashcardSession key={`${lesson}-${size}`} items={list} back={back} next={nextLesson} />
        </div>
      )}
      {tab === 'quiz' && (
        <div className="mx-auto max-w-[560px] lg:max-w-none">
          <QuizSession key={`${lesson}-${size}`} items={list} pool={items} back={back} next={nextLesson} />
        </div>
      )}
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

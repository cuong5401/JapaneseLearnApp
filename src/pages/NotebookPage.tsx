import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { GridCell } from '../components/GridCell'
import { LessonGrid } from '../components/LessonGrid'
import { LoadError, PageSkeleton } from '../components/LoadState'
import { Button } from '../components/Pressable'
import { Segmented } from '../components/Segmented'
import { LESSON_PAGE, STUDY_PAGE, TAB_AREA } from '../components/StudyLayout'
import { BookColor } from '../components/notebook/BookColor'
import { ChoiceQuiz, type ChoiceQuizConfig } from '../components/study/ChoiceQuiz'
import { FlashcardSession, type SessionLink } from '../components/study/FlashcardSession'
import { entryFaces, entryLabel, sampleWordIds, type EntryCard } from '../components/study/faces'
import { useEntries, useKanjiIndex } from '../hooks/useData'
import { useDetailStack } from '../hooks/useDetailStack'
import { useCards } from '../hooks/useProgress'
import { splitLessons } from '../lib/lessons'
import { notebooks, useNotebooks, type SavedExample } from '../lib/notebooks'
import { progress } from '../lib/progress'
import { hasJapanese, normalizeKana, normalizeVi } from '../lib/search'
import { useLessonSize } from '../lib/settings'
import { showToast } from '../lib/toast'
import { CounterFront } from '../components/study/counterFaces'
import { acceptedReadings, isFullCounter, readingsOf } from '../lib/counters'
import type { CounterFormKey, CounterItem, KanjiEntry, StudyEntry } from '../types'
import { WritingSheetLink } from '../components/writing/WritingSheetLink'
import { NotFound } from './NotFound'
import { t } from '../i18n'

type Kind = StudyEntry['kind']
type Filter = 'all' | Kind
type Mode = 'list' | 'flashcards' | 'quiz'

const KIND_LABEL: Record<Kind, string> = { get word() {
    return t('common.tuVung')
  }, kanji: 'Kanji', get radical() {
    return t('common.boThu')
  }, get grammar() {
    return t('common.nguPhap2')
  }, get counter() {
    return t('common.cachDem')
  }, get char() {
    return t('notebookPage.chuKhac')
  } }
const KIND_ORDER: Kind[] = ['word', 'kanji', 'radical', 'grammar', 'counter', 'char']
const MODES: { value: Mode; label: string }[] = [
  { value: 'list', get label() {
    return t('common.danhSach')
  } },
  { value: 'flashcards', get label() {
    return t('common.flashcard')
  } },
  { value: 'quiz', get label() {
    return t('common.quiz')
  } },
]

/** Câu hỏi quiz theo loại: từ → nghĩa, kanji → âm Hán Việt, bộ thủ → tên, ngữ pháp → ý nghĩa. */
const QUIZ: ChoiceQuizConfig<EntryCard> = {
  get title() {
    return t('notebookPage.quizSoTay')
  },
  prompt: ({ entry }) =>
    entry.kind === 'word'
      ? t('notebookPage.tuNayNghiaLa')
      : entry.kind === 'kanji'
        ? t('notebookPage.amHanVietCua')
        : entry.kind === 'radical'
          ? t('notebookPage.boNayTenLa')
          : entry.kind === 'counter'
            ? t('notebookPage.docTheNao')
            : t('notebookPage.mauNayNghiaLa'),
  question: ({ entry }) =>
    entry.kind === 'counter' ? (
      <CounterFront item={entry.item} n={entry.n} />
    ) : entry.kind === 'word' ? (
      <p lang="ja" className="text-center font-jp text-[clamp(2rem,12cqw,3.25rem)] font-bold break-words">
        {entry.item.word}
      </p>
    ) : entry.kind === 'grammar' ? (
      <p lang="ja" className="text-center font-jp text-[clamp(1.5rem,8cqw,2.25rem)] font-bold break-words">
        {entry.item.title}
      </p>
    ) : (
      <GridCell className="w-[clamp(7rem,40cqw,10rem)]">{entry.kind === 'kanji' ? entry.item.kanji : entry.kind === 'radical' ? entry.item.radical : entry.item.char}</GridCell>
    ),
  answer: ({ entry }) =>
    entry.kind === 'counter'
      ? counterAnswer(entry.item, entry.n)
      : entry.kind === 'word'
        ? entry.item.meaning
        : entry.kind === 'kanji'
          ? entry.item.hanViet
          : entry.kind === 'radical'
            ? entry.item.name
            : entry.kind === 'grammar'
              ? (entry.item.meaning ?? '')
              : '',
  alsoRight: ({ entry }) => (entry.kind === 'kanji' ? (entry.item.hanVietAlt ?? []) : entry.kind === 'counter' && entry.n ? [...counterAccepted(entry.item, entry.n)] : []),
  group: ({ entry }) => entry.kind,
}

/** Đáp án quiz sổ tay cho trợ số từ: cách đọc của ô (ct-hon-3) hoặc của chính trợ số từ (ct-hon). */
function counterAnswer(item: CounterItem, n?: CounterFormKey): string {
  if (n && isFullCounter(item)) return readingsOf(item.forms[n] ?? '')[0] ?? ''
  return item.reading
}
const counterAccepted = (item: CounterItem, n: CounterFormKey) => (isFullCounter(item) ? acceptedReadings(item, n) : new Set<string>())

function searchKeys(e: StudyEntry): { ja: string[]; vi: string[] } {
  if (e.kind === 'counter') return { ja: [e.item.counter, normalizeKana(e.item.reading)], vi: [normalizeVi(`${e.item.usage} ${e.item.group}`)] }
  if (e.kind === 'word') return { ja: [e.item.word, normalizeKana(e.item.reading || '')], vi: [normalizeVi(e.item.meaning), normalizeVi(e.item.hanViet ?? '')] }
  if (e.kind === 'kanji') return { ja: [e.item.kanji], vi: [normalizeVi(e.item.hanViet)] }
  if (e.kind === 'radical') return { ja: [e.item.radical], vi: [normalizeVi(`${e.item.name} ${e.item.meaning}`)] }
  if (e.kind === 'char') return { ja: [e.item.char], vi: [] }
  return { ja: [normalizeKana(e.item.title)], vi: [normalizeVi(`${e.item.title} ${e.item.meaning ?? ''}`)] }
}

function EntryRow({ card, onOpen, onRemove, examples }: { card: EntryCard; onOpen: () => void; onRemove: () => void; examples?: SavedExample[] }) {
  const { entry } = card
  const learned = Boolean(useCards()[card.id])
  const glyph =
    entry.kind === 'kanji'
      ? entry.item.kanji
      : entry.kind === 'radical'
        ? entry.item.radical
        : entry.kind === 'char'
          ? entry.item.char
          : entry.kind === 'counter'
            ? entry.item.counter
            : null
  const head = entry.kind === 'word' ? entry.item.word : entry.kind === 'grammar' ? entry.item.title : ''
  const sub =
    entry.kind === 'counter'
      ? `${entry.item.reading}: ${entry.item.usage}`
      : entry.kind === 'word'
        ? entry.item.meaning
        : entry.kind === 'kanji'
          ? entry.item.hanViet
          : entry.kind === 'radical'
            ? t('notebookPage.bo', { name: entry.item.name, meaning: entry.item.meaning })
            : entry.kind === 'char'
              ? t('notebookPage.chuaCoTrongDanh')
              : (entry.item.meaning ?? t('notebookPage.moDeXemGiai'))
  const content = (
    <>
      {glyph ? (
        <GridCell className="size-11 shrink-0">{glyph}</GridCell>
      ) : (
        <span lang="ja" className="max-w-[45%] shrink-0 truncate font-jp text-lg font-semibold">
          {head}
        </span>
      )}
      <span className="min-w-0 flex-1">
        {entry.kind === 'word' && entry.item.reading !== entry.item.word && (
          <span lang="ja" className="block truncate font-jp text-sm text-muted">
            {entry.item.reading}
          </span>
        )}
        <span className="line-clamp-2 block text-sm">{sub}</span>
      </span>
      {learned && <span className="size-2.5 shrink-0 rounded-full bg-matsu" title={t('common.daHoc')} />}
    </>
  )
  return (
    <li className="flex flex-wrap items-center gap-1" data-notebook-item={card.id}>
      {entry.kind === 'grammar' ? (
        <Link to={`/grammar/${entry.item.level.toLowerCase()}/${entry.item.id}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 hover:bg-sunken">
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onOpen} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-sunken">
          {content}
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('notebookPage.goKhoiSo2', { entryLabel: entryLabel(entry) })}
        title={t('notebookPage.goKhoiSo')}
        className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-beni-soft hover:text-beni"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      {/* Câu ví dụ đã lưu kèm từ này (từ khối "Ví dụ" của chi tiết từ). */}
      {examples && examples.length > 0 && (
        <ul className="basis-full space-y-1.5 pr-12 pb-2 pl-3" data-saved-examples>
          {examples.map((ex) => (
            <li key={ex.ja} className="border-l-2 border-cell-line pl-3 text-sm">
              <span lang="ja" className="block font-jp">
                {ex.ja}
              </span>
              <span className="block text-muted">
                {ex.tr}
                {ex.src === 'ai' && <span className="ml-1.5 text-xs">{t('notebookPage.aiTao')}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function NotebookFlashcards({ cards, back, next }: { cards: EntryCard[]; back: SessionLink; next?: SessionLink }) {
  const kanji = useMemo(() => cards.flatMap((c) => (c.entry.kind === 'kanji' ? [c.entry.item] : [])), [cards])
  const words = useEntries(useMemo(() => sampleWordIds(kanji), [kanji]))
  const index = useKanjiIndex()
  const needIndex = cards.some((c) => c.entry.kind === 'radical')
  const byChar = useMemo(() => new Map<string, KanjiEntry>((index.data ?? []).map((k) => [k.kanji, k])), [index.data])
  const faces = useMemo(() => entryFaces(words.entries, byChar), [words.entries, byChar])
  if (words.status === 'error') return <LoadError error={words.error} onRetry={words.retry} />
  if (words.status !== 'ready' || (needIndex && !index.data)) return <PageSkeleton rows={4} />
  return <FlashcardSession items={cards} faces={faces} label={(c) => entryLabel(c.entry)} back={back} next={next} />
}

export function NotebookPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const state = useNotebooks()
  const book = state.books.find((b) => b.id === id)
  const refs = useMemo(() => (state.items[id] ?? []).map((it) => it.ref), [state.items, id])
  const { status, entries, error, retry } = useEntries(refs)
  const examplesOf = (ref: string) => (state.items[id] ?? []).find((it) => it.ref === ref)?.examples
  const stack = useDetailStack()
  const size = useLessonSize()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const cards = useMemo<EntryCard[]>(() => refs.flatMap((r) => (entries.get(r) ? [{ id: r, entry: entries.get(r)! }] : [])), [refs, entries])
  const missing = status === 'ready' ? refs.filter((r) => !entries.has(r)) : []
  const lessons = useMemo(() => splitLessons(cards, size), [cards, size])

  const bai = Number(params.get('bai'))
  const lessonIndex = Number.isInteger(bai) && bai >= 1 ? bai - 1 : null
  const mode = (MODES.some((m) => m.value === params.get('mode')) ? params.get('mode') : 'list') as Mode

  const shown = useMemo(() => {
    const q = query.trim()
    const ja = hasJapanese(q) ? normalizeKana(q) : ''
    const vi = q && !ja ? normalizeVi(q) : ''
    return cards.filter((c) => {
      if (filter !== 'all' && c.entry.kind !== filter) return false
      if (!q) return true
      const keys = searchKeys(c.entry)
      return ja ? keys.ja.some((k) => k.includes(ja) || k.includes(q)) : keys.vi.some((k) => k.includes(vi))
    })
  }, [cards, filter, query])

  if (!book) return <NotFound />

  const base = `/notebooks/${book.id}`
  const header = (
    <div className="mb-6">
      <Link to={lessonIndex === null ? '/notebooks' : base} className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted hover:text-ink">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
        {lessonIndex === null ? t('common.soTay') : book.name}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <BookColor color={book.color} className="size-5" />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{lessonIndex === null ? book.name : t('common.bai', { v: lessonIndex + 1 })}</h1>
        <span className="text-sm text-muted">{lessonIndex === null ? t('notebookPage.muc2', { length: refs.length }) : book.name}</span>
        {lessonIndex === null && refs.length > 0 && <WritingSheetLink to={`/writing?src=notebook&id=${encodeURIComponent(book.id)}`} className="sm:ml-auto" />}
      </div>
    </div>
  )

  if (status === 'error') return <LoadError error={error} onRetry={retry} />
  if (status !== 'ready') return <PageSkeleton header rows={6} />

  const open = (c: EntryCard) => {
    const e = c.entry
    if (e.kind === 'word') stack.open({ t: 'w', id: c.id })
    else if (e.kind === 'kanji') stack.open({ t: 'k', ch: e.item.kanji })
    else if (e.kind === 'radical') stack.open({ t: 'r', no: e.item.no })
    else if (e.kind === 'char') stack.open({ t: 'k', ch: e.item.char })
    else if (e.kind === 'counter') stack.open({ t: 'c', id: e.item.id })
  }
  const remove = (ref: string) => notebooks.removeItem(book.id, ref)

  if (lessonIndex !== null) {
    const lesson = lessons[lessonIndex]
    if (!lesson) return <NotFound />
    const back: SessionLink = { to: base, label: t('notebookPage.ve', { name: book.name }) }
    const next: SessionLink | undefined =
      lessonIndex + 1 < lessons.length ? { to: `${base}?bai=${lessonIndex + 2}${mode !== 'list' ? `&mode=${mode}` : ''}`, label: t('common.baiTiepTheoBai', { v: lessonIndex + 2 }) } : undefined
    const quizItems = lesson.filter((c) => QUIZ.answer(c))
    const quizPool = cards.filter((c) => QUIZ.answer(c))
    return (
      <div className={LESSON_PAGE} data-lesson-page>
        {header}
        <div className="mb-6">
          <Segmented label={t('common.cheDoHoc')} value={mode} onChange={(m) => setParams(m === 'list' ? { bai: String(lessonIndex + 1) } : { bai: String(lessonIndex + 1), mode: m }, { replace: true })} options={MODES} />
        </div>
        <div className={TAB_AREA} data-tab-area>
        {mode === 'list' && (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface p-1">
            {lesson.map((c) => (
              <EntryRow key={c.id} card={c} examples={examplesOf(c.id)} onOpen={() => open(c)} onRemove={() => remove(c.id)} />
            ))}
          </ul>
        )}
        {mode === 'flashcards' && (
          <div className={STUDY_PAGE}>
            <NotebookFlashcards key={`${lessonIndex}-${size}`} cards={lesson} back={back} next={next} />
          </div>
        )}
        {mode === 'quiz' && (
          <div className={STUDY_PAGE}>
            <ChoiceQuiz key={`${lessonIndex}-${size}`} items={quizItems} pool={quizPool} config={QUIZ} />
          </div>
        )}
        </div>
      </div>
    )
  }

  const counts = KIND_ORDER.map((k) => ({ k, n: cards.filter((c) => c.entry.kind === k).length })).filter((x) => x.n > 0)
  const groups = KIND_ORDER.map((k) => ({ k, items: shown.filter((c) => c.entry.kind === k) })).filter((g) => g.items.length > 0)

  const addAllToSrs = () => {
    // Chữ ngoài kanji.json không có dữ liệu để ôn. Thẻ Mới chờ ở trang Ôn tập theo giới hạn thẻ mới mỗi ngày.
    const added = progress.addNew(cards.filter((c) => c.entry.kind !== 'char').map((c) => c.id))
    showToast(added ? t('notebookPage.daThemTheMoi', { added }) : t('notebookPage.moiMucDaCo'))
  }

  return (
    <div className="mx-auto max-w-[880px]">
      {header}
      {refs.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-semibold">{t('notebookPage.soChuaCoMuc')}</p>
          <p className="mt-1 text-sm text-muted">{t('notebookPage.bamBieuTuongDanh')}</p>
        </div>
      ) : (
        <>
          <LessonGrid
            items={cards}
            unit={t('notebookPage.muc')}
            title={book.name}
            href={(i) => `${base}?bai=${i + 1}`}
            preview={(l) => l.slice(0, 4).map((c) => entryLabel(c.entry)).join('、')}
            links={
              <Button onClick={addAllToSrs} className="min-h-11 rounded-lg border border-ai px-4 text-sm font-semibold text-ai hover:bg-ai-soft">{t('notebookPage.themCaSoVao')}</Button>
            }
          />

          <section className="mt-10">
            <h2 className="text-xl font-bold tracking-tight">{t('notebookPage.cacMucTrongSo')}</h2>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="block flex-1">
                <span className="sr-only">{t('notebookPage.timTrongSo')}</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('notebookPage.timTrongSoChu')}
                  className="h-11 w-full rounded-xl border-2 border-line bg-surface px-4 outline-none focus:border-ai"
                />
              </label>
              {counts.length > 1 && (
                <Segmented
                  size="sm"
                  label={t('notebookPage.locTheoLoai')}
                  value={filter}
                  onChange={setFilter}
                  options={[{ value: 'all' as Filter, label: t('common.tatCa') }, ...counts.map(({ k, n }) => ({ value: k as Filter, label: `${KIND_LABEL[k]} (${n})` }))]}
                />
              )}
            </div>
            {groups.length === 0 && <p className="mt-6 text-muted">{t('notebookPage.khongCoMucNao')}</p>}
            {groups.map((g) => (
              <div key={g.k} className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-muted">
                  {KIND_LABEL[g.k]} ({g.items.length})
                </h3>
                <ul className="divide-y divide-line rounded-2xl border border-line bg-surface p-1">
                  {g.items.map((c) => (
                    <EntryRow key={c.id} card={c} examples={examplesOf(c.id)} onOpen={() => open(c)} onRemove={() => remove(c.id)} />
                  ))}
                </ul>
              </div>
            ))}
            {missing.length > 0 && (
              <div className="mt-6 rounded-xl border border-kihada bg-kihada-soft p-4 text-sm">
                <p className="font-semibold">{t('notebookPage.mucKhongConTrong', { length: missing.length })}</p>
                <p className="mt-0.5 text-muted">{t('notebookPage.duLieuDaThay')}</p>
                <button type="button" onClick={() => missing.forEach(remove)} className="mt-2 min-h-11 rounded-lg border border-ink/20 px-3 font-medium hover:bg-surface">{t('notebookPage.goCacMucNay')}</button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

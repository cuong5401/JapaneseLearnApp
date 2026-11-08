import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet'
import { GridCell } from '../components/GridCell'
import { LessonGrid } from '../components/LessonGrid'
import { LoadError, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { searchUi } from '../lib/searchUi'
import { Button } from '../components/Pressable'
import { Segmented } from '../components/Segmented'
import { Stagger, StaggerItem } from '../components/Stagger'
import { DetailStackView } from '../components/detail/DetailStack'
import { BookmarkButton, BookmarkIcon } from '../components/notebook/BookmarkButton'
import { ChoiceQuiz, type ChoiceQuizConfig } from '../components/study/ChoiceQuiz'
import { FlashcardSession, type SessionLink } from '../components/study/FlashcardSession'
import { KanjiQuiz } from '../components/study/KanjiQuiz'
import { kanjiFaces, radicalFaces, sampleWordIds } from '../components/study/faces'
import { STUDY_PAGE } from '../components/StudyLayout'
import { kanjiOfRadical } from '../data/radicalKanji'
import { useEntries, useKanjiIndex, useRadicals } from '../hooks/useData'
import { useDetailStack } from '../hooks/useDetailStack'
import { WIDE_PANEL, useMediaQuery } from '../hooks/useMediaQuery'
import { useCards } from '../hooks/useProgress'
import { useScrollMemory } from '../hooks/useScrollMemory'
import type { Frame } from '../lib/detailStack'
import { splitLessons } from '../lib/lessons'
import { isSaved, useNotebooks } from '../lib/notebooks'
import { normalizeVi } from '../lib/search'
import { useLessonSize } from '../lib/settings'
import { LEVELS, type KanjiEntry, type RadicalItem } from '../types'

type Section = 'chars' | 'radicals'
type Mode = 'list' | 'flashcards' | 'quiz'
type LevelFilter = 'all' | (typeof LEVELS)[number] | 'none'

const LEVEL_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  ...LEVELS.map((l) => ({ value: l, label: `Từ ${l}` })),
  { value: 'none', label: 'Chỉ trong từ ghép' },
]

const MODES: { value: Mode; label: string }[] = [
  { value: 'list', label: 'Danh sách' },
  { value: 'flashcards', label: 'Flashcard' },
  { value: 'quiz', label: 'Quiz' },
]

/** Âm Hán Việt dài thì khít chữ lại để luôn nằm trên 1 dòng. */
function hanVietSpacing(text: string): string {
  const len = [...text].length
  if (len >= 7) return '-0.04em'
  if (len >= 6) return '-0.02em'
  if (len <= 3) return '0.06em'
  return '0.02em'
}

/** Đường dẫn trang Kanji giữ các tham số hiện tại, ghi đè một số. */
function kanjiHref(params: URLSearchParams, set: Record<string, string | null>): string {
  const p = new URLSearchParams(params)
  for (const key of ['k', 'c', 'xem']) p.delete(key)
  for (const [k, v] of Object.entries(set)) {
    if (v === null) p.delete(k)
    else p.set(k, v)
  }
  const s = p.toString()
  return s ? `/kanji?${s}` : '/kanji'
}

function filterByLevel(list: KanjiEntry[], level: LevelFilter) {
  const out = level === 'all' ? list : list.filter((k) => (level === 'none' ? k.firstLevel === null : k.firstLevel === level))
  return [...out].sort((a, b) => b.wordCount - a.wordCount)
}

/* ───────────── Lưới chữ của một bài ───────────── */

function CharGrid({ chars, active, onPick }: { chars: KanjiEntry[]; active?: string; onPick: (k: KanjiEntry) => void }) {
  const cards = useCards()
  const books = useNotebooks()
  return (
    <Stagger as="ul" step={0.012} className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5 sm:gap-3">
      {chars.map((k) => {
        const on = active === k.kanji
        return (
          <StaggerItem as="li" key={k.id} className="min-w-0">
            <Button
              onClick={() => onPick(k)}
              whileHover={{ y: -3 }}
              aria-label={`${k.kanji}, ${k.hanViet}${cards[k.id] ? ', đã học' : ''}`}
              aria-pressed={on}
              data-kanji-cell={k.kanji}
              className={`@container relative flex w-full flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors sm:p-2.5 ${
                on ? 'border-ai bg-ai-soft' : 'border-line bg-surface hover:border-ai'
              }`}
            >
              <GridCell className="w-full max-w-28">{k.kanji}</GridCell>
              <span
                className="block max-w-full overflow-hidden text-[clamp(11px,14cqw,15px)] font-semibold text-ellipsis whitespace-nowrap"
                style={{ letterSpacing: hanVietSpacing(k.hanViet) }}
              >
                {k.hanViet}
              </span>
              {cards[k.id] && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-matsu" aria-hidden />}
              {isSaved(books, k.id) && (
                <span className="absolute top-1.5 left-1.5 text-kihada" aria-hidden>
                  <BookmarkIcon filled className="size-3.5" />
                </span>
              )}
            </Button>
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}

/* ───────────── Bộ thủ ───────────── */

function RadicalCard({ r, onOpen }: { r: RadicalItem; onOpen: (r: RadicalItem) => void }) {
  const count = kanjiOfRadical(r.no).length
  const learned = Boolean(useCards()[r.id])
  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 pr-11 transition-colors hover:border-ai" data-radical-card={r.no}>
      <button type="button" onClick={() => onOpen(r)} aria-label={`Bộ ${r.radical}, ${r.name}`} className="absolute inset-0 rounded-xl" />
      <GridCell className="size-14">{r.radical}</GridCell>
      <span className="pointer-events-none min-w-0">
        <span className="block text-xs tabular-nums text-muted">
          Bộ {r.no}
          {count > 0 && ` · ${count} chữ`}
        </span>
        <span className="block truncate font-semibold capitalize">{r.name}</span>
        <span className="block text-sm leading-snug text-muted">{r.meaning}</span>
      </span>
      {learned && <span className="absolute right-2 bottom-2 size-2.5 rounded-full bg-matsu" aria-hidden />}
      <span className="absolute top-1 right-1">
        <BookmarkButton itemRef={r.id} label={`bộ ${r.name}`} size="sm" />
      </span>
    </div>
  )
}

function RadicalList({ items, onOpen }: { items: RadicalItem[]; onOpen: (r: RadicalItem) => void }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5">
      {items.map((r) => (
        <li key={r.no}>
          <RadicalCard r={r} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}

const RADICAL_QUIZ: ChoiceQuizConfig<RadicalItem> = {
  title: 'Quiz bộ thủ',
  prompt: () => 'Bộ này tên là gì?',
  question: (r) => <GridCell className="w-[clamp(7rem,40cqw,10rem)]">{r.radical}</GridCell>,
  answer: (r) => r.name,
  note: (r) => `(${r.meaning})`,
  shortcut: 'Chọn tên bộ',
}

function RadicalFlashcards({ items, back, next }: { items: RadicalItem[]; back: SessionLink; next?: SessionLink }) {
  const index = useKanjiIndex()
  const byChar = useMemo(() => new Map((index.data ?? []).map((k) => [k.kanji, k])), [index.data])
  const faces = useMemo(() => radicalFaces(byChar), [byChar])
  if (index.status === 'error') return <LoadError error={index.error} onRetry={index.retry} />
  if (!index.data) return <PageSkeleton rows={4} />
  return <FlashcardSession items={items} faces={faces} label={(r) => `bộ ${r.radical} ${r.name}`} back={back} next={next} />
}

/* ───────────── Bài học (chữ Hán / bộ thủ) ───────────── */

function LessonHeader({ title, subtitle, backHref, mode, onMode }: { title: string; subtitle: string; backHref: string; mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div className="mb-6">
      <Link to={backHref} className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted hover:text-ink">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
        Các bài
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <span className="text-sm text-muted">{subtitle}</span>
      </div>
      <div className="mt-4">
        <Segmented label="Chế độ học" value={mode} onChange={onMode} options={MODES} />
      </div>
    </div>
  )
}

function KanjiFlashcards({ chars, back, next }: { chars: KanjiEntry[]; back: SessionLink; next?: SessionLink }) {
  const ids = useMemo(() => sampleWordIds(chars), [chars])
  const words = useEntries(ids)
  const faces = useMemo(() => kanjiFaces(words.entries), [words.entries])
  if (words.status === 'error') return <LoadError error={words.error} onRetry={words.retry} />
  if (words.status !== 'ready') return <PageSkeleton rows={4} />
  return <FlashcardSession items={chars} faces={faces} label={(k) => `chữ ${k.kanji}`} back={back} next={next} />
}

/* ───────────── Trang ───────────── */

export function Kanji() {
  const [params, setParams] = useSearchParams()
  const section: Section = params.get('tab') === 'radicals' ? 'radicals' : 'chars'
  const level = (LEVEL_OPTIONS.some((o) => o.value === params.get('level')) ? params.get('level') : 'all') as LevelFilter
  const bai = Number(params.get('bai'))
  const lessonIndex = Number.isInteger(bai) && bai >= 1 ? bai - 1 : null
  const mode = (MODES.some((m) => m.value === params.get('mode')) ? params.get('mode') : 'list') as Mode
  const [query, setQuery] = useState('')

  const index = useKanjiIndex()
  const radicals = useRadicals()
  const size = useLessonSize()
  const wide = useMediaQuery(WIDE_PANEL)
  const stack = useDetailStack('k')
  useScrollMemory(section === 'chars' ? Boolean(index.data) : Boolean(radicals.data))

  const levelOptions = useMemo(
    () =>
      index.data
        ? LEVEL_OPTIONS.filter((o) => o.value === 'all' || index.data!.some((k) => (o.value === 'none' ? k.firstLevel === null : k.firstLevel === o.value)))
        : LEVEL_OPTIONS,
    [index.data],
  )
  const filtered = useMemo(() => (index.data ? filterByLevel(index.data, level) : []), [index.data, level])
  const charLessons = useMemo(() => splitLessons(filtered, size), [filtered, size])
  const radicalLessons = useMemo(() => splitLessons(radicals.data ?? [], size), [radicals.data, size])

  const setParam = (set: Record<string, string | null>, replace = true) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(set)) {
          if (v === null) p.delete(k)
          else p.set(k, v)
        }
        return p
      },
      { replace },
    )

  // Chọn chữ: desktop thay chữ trong panel (replace), điện thoại mở sheet (push để Back đóng sheet).
  const pickChar = (k: KanjiEntry) => stack.setRoot(k.kanji, wide ? 'replace' : 'push')
  const openRadical = (r: RadicalItem) => stack.push({ t: 'r', no: r.no })

  const levelLabel = LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? ''
  const gridHref = kanjiHref(params, { bai: null, mode: null })
  const lessonHref = (i: number, keepMode = false) => kanjiHref(params, { bai: String(i + 1), mode: keepMode && mode !== 'list' ? mode : null })

  let body: ReactNode
  let defaultFrame: Frame | undefined

  if (section === 'chars') {
    if (index.status === 'error') body = <LoadError error={index.error} onRetry={index.retry} />
    else if (!index.data) body = <PageSkeleton grid rows={12} />
    else if (lessonIndex === null) {
      body = (
        <LessonGrid
          items={filtered}
          unit="chữ"
          title={`Chữ Hán ${levelLabel.toLowerCase()}`}
          href={(i) => lessonHref(i)}
          preview={(l) => l.slice(0, 6).map((k) => k.kanji).join('')}
          links={<span className="text-sm text-muted">"Từ N5" = chữ xuất hiện lần đầu trong từ vựng N5 của bạn, không phải cấp kanji JLPT.</span>}
        />
      )
    } else {
      const chars = charLessons[lessonIndex]
      if (!chars) body = <p className="text-muted">Không có bài này. <Link to={gridHref} className="font-medium text-ai">Về các bài</Link></p>
      else {
        const back: SessionLink = { to: gridHref, label: 'Về các bài' }
        const next: SessionLink | undefined =
          lessonIndex + 1 < charLessons.length ? { to: lessonHref(lessonIndex + 1, true), label: `Bài tiếp theo: Bài ${lessonIndex + 2}` } : undefined
        if (mode === 'list' && wide) defaultFrame = { t: 'k', ch: chars[0].kanji }
        body = (
          <>
            <LessonHeader
              title={`Bài ${lessonIndex + 1}`}
              subtitle={`Chữ Hán · ${levelLabel} · ${chars.length} chữ`}
              backHref={gridHref}
              mode={mode}
              onMode={(m) => setParam({ mode: m === 'list' ? null : m, xem: null })}
            />
            {mode === 'list' && <CharGrid chars={chars} active={stack.root?.t === 'k' ? stack.root.ch : defaultFrame?.t === 'k' ? defaultFrame.ch : undefined} onPick={pickChar} />}
            {mode === 'flashcards' && (
              <div className={STUDY_PAGE}>
                <KanjiFlashcards key={`${lessonIndex}-${size}-${level}`} chars={chars} back={back} next={next} />
              </div>
            )}
            {mode === 'quiz' && (
              <div className={STUDY_PAGE}>
                <KanjiQuiz key={`${lessonIndex}-${size}-${level}`} pool={chars} distractors={filtered} />
              </div>
            )}
          </>
        )
      }
    }
  } else {
    if (radicals.status === 'error') body = <LoadError error={radicals.error} onRetry={radicals.retry} />
    else if (!radicals.data) body = <PageSkeleton grid rows={12} />
    else if (lessonIndex === null) {
      const q = normalizeVi(query)
      const matches = q
        ? radicals.data.filter((r) => r.radical.includes(query.trim()) || normalizeVi(`${r.name} ${r.meaning}`).includes(q) || String(r.no) === q)
        : null
      body = (
        <>
          <label className="mb-4 block max-w-sm">
            <span className="sr-only">Lọc bộ thủ</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bộ theo tên, nghĩa hoặc số"
              className="h-11 w-full rounded-xl border-2 border-line bg-surface px-4 outline-none focus:border-ai"
            />
          </label>
          {matches ? (
            <>
              <p className="mb-3 text-sm text-muted">{matches.length} bộ thủ khớp</p>
              <RadicalList items={matches} onOpen={openRadical} />
            </>
          ) : (
            <LessonGrid
              items={radicals.data}
              unit="bộ"
              title="Bộ thủ"
              href={(i) => lessonHref(i)}
              preview={(l) => l.slice(0, 6).map((r) => r.radical).join('')}
            />
          )}
        </>
      )
    } else {
      const items = radicalLessons[lessonIndex]
      if (!items) body = <p className="text-muted">Không có bài này. <Link to={gridHref} className="font-medium text-ai">Về các bài</Link></p>
      else {
        const back: SessionLink = { to: gridHref, label: 'Về các bài' }
        const next: SessionLink | undefined =
          lessonIndex + 1 < radicalLessons.length ? { to: lessonHref(lessonIndex + 1, true), label: `Bài tiếp theo: Bài ${lessonIndex + 2}` } : undefined
        body = (
          <>
            <LessonHeader
              title={`Bài ${lessonIndex + 1}`}
              subtitle={`Bộ thủ ${items[0].no}–${items[items.length - 1].no}`}
              backHref={gridHref}
              mode={mode}
              onMode={(m) => setParam({ mode: m === 'list' ? null : m, xem: null })}
            />
            {mode === 'list' && <RadicalList items={items} onOpen={openRadical} />}
            {mode === 'flashcards' && (
              <div className={STUDY_PAGE}>
                <RadicalFlashcards key={`${lessonIndex}-${size}`} items={items} back={back} next={next} />
              </div>
            )}
            {mode === 'quiz' && (
              <div className={STUDY_PAGE}>
                <ChoiceQuiz key={`${lessonIndex}-${size}`} items={items} pool={radicals.data} config={RADICAL_QUIZ} />
              </div>
            )}
          </>
        )
      }
    }
  }

  // Ngăn xếp chi tiết: ?k= (chữ gốc) + ?xem=; desktop có chữ mặc định để panel không trống.
  const frames = stack.frames.length ? stack.frames : defaultFrame ? [defaultFrame] : []
  const showPanel = wide && frames.length > 0 && mode === 'list'

  return (
    <div>
      <PageHeader title="Chữ Hán" back={{ to: '/', label: 'Trang chủ' }}>
        <button
          type="button"
          onClick={() => searchUi.open({ draw: true })}
          data-draw-kanji
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 font-semibold hover:border-ai"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
            <path d="m13.5 6.5 4 4" />
          </svg>
          Vẽ chữ
        </button>
      </PageHeader>
      <div className="mb-5 flex flex-col gap-3">
        <Segmented
          label="Mục chữ Hán"
          value={section}
          onChange={(s) => setParams(s === 'radicals' ? { tab: 'radicals' } : level !== 'all' ? { level } : {}, { replace: true })}
          options={[
            { value: 'chars', label: 'Chữ Hán' },
            { value: 'radicals', label: 'Bộ thủ' },
          ]}
        />
        {section === 'chars' && lessonIndex === null && (
          <Segmented size="sm" label="Lọc theo cấp xuất hiện" value={level} onChange={(l) => setParam({ level: l === 'all' ? null : l, bai: null })} options={levelOptions} />
        )}
      </div>

      <div className={showPanel ? 'grid grid-cols-[minmax(0,1fr)_340px] items-start gap-8' : ''}>
        <div className="min-w-0">{body}</div>
        {showPanel && (
          <aside className="sticky top-10 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-5" aria-label="Chi tiết chữ Hán">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={frames.length} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                <DetailStackView frames={frames} onPush={stack.push} onBack={stack.back} />
              </motion.div>
            </AnimatePresence>
          </aside>
        )}
      </div>

      {!showPanel && (
        <BottomSheet open={stack.frames.length > 0} onClose={() => stack.close(true)} label="Chi tiết">
          <DetailStackView frames={stack.frames} onPush={stack.push} onBack={stack.back} />
        </BottomSheet>
      )}
    </div>
  )
}

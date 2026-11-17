import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet'
import { GridCell } from '../components/GridCell'
import { LoadError, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { STUDY_PAGE, TAB_AREA } from '../components/StudyLayout'
import { DetailStackView } from '../components/detail/DetailStack'
import { BookmarkIcon } from '../components/notebook/BookmarkButton'
import { CounterQuiz } from '../components/study/CounterQuiz'
import { FlashcardSession, type FlashcardGrader, type SessionLink } from '../components/study/FlashcardSession'
import { pairFaces } from '../components/study/counterFaces'
import { useCounters } from '../hooks/useData'
import { useDetailStack } from '../hooks/useDetailStack'
import { WIDE_PANEL, useMediaQuery } from '../hooks/useMediaQuery'
import { useOwnPage } from '../hooks/useOwnPage'
import { useCards } from '../hooks/useProgress'
import { useScrollMemory } from '../hooks/useScrollMemory'
import { counterRef, groupCounters, matchCounter, numberLabel, pickPairs, shouldTrack, type CounterPair } from '../lib/counters'
import { isSaved, useNotebooks } from '../lib/notebooks'
import { progress } from '../lib/progress'
import { flashcardGrade } from '../lib/srs'
import { readJSON, writeJSON } from '../lib/storage'
import type { CounterData, CounterEntry, CounterItem, CounterRule, SrsCard } from '../types'
import { LEVELS, type Level } from '../types'

type Mode = 'list' | 'flashcards' | 'quiz'
type LevelFilter = 'all' | Level

const MODES: { value: Mode; label: string }[] = [
  { value: 'list', label: 'Danh sách' },
  { value: 'flashcards', label: 'Flashcard' },
  { value: 'quiz', label: 'Quiz' },
]

/** Số thẻ mỗi phiên flashcard. */
const SESSION = 20

/* ───────────── Quy tắc đếm (thu gọn được) ───────────── */

function Rules({ rules }: { rules: CounterRule[] }) {
  const [open, setOpen] = useState(() => readJSON('counter-rules-open', false))
  const toggle = () => {
    setOpen(!open)
    writeJSON('counter-rules-open', !open)
  }
  return (
    <section aria-labelledby="counter-rules" className="mb-6 rounded-2xl border border-line bg-surface" data-counter-rules>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="counter-rules-body"
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left sm:px-5"
      >
        <span lang="ja" className="grid size-8 shrink-0 place-items-center rounded-[3px] border border-cell-line font-jp text-ai">
          則
        </span>
        <span className="min-w-0 flex-1">
          <span id="counter-rules" className="block font-semibold">
            Quy tắc đếm
          </span>
          {!open && <span className="block truncate text-sm text-muted">{rules.map((r) => r.title).join(' · ')}</span>}
        </span>
        <svg viewBox="0 0 24 24" className={`size-5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ol id="counter-rules-body" className="grid gap-x-8 gap-y-3 border-t border-line px-4 py-4 text-sm sm:px-5 md:grid-cols-2">
          {rules.map((r, i) => (
            <li key={r.title} className="flex gap-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ai-soft text-xs font-bold text-ai">{i + 1}</span>
              <span>
                <span className="block font-semibold">{r.title}</span>
                <span className="block text-muted">{r.text}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ───────────── Danh sách ───────────── */

/** Số ô đã có thẻ ôn của một trợ số từ (ct-hon-…). */
function trackedCells(cards: Record<string, SrsCard>, id: string): number {
  const prefix = `${counterRef(id)}-`
  let n = 0
  for (const k in cards) if (k.startsWith(prefix)) n++
  return n
}

function CounterCard({ c, active, onOpen }: { c: CounterItem; active: boolean; onOpen: (c: CounterItem) => void }) {
  const cards = useCards()
  const books = useNotebooks()
  const tracked = 'forms' in c ? trackedCells(cards, c.id) : 0
  return (
    <button
      type="button"
      onClick={() => onOpen(c)}
      aria-pressed={active}
      aria-label={`${c.counter}, ${c.reading}: ${c.usage}`}
      data-counter-card={c.id}
      className={`relative flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
        active ? 'border-ai bg-ai-soft' : 'border-line bg-surface hover:border-ai'
      }`}
    >
      <GridCell className="size-12">{c.counter}</GridCell>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span lang="ja" className="font-jp font-semibold">
            {c.reading}
          </span>
          <span className="text-xs text-muted">{c.level}</span>
        </span>
        <span className="block truncate text-sm text-muted">{c.usage}</span>
      </span>
      {tracked > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-matsu" title={`${tracked} ô trong lịch ôn`} aria-hidden />}
      {isSaved(books, counterRef(c.id)) && (
        <span className="absolute top-1.5 left-1.5 text-kihada" aria-hidden>
          <BookmarkIcon filled className="size-3.5" />
        </span>
      )}
    </button>
  )
}

function CounterGroups({ items, active, onOpen }: { items: CounterItem[]; active?: string; onOpen: (c: CounterItem) => void }) {
  return (
    <div className="space-y-6">
      {groupCounters(items).map((g) => (
        <section key={g.group} aria-label={g.group}>
          <h3 className="mb-2 text-sm font-semibold text-muted">
            {g.group} <span className="font-normal">({g.items.length})</span>
          </h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {g.items.map((c) => (
              <li key={c.id}>
                <CounterCard c={c} active={active === c.id} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** "Trợ số từ khác": hàng gọn (chữ, cách đọc, cách dùng), không có bảng đầy đủ. */
function MoreList({ items, active, onOpen }: { items: CounterItem[]; active?: string; onOpen: (c: CounterItem) => void }) {
  return (
    <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2" data-counter-more>
      {items.map((c) => (
        <li key={c.id} className="min-w-0 border-b border-line">
          <button
            type="button"
            onClick={() => onOpen(c)}
            aria-pressed={active === c.id}
            data-counter-card={c.id}
            className={`flex min-h-12 w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left ${active === c.id ? 'bg-ai-soft' : 'hover:bg-sunken'}`}
          >
            <span lang="ja" className="w-12 shrink-0 font-jp text-lg font-semibold">
              {c.counter}
            </span>
            <span lang="ja" className="w-16 shrink-0 font-jp text-sm text-muted">
              {c.reading}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{c.usage}</span>
            <span className="shrink-0 text-xs text-muted">{c.level}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function EmptyPanel() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-muted" data-empty-panel>
      <GridCell className="size-20 opacity-40">本</GridCell>
      <p>Chọn một trợ số từ để xem bảng đếm</p>
    </div>
  )
}

/* ───────────── Flashcard ───────────── */

/**
 * Chấm flashcard: chỉ ghi lịch ôn cho cặp sai / ô bất quy tắc / cặp đã có thẻ (xem shouldTrack).
 * Trả về bản trước khi chấm (hoặc "không ghi") để hoàn tác.
 */
function counterGrader(pairs: readonly CounterPair[]): FlashcardGrader {
  const byId = new Map(pairs.map((p) => [p.id, p]))
  return {
    grade: (id, known) => {
      const p = byId.get(id)
      const hasCard = Boolean(progress.getSnapshot()[id])
      if (!shouldTrack({ correct: known, irregular: Boolean(p?.irregular), hasCard })) return { tracked: false }
      return { tracked: true, prev: progress.grade(id, flashcardGrade(known)) }
    },
    restore: (id, prev) => {
      const p = prev as { tracked: boolean; prev?: SrsCard }
      if (p.tracked) progress.restore(id, p.prev)
    },
  }
}

function CounterFlashcards({ counters, back }: { counters: CounterEntry[]; back: SessionLink }) {
  // Chọn cặp một lần khi vào phiên (thẻ đến hạn → bất quy tắc → hay sai → còn lại).
  const [pairs] = useState(() => pickPairs(counters, progress.getSnapshot(), Date.now(), SESSION))
  const grader = useMemo(() => counterGrader(pairs), [pairs])
  return (
    <FlashcardSession
      items={pairs}
      faces={pairFaces}
      label={(p) => `${numberLabel(p.key)} ${p.counter.counter}`}
      back={back}
      grader={grader}
      bookmark={false}
    />
  )
}

/* ───────────── Trang ───────────── */

const LEVEL_OPTIONS: { value: LevelFilter; label: string }[] = [{ value: 'all', label: 'Tất cả' }, ...LEVELS.map((l) => ({ value: l as LevelFilter, label: l }))]

function filterLevel<T extends CounterItem>(items: readonly T[], level: LevelFilter): T[] {
  return level === 'all' ? [...items] : items.filter((c) => c.level === level)
}

export function Counters() {
  const [params, setParamsRaw] = useSearchParams()
  const isOwn = useOwnPage()
  const setParams = useCallback<typeof setParamsRaw>(
    (...args) => {
      if (isOwn()) setParamsRaw(...args)
    },
    [isOwn, setParamsRaw],
  )
  const data = useCounters()
  const wide = useMediaQuery(WIDE_PANEL)
  const stack = useDetailStack(undefined, { ownPage: true })
  const [query, setQuery] = useState('')
  const mode = (MODES.some((m) => m.value === params.get('mode')) ? params.get('mode') : 'list') as Mode
  const level = (LEVEL_OPTIONS.some((o) => o.value === params.get('cap')) ? params.get('cap') : 'all') as LevelFilter
  const only = params.get('ct')
  useScrollMemory(Boolean(data.data))

  const setParam = (set: Record<string, string | null>) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(set)) {
          if (v === null) p.delete(k)
          else p.set(k, v)
        }
        return p
      },
      { replace: true },
    )

  const d: CounterData | undefined = data.data
  const levelOptions = useMemo(
    () => (d ? LEVEL_OPTIONS.filter((o) => o.value === 'all' || [...d.counters, ...d.more].some((c) => c.level === o.value)) : LEVEL_OPTIONS),
    [d],
  )
  const main = useMemo(() => (d ? filterLevel(d.counters, level).filter((c) => matchCounter(c, query)) : []), [d, level, query])
  const more = useMemo(() => (d ? filterLevel(d.more, level).filter((c) => matchCounter(c, query)) : []), [d, level, query])
  // Luyện: một trợ số từ (?ct=) hoặc mọi trợ số từ có bảng theo cấp đang lọc.
  const practice = useMemo(() => {
    if (!d) return []
    const one = only ? d.counters.filter((c) => c.id === only) : []
    return one.length ? one : filterLevel(d.counters, level)
  }, [d, only, level])
  const onlyItem = only ? d?.counters.find((c) => c.id === only) : undefined

  const open = (c: CounterItem) => stack.open({ t: 'c', id: c.id }, { replace: wide })
  const top = stack.frames[stack.frames.length - 1]
  const active = top?.t === 'c' ? top.id : undefined

  let body: ReactNode
  if (data.status === 'error') body = <LoadError error={data.error} onRetry={data.retry} />
  else if (!d) body = <PageSkeleton grid rows={9} />
  else if (mode === 'list') {
    body = (
      <>
        <Rules rules={d.rules} />
        <label className="mb-5 block max-w-md">
          <span className="sr-only">Tìm trợ số từ</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm: 本, ほん, lát, con, đôi…"
            className="h-11 w-full rounded-xl border-2 border-line bg-surface px-4 outline-none focus:border-ai pointer-coarse:text-base"
            data-counter-search
          />
        </label>
        {main.length === 0 && more.length === 0 && <p className="text-muted">Không có trợ số từ nào khớp.</p>}
        {main.length > 0 && <CounterGroups items={main} active={active} onOpen={open} />}
        {more.length > 0 && (
          <section className="mt-10" aria-labelledby="counter-more">
            <h2 id="counter-more" className="text-lg font-bold">
              Trợ số từ khác <span className="text-sm font-normal text-muted">({more.length})</span>
            </h2>
            <p className="mt-0.5 mb-3 text-sm text-muted">Nâng cao, chỉ ghi cách đọc cần nhớ.</p>
            <MoreList items={more} active={active} onOpen={open} />
          </section>
        )}
      </>
    )
  } else {
    const back: SessionLink = { to: '/learn/counters', label: 'Về danh sách' }
    body = (
      <div className={TAB_AREA} data-tab-area>
        {onlyItem && (
          <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Đang luyện:</span>
            <span lang="ja" className="rounded-lg bg-ai-soft px-2.5 py-1 font-jp font-semibold text-ai">
              {onlyItem.counter} {onlyItem.reading}
            </span>
            <button type="button" onClick={() => setParam({ ct: null })} className="min-h-9 rounded-lg px-2 font-medium text-ai hover:bg-ai-soft">
              Luyện tất cả
            </button>
          </p>
        )}
        <div className={STUDY_PAGE}>
          {practice.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">Cấp này chưa có trợ số từ có bảng đầy đủ. Chọn cấp khác.</p>
          ) : mode === 'flashcards' ? (
            <CounterFlashcards key={`${level}-${only ?? ''}`} counters={practice} back={back} />
          ) : (
            <CounterQuiz key={`${level}-${only ?? ''}`} counters={practice} pool={d.counters} />
          )}
        </div>
      </div>
    )
  }

  const showPanel = wide && mode === 'list'

  return (
    <div>
      <PageHeader title="Cách đếm" back={{ to: '/learn', label: 'Học' }}>
        <span lang="ja" className="font-jp text-lg text-muted">
          助数詞
        </span>
      </PageHeader>
      <div className="mb-5 flex flex-col gap-3">
        <Segmented label="Chế độ học" value={mode} onChange={(m) => setParam({ mode: m === 'list' ? null : m, xem: null })} options={MODES} />
        <Segmented size="sm" label="Lọc theo cấp" value={level} onChange={(l) => setParam({ cap: l === 'all' ? null : l, ct: null })} options={levelOptions} />
      </div>

      <div className={showPanel ? 'grid grid-cols-[minmax(0,1fr)_360px] items-start gap-8' : ''} data-counters-layout>
        <div className="min-w-0">{body}</div>
        {showPanel && (
          <aside
            className="sticky top-10 max-h-[calc(100dvh-5rem)] w-[360px] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-5 break-words [scrollbar-gutter:stable]"
            aria-label="Chi tiết trợ số từ"
            data-detail-panel
          >
            {stack.frames.length ? <DetailStackView frames={stack.frames} onPush={stack.push} onBack={stack.back} /> : <EmptyPanel />}
          </aside>
        )}
      </div>

      {!showPanel && (
        <BottomSheet open={stack.frames.length > 0} onClose={() => stack.close()} label="Chi tiết trợ số từ">
          <DetailStackView frames={stack.frames} onPush={stack.push} onBack={stack.back} />
        </BottomSheet>
      )}
      {mode !== 'list' && (
        <p className="mt-8 text-center text-sm text-muted">
          <Link to="/review" className="font-medium text-ai hover:underline">
            Ôn tập
          </Link>{' '}
          gồm các cặp số + trợ số từ hay sai và ô bất quy tắc.
        </p>
      )}
    </div>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet'
import { GridCell } from '../components/GridCell'
import { LoadError, Loaded, PageSkeleton, Skeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { Button, ButtonLink } from '../components/Pressable'
import { Segmented } from '../components/Segmented'
import { Stagger, StaggerItem } from '../components/Stagger'
import { KanjiQuiz } from '../components/study/KanjiQuiz'
import { useEntries, useKanjiIndex, useRadicals } from '../hooks/useData'
import { WIDE_PANEL, useMediaQuery } from '../hooks/useMediaQuery'
import { useCards } from '../hooks/useProgress'
import { progress } from '../lib/progress'
import { normalizeVi } from '../lib/search'
import { LEVELS, type KanjiEntry, type RadicalEntry } from '../types'

type Tab = 'chars' | 'radicals' | 'quiz'
type LevelFilter = 'all' | (typeof LEVELS)[number] | 'none'
const PAGE = 60

const LEVEL_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  ...LEVELS.map((l) => ({ value: l, label: `Từ ${l}` })),
  { value: 'none', label: 'Chỉ trong từ ghép' },
]

/** Âm Hán Việt dài thì khít chữ lại để luôn nằm trên 1 dòng. */
function hanVietSpacing(text: string): string {
  const len = [...text].length
  if (len >= 7) return '-0.04em'
  if (len >= 6) return '-0.02em'
  if (len <= 3) return '0.06em'
  return '0.02em'
}

function levelNote(k: KanjiEntry) {
  return k.firstLevel ? `Xuất hiện từ ${k.firstLevel} trong bộ từ vựng của bạn` : 'Chỉ xuất hiện trong từ ghép'
}

function KanjiWords({ item }: { item: KanjiEntry }) {
  const { status, entries, error, retry } = useEntries(item.words)
  if (status === 'error') return <LoadError error={error} onRetry={retry} />
  if (status !== 'ready')
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    )
  const words = item.words.map((id) => entries.get(id)).filter((e) => e?.kind === 'word')
  return (
    <ul className="divide-y divide-line">
      {words.map(
        (e) =>
          e?.kind === 'word' && (
            <li key={e.item.id}>
              <Link to={`/word/${e.item.id}`} className="-mx-2 flex items-baseline gap-x-3 rounded-lg px-2 py-2.5 hover:bg-sunken">
                <span lang="ja" className="shrink-0 font-jp text-lg font-medium">
                  {e.item.word}
                </span>
                <span lang="ja" className="min-w-0 truncate font-jp text-sm text-muted">
                  {e.item.reading !== e.item.word && e.item.reading}
                </span>
                <span className="ml-auto max-w-[55%] text-right text-sm">{e.item.meaning}</span>
              </Link>
            </li>
          ),
      )}
    </ul>
  )
}

function Detail({ item }: { item: KanjiEntry }) {
  const learned = Boolean(useCards()[item.id])
  return (
    <article aria-label={`Chi tiết chữ ${item.kanji}`}>
      <div className="flex gap-5">
        <GridCell className="size-28 sm:size-32">{item.kanji}</GridCell>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-wide">{item.hanViet}</p>
          {item.hanVietAlt?.length ? <p className="mt-0.5 text-sm text-muted">Âm khác: {item.hanVietAlt.join(', ')}</p> : null}
          <p className="mt-2 text-sm text-muted">{levelNote(item)}</p>
          <p className="text-sm text-muted">{item.wordCount} từ chứa chữ này</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <ButtonLink
          to={`/kanji/${item.id}/learn`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ai px-3 text-center font-semibold text-on-ai hover:opacity-90"
        >
          Học các từ này
        </ButtonLink>
        <Button
          onClick={() => (learned ? progress.forget(item.id) : progress.markLearned(item.id))}
          className={`min-h-11 rounded-lg px-3 font-semibold ${learned ? 'border border-matsu bg-matsu-soft text-matsu' : 'border border-line hover:bg-sunken'}`}
        >
          {learned ? 'Đã học chữ này' : 'Đánh dấu đã học'}
        </Button>
      </div>
      <h3 className="mt-6 mb-1 text-sm font-semibold text-muted">
        Từ chứa chữ {item.kanji}
        {item.wordCount > item.words.length && ` (${item.words.length}/${item.wordCount} từ đầu tiên)`}
      </h3>
      <KanjiWords item={item} />
    </article>
  )
}

function CharsTab({ list, level }: { list: KanjiEntry[]; level: LevelFilter }) {
  const [params, setParams] = useSearchParams()
  const wide = useMediaQuery(WIDE_PANEL)
  const cards = useCards()
  const [shown, setShown] = useState(PAGE)
  const filtered = useMemo(() => {
    const out = level === 'all' ? list : list.filter((k) => (level === 'none' ? k.firstLevel === null : k.firstLevel === level))
    return [...out].sort((a, b) => b.wordCount - a.wordCount)
  }, [list, level])
  const selectedChar = params.get('c')
  const selected = (selectedChar && list.find((k) => k.kanji === selectedChar)) || (wide ? filtered[0] : undefined)
  const closeSheet = useCallback(() => {
    setParams(
      (p) => {
        p.delete('c')
        return p
      },
      { replace: true },
    )
  }, [setParams])

  const choose = (k: KanjiEntry) =>
    setParams(
      (p) => {
        p.set('c', k.kanji)
        return p
      },
      { replace: true },
    )

  return (
    <div className="min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_340px] min-[1180px]:items-start min-[1180px]:gap-8">
      <div className="min-w-0">
        <p className="mb-3 text-sm text-muted">
          {filtered.length} chữ, sắp theo số từ chứa chữ đó. "Từ N5" nghĩa là chữ xuất hiện lần đầu trong từ vựng N5 của bạn, không phải cấp kanji JLPT chính thức.
        </p>
        <Stagger key={level} as="ul" step={0.012} className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5 sm:gap-3">
          {filtered.slice(0, shown).map((k) => {
            const active = wide && selected?.id === k.id
            return (
              <StaggerItem as="li" key={k.id} className="min-w-0">
                <Button
                  onClick={() => choose(k)}
                  whileHover={{ y: -3 }}
                  aria-label={`${k.kanji}, ${k.hanViet}${cards[k.id] ? ', đã học' : ''}`}
                  aria-pressed={wide ? active : undefined}
                  className={`@container relative flex w-full flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors sm:p-2.5 ${
                    active ? 'border-ai bg-ai-soft' : 'border-line bg-surface hover:border-ai'
                  }`}
                >
                  <GridCell className="w-full max-w-28">{k.kanji}</GridCell>
                  <span
                    className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(11px,14cqw,15px)] font-semibold"
                    style={{ letterSpacing: hanVietSpacing(k.hanViet) }}
                  >
                    {k.hanViet}
                  </span>
                  {cards[k.id] && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-matsu" aria-hidden />}
                </Button>
              </StaggerItem>
            )
          })}
        </Stagger>
        {shown < filtered.length && (
          <Button
            onClick={() => setShown((n) => n + PAGE)}
            className="mt-5 min-h-11 w-full rounded-lg border border-line font-medium hover:bg-sunken"
          >
            Xem thêm {Math.min(PAGE, filtered.length - shown)} chữ (còn {filtered.length - shown})
          </Button>
        )}
      </div>

      {wide && selected && (
        <aside className="sticky top-10 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-5" aria-label="Chi tiết chữ Hán">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selected.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <Detail item={selected} />
            </motion.div>
          </AnimatePresence>
        </aside>
      )}
      {!wide && (
        <BottomSheet open={Boolean(selectedChar && selected)} onClose={closeSheet} label={`Chi tiết chữ ${selected?.kanji ?? ''}`}>
          {selected && <Detail item={selected} />}
        </BottomSheet>
      )}
    </div>
  )
}

function RadicalsTab({ list }: { list: RadicalEntry[] }) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const filtered = useMemo(() => {
    const q = normalizeVi(query)
    if (!q) return list
    return list.filter((r) => r.radical.includes(query.trim()) || normalizeVi(`${r.name} ${r.meaning}`).includes(q) || String(r.no) === q)
  }, [list, query])

  return (
    <div>
      <label className="block max-w-sm">
        <span className="sr-only">Lọc bộ thủ</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShown(PAGE)
          }}
          placeholder="Lọc theo tên, nghĩa hoặc số thứ tự"
          className="h-11 w-full rounded-xl border-2 border-line bg-surface px-4 outline-none focus:border-ai"
        />
      </label>
      <p className="mt-3 mb-3 text-sm text-muted">{filtered.length} bộ thủ</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
        {filtered.slice(0, shown).map((r) => (
          <li key={r.no} className="@container flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
            <GridCell className="size-14">{r.radical}</GridCell>
            <span className="min-w-0">
              <span className="block text-xs tabular-nums text-muted">Bộ {r.no}</span>
              <span className="block truncate font-semibold capitalize">{r.name}</span>
              <span className="block text-sm leading-snug text-muted">{r.meaning}</span>
            </span>
          </li>
        ))}
      </ul>
      {shown < filtered.length && (
        <Button onClick={() => setShown((n) => n + PAGE)} className="mt-5 min-h-11 w-full rounded-lg border border-line font-medium hover:bg-sunken">
          Xem thêm (còn {filtered.length - shown})
        </Button>
      )}
    </div>
  )
}

export function Kanji() {
  const [params, setParams] = useSearchParams()
  const tab = (['chars', 'radicals', 'quiz'].includes(params.get('tab') ?? '') ? params.get('tab') : 'chars') as Tab
  const level = (LEVEL_OPTIONS.some((o) => o.value === params.get('level')) ? params.get('level') : 'all') as LevelFilter
  const index = useKanjiIndex()
  const radicals = useRadicals()
  // Chỉ hiện các cấp thật sự có chữ (ví dụ dữ liệu hiện tại không có chữ nào xuất hiện lần đầu ở N1).
  const levelOptions = useMemo(
    () =>
      index.data
        ? LEVEL_OPTIONS.filter((o) => o.value === 'all' || index.data!.some((k) => (o.value === 'none' ? k.firstLevel === null : k.firstLevel === o.value)))
        : LEVEL_OPTIONS,
    [index.data],
  )

  const update = (key: string, value: string | null) =>
    setParams(
      (p) => {
        if (value === null) p.delete(key)
        else p.set(key, value)
        p.delete('c')
        return p
      },
      { replace: true },
    )

  return (
    <div>
      <PageHeader title="Chữ Hán" back={{ to: '/', label: 'Trang chủ' }} />
      <div className="mb-5 flex flex-col gap-3">
        <Segmented
          label="Mục chữ Hán"
          value={tab}
          onChange={(t) => update('tab', t === 'chars' ? null : t)}
          options={[
            { value: 'chars', label: 'Chữ Hán' },
            { value: 'radicals', label: 'Bộ thủ' },
            { value: 'quiz', label: 'Quiz Hán Việt' },
          ]}
        />
        {tab !== 'radicals' && (
          <Segmented size="sm" label="Lọc theo cấp xuất hiện" value={level} onChange={(l) => update('level', l === 'all' ? null : l)} options={levelOptions} />
        )}
      </div>

      {tab === 'radicals' ? (
        <Loaded state={radicals} skeleton={<PageSkeleton grid rows={12} />}>
          {(list) => <RadicalsTab list={list} />}
        </Loaded>
      ) : (
        <Loaded state={index} skeleton={<PageSkeleton grid rows={18} />}>
          {(list) =>
            tab === 'quiz' ? (
              <div className="mx-auto max-w-[560px] lg:max-w-[880px]">
                <KanjiQuiz key={level} pool={level === 'all' ? list : list.filter((k) => (level === 'none' ? k.firstLevel === null : k.firstLevel === level))} />
              </div>
            ) : (
              <CharsTab list={list} level={level} />
            )
          }
        </Loaded>
      )}
    </div>
  )
}

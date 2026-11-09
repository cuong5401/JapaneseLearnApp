import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GrammarUnavailable } from '../components/GrammarUnavailable'
import { PUBLIC_BUILD } from '../lib/edition'
import { Loaded, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { Stagger, StaggerItem } from '../components/Stagger'
import { AutoBadge } from '../components/grammar/AutoBadge'
import { BookmarkButton } from '../components/notebook/BookmarkButton'
import { useGrammar, useManifest } from '../hooks/useData'
import { useCards } from '../hooks/useProgress'
import { useGrammarChecked } from '../lib/grammarChecked'
import { groupsOf } from '../lib/grammarGroups'
import { parseLevel } from '../lib/levels'
import { normalizeKana, normalizeVi } from '../lib/search'
import { LEVELS, type GrammarEntry, type Level } from '../types'
import { NotFound } from './NotFound'

function GrammarRow({ g, level }: { g: GrammarEntry; level: Level }) {
  const learned = Boolean(useCards()[g.id])
  return (
    <div className="relative">
    <Link
      to={`/grammar/${level.toLowerCase()}/${g.id}`}
      className="flex items-start gap-3 rounded-xl border border-line bg-surface py-3 pr-12 pl-4 transition-colors hover:border-ai"
    >
      <span className="w-8 shrink-0 pt-0.5 text-sm tabular-nums text-muted">{g.no}</span>
      <span className="min-w-0 flex-1">
        <span lang="ja" className="block font-jp font-semibold break-words">
          {g.title}
        </span>
        {g.meaning && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{g.meaning}</span>}
        {g.auto && <AutoBadge g={g} className="mt-1.5" />}
      </span>
      {learned && (
        <span className="shrink-0 rounded-full bg-matsu-soft px-2 py-0.5 text-xs font-medium text-matsu">Đã hiểu</span>
      )}
    </Link>
    <span className="absolute top-1.5 right-1.5">
      <BookmarkButton itemRef={g.id} label={`mẫu ${g.title}`} size="sm" />
    </span>
    </div>
  )
}

/** Chip lọc: "Tất cả", từng nhóm chủ đề, "Chưa kiểm tra" (khi có mẫu tự soạn). */
const UNCHECKED = 'chua-kiem-tra'

function GroupChips({ options, value, onChange }: { options: { value: string; label: string; count: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label="Lọc theo nhóm" className="mt-4 flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            data-group-chip={o.value || 'all'}
            onClick={() => onChange(o.value)}
            className={`min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors ${
              on ? 'border-ai bg-ai text-on-ai' : 'border-line bg-surface hover:border-ai'
            }`}
          >
            {o.label} <span className={on ? 'opacity-80' : 'text-muted'}>{o.count}</span>
          </button>
        )
      })}
    </div>
  )
}

function GrammarList({ items, level }: { items: GrammarEntry[]; level: Level }) {
  const [query, setQuery] = useState('')
  const [params, setParams] = useSearchParams()
  const checked = useGrammarChecked()
  const groupNames = useMemo(() => groupsOf(items, level), [items, level])
  const autoCount = items.filter((g) => g.auto).length
  const unchecked = items.filter((g) => g.auto && !(g.id in checked)).length
  const raw = params.get('nhom') ?? ''
  const group = raw === UNCHECKED ? (autoCount ? raw : '') : groupNames.includes(raw) ? raw : ''
  const setGroup = (v: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (v) next.set('nhom', v)
        else next.delete('nhom')
        return next
      },
      { replace: true },
    )

  const filtered = useMemo(() => {
    let list = items
    if (group === UNCHECKED) list = list.filter((g) => g.auto && !(g.id in checked))
    else if (group) list = list.filter((g) => g.group === group)
    const q = query.trim()
    if (!q) return list
    const vi = normalizeVi(q)
    const ja = normalizeKana(q)
    return list.filter(
      (g) =>
        normalizeVi(g.title).includes(vi) ||
        normalizeKana(g.title).includes(ja) ||
        (g.meaning && normalizeVi(g.meaning).includes(vi)) ||
        (g.connection && normalizeKana(g.connection).includes(ja)),
    )
  }, [items, query, group, checked])

  // N4 nhóm theo bài Minna 26–50; N3/N5 theo nhóm chủ đề khi xem "Tất cả"; cấp khác là một danh sách.
  const groups = useMemo(() => {
    const map = new Map<string, GrammarEntry[]>()
    if (!group && groupNames.length) for (const name of groupNames) map.set(name, [])
    for (const g of filtered) {
      const key = g.lesson ? `Bài ${g.lesson}` : !group && g.group ? g.group : ''
      map.set(key, [...(map.get(key) ?? []), g])
    }
    return [...map.entries()].filter(([, list]) => list.length > 0)
  }, [filtered, group, groupNames])

  const chipOptions = groupNames.length
    ? [
        { value: '', label: 'Tất cả', count: items.length },
        ...groupNames.map((n) => ({ value: n, label: n, count: items.filter((g) => g.group === n).length })),
        ...(autoCount ? [{ value: UNCHECKED, label: 'Chưa kiểm tra', count: unchecked }] : []),
      ]
    : []

  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <h2 className="font-semibold">Chưa có dữ liệu ngữ pháp {level}</h2>
        <p className="mt-1 text-sm text-muted">Thêm nội dung vào file Excel hoặc data-source/grammar-extra rồi chạy lại script chuyển đổi.</p>
      </div>
    )

  return (
    <div>
      <label className="block max-w-md">
        <span className="sr-only">Lọc mẫu ngữ pháp</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lọc theo tiêu đề hoặc ý nghĩa"
          className="h-11 w-full rounded-xl border-2 border-line bg-surface px-4 outline-none focus:border-ai"
        />
      </label>
      {chipOptions.length > 0 && <GroupChips options={chipOptions} value={group} onChange={setGroup} />}
      <p className="mt-3 text-sm text-muted">
        {filtered.length === items.length ? `${items.length} mẫu` : `${filtered.length}/${items.length} mẫu khớp`}
        {autoCount > 0 && ` · ${autoCount} mẫu Kotonoha soạn, ${unchecked} chưa kiểm tra`}
      </p>
      {filtered.length === 0 && <p className="mt-6 text-muted">Không có mẫu nào khớp. Thử bỏ dấu hoặc gõ ngắn hơn.</p>}
      <div className="mt-4 space-y-8">
        {groups.map(([name, list]) => (
          <section key={name || 'all'}>
            {name && (
              <h2 className="mb-2 text-lg font-bold">
                {name} <span className="text-sm font-normal text-muted">{list.length}</span>
              </h2>
            )}
            <Stagger as="ul" className="grid gap-2 lg:grid-cols-2">
              {list.map((g) => (
                <StaggerItem as="li" key={g.id}>
                  <GrammarRow g={g} level={level} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        ))}
      </div>
    </div>
  )
}

/** /grammar và /grammar/:level */
export function Grammar() {
  return PUBLIC_BUILD ? <GrammarUnavailable /> : <GrammarPage />
}

function GrammarPage() {
  const { level: param } = useParams()
  const manifest = useManifest()
  const level = parseLevel(param)
  // /grammar (không có cấp) đã được loader trong main.tsx chuyển sang cấp có dữ liệu thấp nhất.
  if (!param) return <PageSkeleton header />
  if (!level) return <NotFound />
  return <GrammarLevel level={level} counts={manifest.data?.files} />
}

function GrammarLevel({ level, counts }: { level: Level; counts?: { kind: string; level?: string; count: number }[] }) {
  const data = useGrammar(level)
  const navigate = useNavigate()
  return (
    <div>
      <PageHeader title={`Ngữ pháp ${level}`} back={{ to: '/', label: 'Trang chủ' }} />
      <nav aria-label="Chọn cấp" className="mb-6">
        <Segmented
          label="Cấp ngữ pháp"
          value={level}
          onChange={(l) => navigate(`/grammar/${l.toLowerCase()}`)}
          options={LEVELS.map((l) => {
            const n = counts?.find((f) => f.kind === 'grammar' && f.level === l)?.count
            return { value: l, label: n === undefined ? l : `${l} (${n})` }
          })}
        />
      </nav>
      <Loaded state={data} skeleton={<PageSkeleton rows={8} />}>
        {(items) => <GrammarList key={level} items={items} level={level} />}
      </Loaded>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { GrammarUnavailable } from '../components/GrammarUnavailable'
import { PUBLIC_BUILD } from '../lib/edition'
import { Loaded, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { Stagger, StaggerItem } from '../components/Stagger'
import { useGrammar, useManifest } from '../hooks/useData'
import { useCards } from '../hooks/useProgress'
import { parseLevel } from '../lib/levels'
import { normalizeKana, normalizeVi } from '../lib/search'
import { LEVELS, type GrammarEntry, type Level } from '../types'
import { NotFound } from './NotFound'

function GrammarRow({ g, level }: { g: GrammarEntry; level: Level }) {
  const learned = Boolean(useCards()[g.id])
  return (
    <Link
      to={`/grammar/${level.toLowerCase()}/${g.id}`}
      className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-ai"
    >
      <span className="w-8 shrink-0 pt-0.5 text-sm tabular-nums text-muted">{g.no}</span>
      <span className="min-w-0 flex-1">
        <span lang="ja" className="block font-jp font-semibold break-words">
          {g.title}
        </span>
        {g.meaning && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{g.meaning}</span>}
      </span>
      {learned && (
        <span className="shrink-0 rounded-full bg-matsu-soft px-2 py-0.5 text-xs font-medium text-matsu">Đã hiểu</span>
      )}
    </Link>
  )
}

function GrammarList({ items, level }: { items: GrammarEntry[]; level: Level }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return items
    const vi = normalizeVi(q)
    const ja = normalizeKana(q)
    return items.filter((g) => normalizeVi(g.title).includes(vi) || normalizeKana(g.title).includes(ja) || (g.meaning && normalizeVi(g.meaning).includes(vi)))
  }, [items, query])

  // N4 nhóm theo bài Minna 26–50; cấp khác là một danh sách.
  const groups = useMemo(() => {
    const map = new Map<string, GrammarEntry[]>()
    for (const g of filtered) {
      const key = g.lesson ? `Bài ${g.lesson}` : ''
      map.set(key, [...(map.get(key) ?? []), g])
    }
    return [...map.entries()]
  }, [filtered])

  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <h2 className="font-semibold">Chưa có dữ liệu ngữ pháp {level}</h2>
        <p className="mt-1 text-sm text-muted">Sheet ngữ pháp {level} trong file Excel đang trống. Thêm nội dung rồi chạy lại script chuyển đổi.</p>
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
      <p className="mt-3 text-sm text-muted">
        {filtered.length === items.length ? `${items.length} mẫu` : `${filtered.length}/${items.length} mẫu khớp`}
      </p>
      {filtered.length === 0 && <p className="mt-6 text-muted">Không có mẫu nào khớp. Thử bỏ dấu hoặc gõ ngắn hơn.</p>}
      <div className="mt-4 space-y-8">
        {groups.map(([group, list]) => (
          <section key={group || 'all'}>
            {group && <h2 className="mb-2 text-lg font-bold">{group}</h2>}
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
  if (!param) {
    // Mặc định mở cấp có dữ liệu thấp nhất.
    const first = manifest.data?.files.find((f) => f.kind === 'grammar' && f.count > 0)?.level ?? 'N4'
    return manifest.status === 'loading' ? <PageSkeleton header /> : <Navigate to={`/grammar/${first.toLowerCase()}`} replace />
  }
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

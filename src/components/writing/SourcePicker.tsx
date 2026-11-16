import type { ReactNode } from 'react'
import { rowsOf } from '../../data/kana'
import { KANJI_LEVEL_OPTIONS, type KanjiLevelFilter } from '../../lib/kanjiLessons'
import type { Notebook } from '../../lib/notebooks'
import type { WritingSource } from '../../lib/writing/sources'
import type { KanaScript, KanjiEntry } from '../../types'
import { BookColor } from '../notebook/BookColor'
import { Segmented } from '../Segmented'

type Kind = WritingSource['kind']

const KINDS: { value: Kind; label: string }[] = [
  { value: 'kanji', label: 'Bài Chữ Hán' },
  { value: 'notebook', label: 'Sổ tay' },
  { value: 'kana', label: 'Kana' },
  { value: 'custom', label: 'Tự nhập' },
]

/** Nút chọn dạng chip (nhiều lựa chọn). */
function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
        on ? 'border-ai bg-ai-soft text-ai' : 'border-line bg-surface text-muted hover:border-ai hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

interface Props {
  source: WritingSource
  onChange: (s: WritingSource) => void
  /** Chữ Hán của từng bài theo cấp đang chọn (null = đang tải) */
  lessons: KanjiEntry[][] | null
  levels: KanjiLevelFilter[]
  books: Notebook[]
  bookCount: (id: string) => number
  customText: string
  onCustomText: (t: string) => void
  /** Ký tự bị bỏ khi tự nhập */
  dropped: string[]
}

export function SourcePicker(p: Props) {
  const s = p.source
  const switchKind = (k: Kind) => {
    if (k === s.kind) return
    if (k === 'kanji') p.onChange({ kind: 'kanji', level: 'N5', lessons: [1] })
    else if (k === 'notebook') p.onChange({ kind: 'notebook', id: p.books[0]?.id ?? '' })
    else if (k === 'kana') p.onChange({ kind: 'kana', script: 'hiragana', rows: ['h-basic-a'] })
    else p.onChange({ kind: 'custom', text: '' })
  }

  return (
    <section aria-labelledby="writing-source" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h2 id="writing-source" className="mb-3 text-lg font-bold">
        Chọn chữ
      </h2>
      <Segmented label="Nguồn chữ" value={s.kind} onChange={switchKind} options={KINDS} />

      <div className="mt-4">
        {s.kind === 'kanji' && (
          <>
            <Segmented
              size="sm"
              label="Cấp xuất hiện"
              value={s.level}
              onChange={(level) => p.onChange({ kind: 'kanji', level, lessons: [1] })}
              options={KANJI_LEVEL_OPTIONS.filter((o) => p.levels.includes(o.value))}
            />
            <p className="mt-3 mb-2 text-sm text-muted">Chọn một hoặc nhiều bài (giống cách chia bài ở trang Chữ Hán):</p>
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto overscroll-contain p-0.5" data-writing-lessons>
              {(p.lessons ?? Array.from({ length: 6 }, () => null)).map((l, i) => {
                const n = i + 1
                const on = s.lessons.includes(n)
                if (!l) return <span key={i} className="inline-block h-11 w-24 animate-pulse rounded-lg bg-sunken" />
                return (
                  <Chip
                    key={n}
                    on={on}
                    label={`Bài ${n}`}
                    onClick={() => {
                      const next = on ? s.lessons.filter((x) => x !== n) : [...s.lessons, n].sort((a, b) => a - b)
                      if (next.length) p.onChange({ ...s, lessons: next })
                    }}
                  >
                    Bài {n}
                    <span lang="ja" className="font-jp text-xs text-muted" aria-hidden>
                      {l.slice(0, 3).map((k) => k.kanji).join('')}
                    </span>
                  </Chip>
                )
              })}
            </div>
          </>
        )}

        {s.kind === 'notebook' &&
          (p.books.length ? (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sổ tay">
              {p.books.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={b.id === s.id}
                  onClick={() => p.onChange({ kind: 'notebook', id: b.id })}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                    b.id === s.id ? 'border-ai bg-ai-soft text-ai' : 'border-line hover:border-ai'
                  }`}
                >
                  <BookColor color={b.color} className="size-3.5" />
                  {b.name}
                  <span className="text-xs text-muted tabular-nums">{p.bookCount(b.id)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Chưa có sổ tay nào.</p>
          ))}

        {s.kind === 'kana' && <KanaRows script={s.script} rows={s.rows} onChange={(script, rows) => p.onChange({ kind: 'kana', script, rows })} />}

        {s.kind === 'custom' && (
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Dán chữ bất kỳ: chữ trùng và chữ không có dữ liệu nét sẽ tự bỏ.</span>
            <textarea
              value={p.customText}
              onChange={(e) => p.onCustomText(e.target.value)}
              rows={3}
              lang="ja"
              placeholder="Ví dụ: 日本語を勉強します"
              className="w-full rounded-xl border-2 border-line bg-surface px-3 py-2 font-jp outline-none focus:border-ai pointer-coarse:text-base"
              data-writing-custom
            />
            <span className="mt-1 block min-h-5 text-sm text-muted" aria-live="polite">
              {p.dropped.length > 0 && `Đã bỏ ${p.dropped.length} ký tự không có dữ liệu nét: ${p.dropped.slice(0, 20).join(' ')}${p.dropped.length > 20 ? '…' : ''}`}
            </span>
          </label>
        )}
      </div>
    </section>
  )
}

function KanaRows({ script, rows, onChange }: { script: KanaScript; rows: string[]; onChange: (s: KanaScript, rows: string[]) => void }) {
  const all = rowsOf(script)
  return (
    <>
      <Segmented<KanaScript>
        size="sm"
        label="Bảng chữ"
        value={script}
        onChange={(sc) => onChange(sc, [sc === 'hiragana' ? 'h-basic-a' : 'k-basic-a'])}
        options={[
          { value: 'hiragana', label: 'Hiragana あ' },
          { value: 'katakana', label: 'Katakana ア' },
        ]}
      />
      <div className="mt-3 flex flex-wrap gap-2" data-writing-kana-rows>
        {all.map((r) => {
          const on = rows.includes(r.id)
          return (
            <Chip
              key={r.id}
              on={on}
              label={`Hàng ${r.label}`}
              onClick={() => {
                const next = on ? rows.filter((x) => x !== r.id) : [...rows, r.id]
                if (next.length) onChange(script, next)
              }}
            >
              <span lang="ja" className="font-jp">
                {r.label}
              </span>
            </Chip>
          )
        })}
      </div>
    </>
  )
}

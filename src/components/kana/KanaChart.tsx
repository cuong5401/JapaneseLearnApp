import { COLUMN_LABELS, KANA_GROUP_LABELS, KANA_GROUPS, rowsOf, type KanaRow } from '../../data/kana'
import { kanaLevel, type KanaLevel, type KanaStat } from '../../lib/kanaProgress'
import type { KanaChar, KanaGroup, KanaScript } from '../../types'
import { LEVEL_CELL, LEVEL_LABEL } from './levels'

export function LevelLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Chú thích màu">
      {(Object.keys(LEVEL_LABEL) as KanaLevel[]).map((l) => (
        <li key={l} className="flex items-center gap-1.5">
          <span className={`size-3.5 rounded-[3px] border ${LEVEL_CELL[l]}`} aria-hidden />
          {LEVEL_LABEL[l]}
        </li>
      ))}
    </ul>
  )
}

interface ChartProps {
  script: KanaScript
  stats: Record<string, KanaStat>
  selectedRows: ReadonlySet<string>
  onToggleRow: (row: KanaRow) => void
  active?: KanaChar
  onPick: (k: KanaChar) => void
}

const COLS: Record<KanaGroup, string> = {
  // Cột đầu 48px cho ô chọn hàng; 5 (hoặc 3) cột chữ chia đều phần còn lại.
  basic: 'grid-cols-[48px_repeat(5,minmax(0,1fr))]',
  dakuten: 'grid-cols-[48px_repeat(5,minmax(0,1fr))]',
  yoon: 'grid-cols-[48px_repeat(3,minmax(0,1fr))]',
}

function Cell({ k, stat, active, onPick }: { k: KanaChar; stat?: KanaStat; active: boolean; onPick: (k: KanaChar) => void }) {
  const level = kanaLevel(stat)
  return (
    <button
      type="button"
      data-kana-cell={k.id}
      onClick={() => onPick(k)}
      aria-label={`${k.kana}, ${k.romaji}, ${LEVEL_LABEL[level].toLowerCase()}`}
      aria-pressed={active}
      className={`flex h-14 w-full min-w-0 flex-col items-center justify-center rounded-lg border transition-[border-color,box-shadow] hover:border-ai sm:h-16 ${LEVEL_CELL[level]} ${
        active ? 'border-ai ring-2 ring-ai' : ''
      }`}
    >
      <span lang="ja" className={`font-jp leading-none ${k.kana.length > 1 ? 'text-xl sm:text-2xl' : 'text-[1.625rem] sm:text-[1.75rem]'}`}>
        {k.kana}
      </span>
      <span className="mt-1 text-[11px] leading-none text-muted">{k.romaji}</span>
    </button>
  )
}

function Table({ group, ...p }: ChartProps & { group: KanaGroup }) {
  const rows = rowsOf(p.script, group)
  const chars = rows.flatMap((r) => r.cells.filter((c): c is KanaChar => c !== null))
  const mastered = chars.filter((k) => kanaLevel(p.stats[k.id]) === 'mastered').length
  return (
    <section aria-labelledby={`kana-${group}`}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id={`kana-${group}`} className="text-lg font-bold">
          {KANA_GROUP_LABELS[group]}
        </h2>
        <span className="text-sm tabular-nums text-muted">
          Đã thuộc {mastered}/{chars.length}
        </span>
      </div>
      <div role="table" aria-label={KANA_GROUP_LABELS[group]} className="space-y-1">
        <div role="row" className={`grid ${COLS[group]} gap-1 px-0.5 text-center text-xs text-muted sm:gap-1.5`}>
          <span role="columnheader" className="sr-only">
            Chọn hàng
          </span>
          <span aria-hidden />
          {COLUMN_LABELS[group].slice(0).map((c) => (
            <span role="columnheader" key={c}>
              {c}
            </span>
          ))}
        </div>
        {rows.map((row) => {
          const on = p.selectedRows.has(row.id)
          return (
            <div
              role="row"
              key={row.id}
              className={`grid ${COLS[group]} gap-1 rounded-xl p-0.5 transition-colors sm:gap-1.5 ${on ? 'bg-ai-soft' : ''}`}
            >
              <label
                role="rowheader"
                className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg text-[11px] text-muted hover:text-ink"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => p.onToggleRow(row)}
                  aria-label={`Chọn hàng ${row.label}`}
                  className="size-5 cursor-pointer accent-[var(--ai)]"
                />
                <span lang="ja" className="font-jp leading-none">
                  {row.label}
                </span>
              </label>
              {row.cells.map((k, i) =>
                k ? (
                  <span role="cell" key={k.id} className="block min-w-0">
                    <Cell k={k} stat={p.stats[k.id]} active={p.active?.id === k.id} onPick={p.onPick} />
                  </span>
                ) : (
                  <span role="cell" key={i} aria-label="Ô trống" className="block h-14 sm:h-16" />
                ),
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Ba bảng: 50 âm, âm đục/bán đục, âm ghép. */
export function KanaChart(props: ChartProps) {
  return (
    <div className="space-y-8">
      {KANA_GROUPS.map((g) => (
        <Table key={g} group={g} {...props} />
      ))}
    </div>
  )
}

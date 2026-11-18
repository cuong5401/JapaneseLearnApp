import { Reorder, useDragControls } from 'motion/react'
import { t } from '../../i18n'

export interface CharInfo {
  /** Âm Hán Việt / romaji */
  label: string
  /** Âm On / Kun rút gọn, hoặc chữ bảng kia */
  sub: string
  /** Không có dữ liệu nét KanjiVG: ô mẫu / ô mờ dùng font Klee One */
  missing: boolean
}

interface Props {
  order: string[]
  off: ReadonlySet<string>
  info: (ch: string) => CharInfo
  onReorder: (order: string[]) => void
  onToggle: (ch: string) => void
  onAll: (on: boolean) => void
  /** Đang tải danh sách chữ (số hàng giữ chỗ) */
  pending?: number
}

function Row({ ch, i, total, checked, info, onToggle, onMove }: { ch: string; i: number; total: number; checked: boolean; info: CharInfo; onToggle: () => void; onMove: (d: -1 | 1) => void }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="li"
      value={ch}
      dragListener={false}
      dragControls={controls}
      className="relative flex min-h-14 items-center gap-2 border-b border-line bg-surface pr-1 last:border-b-0"
      data-writing-char={ch}
    >
      <label className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 pl-3">
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={t('charList.chonChu', { ch })} className="size-5 shrink-0 cursor-pointer accent-[var(--ai)]" />
        <span className="w-6 shrink-0 text-right text-xs text-muted tabular-nums">{i + 1}</span>
        <span lang="ja" className={`grid size-10 shrink-0 place-items-center rounded-[3px] border border-cell-line font-jp text-2xl leading-none ${checked ? '' : 'opacity-40'}`}>
          {ch}
        </span>
        <span className={`min-w-0 ${checked ? '' : 'opacity-50'}`}>
          <span className="block truncate text-sm font-semibold">{info.label || '—'}</span>
          <span lang="ja" className="block truncate font-jp text-xs text-muted">
            {info.sub}
          </span>
        </span>
        {info.missing && (
          <span className="ml-auto shrink-0 rounded-md bg-kihada-soft px-1.5 py-0.5 text-[11px] font-medium text-ink" title={t('charList.khongCoDuLieu')} data-missing-strokes>{t('charList.khongCoNet')}</span>
        )}
      </label>
      <button
        type="button"
        aria-label={t('charList.keoDeDoiThu', { ch })}
        aria-keyshortcuts="ArrowUp ArrowDown"
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' && i > 0) {
            e.preventDefault()
            onMove(-1)
          } else if (e.key === 'ArrowDown' && i < total - 1) {
            e.preventDefault()
            onMove(1)
          }
        }}
        className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink active:cursor-grabbing"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>
    </Reorder.Item>
  )
}

/** Danh sách chữ sẽ in: tích chọn từng chữ, kéo tay nắm để đổi thứ tự. */
export function CharList({ order, off, info, onReorder, onToggle, onAll, pending }: Props) {
  const checked = order.filter((c) => !off.has(c)).length
  const move = (i: number, d: -1 | 1) => {
    const next = [...order]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onReorder(next)
    // Giữ focus trên tay nắm của chữ vừa di chuyển.
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-writing-char="${CSS.escape(next[i + d])}"] button`)?.focus())
  }
  return (
    <section aria-labelledby="writing-list" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <h2 id="writing-list" className="mr-auto text-lg font-bold">{t('charList.chuSeIn')}{' '}
          <span className="text-sm font-medium text-muted tabular-nums" data-writing-count>
            {checked}/{order.length}
          </span>
        </h2>
        <button type="button" onClick={() => onAll(true)} className="min-h-11 rounded-lg px-3 text-sm font-medium text-ai hover:bg-ai-soft">{t('charList.chonTatCa')}</button>
        <button type="button" onClick={() => onAll(false)} className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted hover:bg-sunken hover:text-ink">{t('charList.boChon')}</button>
      </div>
      {pending ? (
        <ul aria-hidden className="max-h-[26rem] overflow-hidden rounded-xl border border-line">
          {Array.from({ length: Math.min(pending, 7) }, (_, i) => (
            <li key={i} className="flex min-h-14 items-center gap-3 border-b border-line px-3 last:border-b-0">
              <span className="size-10 animate-pulse rounded-[3px] bg-sunken" />
              <span className="h-4 w-24 animate-pulse rounded bg-sunken" />
            </li>
          ))}
        </ul>
      ) : order.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">{t('charList.chuaCoChuNao')}</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={onReorder}
          layoutScroll
          className="max-h-[26rem] overflow-y-auto overscroll-contain rounded-xl border border-line"
          data-writing-list
        >
          {order.map((ch, i) => (
            <Row key={ch} ch={ch} i={i} total={order.length} checked={!off.has(ch)} info={info(ch)} onToggle={() => onToggle(ch)} onMove={(d) => move(i, d)} />
          ))}
        </Reorder.Group>
      )}
    </section>
  )
}

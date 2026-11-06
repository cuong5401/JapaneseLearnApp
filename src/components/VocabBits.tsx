import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { VocabItem } from '../types'

/** Âm Hán Việt dạng chữ hoa nhỏ, đặt dưới chữ Nhật. */
export function HanViet({ text, className = '' }: { text?: string; className?: string }) {
  if (!text) return null
  return <span className={`block text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ai ${className}`}>{text}</span>
}

/** Chữ Nhật kèm cách đọc phía trên (khi khác chữ viết) và Hán Việt phía dưới. */
export function WordHead({
  item,
  className,
  align = 'center',
  showHanViet = true,
}: {
  item: VocabItem
  className: string
  align?: 'center' | 'left'
  showHanViet?: boolean
}) {
  const showReading = item.reading && item.reading !== item.word
  return (
    <div className={`min-w-0 ${align === 'left' ? 'text-left' : 'text-center'}`}>
      {showReading && (
        <div lang="ja" className="mb-1 font-jp text-lg text-muted">
          {item.reading}
        </div>
      )}
      <div lang="ja" className={`font-jp font-bold leading-tight break-words ${className}`}>
        {item.word}
      </div>
      {showHanViet && <HanViet text={item.hanViet} className="mt-1.5" />}
    </div>
  )
}

/** Thông tin phụ: từ loại, cách viết khác, từ gốc, ghi chú, từ liên quan. */
export function WordMeta({ item, compact = false }: { item: VocabItem; compact?: boolean }) {
  const rows: { label: string; value: ReactNode; ja?: boolean }[] = []
  if (item.pos) rows.push({ label: 'Từ loại', value: item.pos })
  if (item.alt?.length) rows.push({ label: 'Cách viết khác', value: item.alt.join('、'), ja: true })
  if (item.readingAlt?.length) rows.push({ label: 'Cách đọc khác', value: item.readingAlt.join('、'), ja: true })
  if (item.origin) rows.push({ label: 'Gốc tiếng Anh', value: <span lang="en">{item.origin}</span> })
  if (item.note) rows.push({ label: 'Ghi chú', value: item.note })
  const linkCount = (item.related?.length ?? 0) + (item.parent ? 1 : 0)
  if (!rows.length && !linkCount) return null

  return (
    <dl className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 ${compact ? 'gap-y-0.5 text-sm' : 'gap-y-1.5'}`}>
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted">{r.label}</dt>
          <dd lang={r.ja ? 'ja' : undefined} className={r.ja ? 'font-jp' : ''}>
            {r.value}
          </dd>
        </div>
      ))}
      {linkCount > 0 && (
        <div className="contents">
          <dt className="text-muted">{item.parent ? 'Từ chính' : 'Từ liên quan'}</dt>
          <dd>
            <Link
              to={`/word/${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-ai underline-offset-2 hover:underline"
            >
              {item.parent ? 'Xem từ chính' : `Xem ${item.related!.length} từ`}
            </Link>
          </dd>
        </div>
      )}
    </dl>
  )
}


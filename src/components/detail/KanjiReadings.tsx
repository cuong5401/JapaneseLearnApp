import { Fragment } from 'react'
import { kunParts, uniqueKun, useReadings } from '../../lib/readings'

/**
 * Âm On / Kun (KANJIDIC2) trong panel chi tiết chữ Hán. Kun: phần okurigana (sau dấu "." của KANJIDIC2) in nhạt.
 * Lúc chờ dữ liệu giữ đúng 2 dòng để panel không đổi chiều cao.
 */
export function KanjiReadings({ ch }: { ch: string }) {
  const r = useReadings()
  const entry = r.status === 'ready' ? r.map.get(ch) : undefined
  const loading = r.status === 'loading'
  const row = 'min-h-6 leading-6'
  const kun = uniqueKun(entry?.kun ?? [])
  return (
    <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm" data-kanji-readings>
      <dt className={`${row} text-muted`}>Âm On</dt>
      <dd className={row} data-reading-on>
        {loading ? (
          <span className="inline-block h-4 w-24 animate-pulse rounded bg-sunken align-middle" />
        ) : entry?.on.length ? (
          <span lang="ja" className="font-jp">
            {entry.on.join('、')}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </dd>
      <dt className={`${row} text-muted`}>Âm Kun</dt>
      <dd className={row} data-reading-kun>
        {loading ? (
          <span className="inline-block h-4 w-32 animate-pulse rounded bg-sunken align-middle" />
        ) : kun.length ? (
          <span lang="ja" className="font-jp">
            {kun.map((k, i) => {
              const p = kunParts(k)
              return (
                <Fragment key={k}>
                  {i > 0 && '、'}
                  {p.before}
                  {p.stem}
                  {p.okurigana && <span className="text-muted">{p.okurigana}</span>}
                  {p.after}
                </Fragment>
              )
            })}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </dd>
      {loading || entry?.s ? (
        <>
          <dt className={`${row} text-muted`}>Số nét</dt>
          <dd className={row}>
            {loading ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-sunken align-middle" /> : entry?.s}
            {entry?.jlpt ? <span className="text-muted"> · JLPT cũ cấp {entry.jlpt}</span> : null}
          </dd>
        </>
      ) : null}
    </dl>
  )
}

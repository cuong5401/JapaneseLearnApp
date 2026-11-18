import { useReadings } from '../../lib/readings'
import { KunText } from './KunText'
import { t } from '../../i18n'

/**
 * Âm On / Kun (KANJIDIC2) trong panel chi tiết chữ Hán. Kun giữ ký hiệu gốc (おも.う), okurigana in nhạt.
 * Lúc chờ dữ liệu giữ đúng 2 dòng để panel không đổi chiều cao.
 */
export function KanjiReadings({ ch }: { ch: string }) {
  const r = useReadings()
  const entry = r.status === 'ready' ? r.map.get(ch) : undefined
  const loading = r.status === 'loading'
  const row = 'min-h-6 leading-6'
  const kun = entry?.kun ?? []
  return (
    <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm" data-kanji-readings>
      <dt className={`${row} text-muted`}>{t('kanjiReadings.amOn')}</dt>
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
      <dt className={`${row} text-muted`}>{t('kanjiReadings.amKun')}</dt>
      <dd className={row} data-reading-kun>
        {loading ? (
          <span className="inline-block h-4 w-32 animate-pulse rounded bg-sunken align-middle" />
        ) : kun.length ? (
          <KunText kun={kun} />
        ) : (
          <span className="text-muted">—</span>
        )}
      </dd>
      {loading || entry?.s ? (
        <>
          <dt className={`${row} text-muted`}>{t('kanjiReadings.soNet')}</dt>
          <dd className={row}>
            {loading ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-sunken align-middle" /> : entry?.s}
            {entry?.jlpt ? <span className="text-muted">{t('kanjiReadings.jlptCuCap', { jlpt: entry.jlpt })}</span> : null}
          </dd>
        </>
      ) : null}
    </dl>
  )
}

/**
 * Âm On / Kun gọn (mặt sau flashcard chữ Hán, chữ Hán ngẫu nhiên ở trang chủ). Luôn giữ 2 dòng (kể cả lúc chờ dữ
 * liệu) để không đổi chiều cao; `truncate`: mỗi dòng một hàng, dài thì cắt (trang chủ, chống layout shift).
 */
export function KanjiReadingsCompact({ ch, truncate = false, className = '' }: { ch: string; truncate?: boolean; className?: string }) {
  const r = useReadings()
  const entry = r.status === 'ready' ? r.map.get(ch) : undefined
  const loading = r.status === 'loading'
  const line = `min-h-6 leading-6 ${truncate ? 'truncate' : ''}`
  const skeleton = (w: string) => <span className={`inline-block h-4 ${w} animate-pulse rounded bg-sunken align-middle`} />
  const dash = <span className="text-muted">—</span>
  return (
    <div className={`text-sm ${className}`} data-kanji-readings-compact>
      <p className={line} data-compact-on>
        <span className="mr-2 text-muted">{t('readings.on')}</span>
        {loading ? skeleton('w-20') : entry?.on.length ? <span lang="ja" className="font-jp">{entry.on.join('、')}</span> : dash}
      </p>
      <p className={line} data-compact-kun title={entry?.kun.length && truncate ? entry.kun.join('、') : undefined}>
        <span className="mr-2 text-muted">{t('readings.kun')}</span>
        {loading ? skeleton('w-28') : entry?.kun.length ? <KunText kun={entry.kun} /> : dash}
      </p>
    </div>
  )
}

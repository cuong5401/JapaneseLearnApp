import { useMemo } from 'react'
import { isCurrentId } from '../data'
import { useCards, useNow } from '../hooks/useProgress'
import { dueForecast } from '../lib/forecast'
import { stateCounts } from '../lib/reviewQueue'
import { retentionRate, useReviewLog } from '../lib/reviewLog'
import { useSrsSettings } from '../lib/srsSettings'
import { t } from '../i18n'

const pct = (x: number) => `${Math.round(x * 100)}%`

/**
 * Thống kê lịch ôn FSRS (trang Tiến độ): tỷ lệ nhớ thực tế 30 ngày so với mức mong muốn, dự báo số thẻ đến hạn
 * 30 ngày tới, số thẻ theo trạng thái.
 */
export function SrsStats() {
  const cards = useCards()
  const logs = useReviewLog()
  const settings = useSrsSettings()
  const now = useNow()
  const current = useMemo(() => Object.values(cards).filter((c) => isCurrentId(c.id)), [cards])
  const counts = useMemo(() => stateCounts(current), [current])
  const forecast = useMemo(() => dueForecast(current, now, 30), [current, now])
  const ret = useMemo(() => retentionRate(logs, now, 30), [logs, now])
  const max = Math.max(1, ...forecast)

  const states = [
    { label: t('srsStats.moi'), value: counts.new, cls: 'bg-cell-line' },
    { label: t('common.dangHoc'), value: counts.learning, cls: 'bg-kihada' },
    { label: t('common.onTap'), value: counts.review, cls: 'bg-ai' },
    { label: t('srsStats.hocLai'), value: counts.relearning, cls: 'bg-beni' },
  ]

  return (
    <section aria-labelledby="srs-stats" className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="srs-stats" className="text-lg font-bold">{t('srsStats.lichOn')}</h2>

      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div>
          <p className="text-sm text-muted">{t('srsStats.tyLeNhoThuc')}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums" data-retention-actual>
            {ret.rate === null ? '—' : pct(ret.rate)}
          </p>
          <p className="mt-1 text-sm text-muted">{t('srsStats.mucMongMuon2', { pct: pct(settings.retention), v: ret.total > 0 ? t('srsStats.retPart', { ok: ret.ok, total: ret.total }) : t('srsStats.retNone') })}</p>
          {ret.rate !== null && (
            <div className="relative mt-3 h-2 rounded-full bg-sunken" aria-hidden>
              <div className="absolute inset-y-0 left-0 rounded-full bg-ai" style={{ width: pct(ret.rate) }} />
              <div className="absolute -inset-y-1 w-0.5 bg-beni" style={{ left: pct(settings.retention) }} title={t('srsStats.mucMongMuon')} />
            </div>
          )}

          <p className="mt-6 text-sm text-muted">{t('srsStats.soTheTheoTrang')}</p>
          <ul className="mt-2 grid grid-cols-2 gap-2" data-state-counts>
            {states.map((s) => (
              <li key={s.label} className="flex items-center gap-2 rounded-lg bg-sunken px-3 py-2">
                <span className={`size-2.5 shrink-0 rounded-full ${s.cls}`} aria-hidden />
                <span className="text-sm">{s.label}</span>
                <span className="ml-auto font-semibold tabular-nums">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <figure data-forecast-30>
          <figcaption className="mb-2 text-sm text-muted">{t('srsStats.theDenHan30')}</figcaption>
          <ol className="flex h-32 items-end gap-[2px]">
            {forecast.map((n, i) => (
              <li key={i} className="flex h-full flex-1 flex-col justify-end" aria-label={t('srsStats.the', { v: i === 0 ? t('srsStats.today') : t('srsStats.inDays', { n: i }), n })}>
                <span className={`w-full rounded-t-sm ${i === 0 ? 'bg-ai' : 'bg-ai-soft'}`} style={{ height: `${n ? Math.max(4, (n / max) * 100) : 0}%` }} />
              </li>
            ))}
          </ol>
          <div className="mt-1 flex justify-between text-[11px] text-muted" aria-hidden>
            <span>{t('srsStats.homNay')}</span>
            <span>+10</span>
            <span>+20</span>
            <span>{t('srsStats.29Ngay')}</span>
          </div>
          <p className="mt-2 text-xs text-muted">{t('srsStats.caoNhatTheNgay', { max })}</p>
        </figure>
      </div>
    </section>
  )
}

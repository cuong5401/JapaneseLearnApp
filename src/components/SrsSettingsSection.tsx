import { useMemo, type ChangeEvent } from 'react'
import { useCards } from '../hooks/useProgress'
import { dailyLoad } from '../lib/srs'
import { RETENTION_RANGE, SRS_DEFAULTS, srsSettings, useSrsSettings } from '../lib/srsSettings'
import { t } from '../i18n'

const field = 'h-11 w-28 rounded-lg border-2 border-line bg-surface px-3 text-right tabular-nums outline-none focus:border-ai pointer-coarse:text-base'

/** Cài đặt → Ôn tập: mức ghi nhớ mong muốn (FSRS), khoảng cách tối đa, fuzz, giới hạn mỗi ngày. */
export function SrsSettingsSection() {
  const s = useSrsSettings()
  const cards = useCards()
  const list = useMemo(() => Object.values(cards), [cards])
  const reviewCount = useMemo(() => list.filter((c) => c.state === 2).length, [list])
  // Ước tính tải ôn mỗi ngày ở mức đang chọn so với mức mặc định 90%
  const loadNow = useMemo(() => dailyLoad(list, s), [list, s])
  const loadBase = useMemo(() => dailyLoad(list, { ...s, retention: SRS_DEFAULTS.retention }), [list, s])

  const number = (key: 'maxInterval' | 'newPerDay' | 'reviewsPerDay') => (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (e.target.value !== '' && Number.isFinite(v)) srsSettings.set({ [key]: v })
  }

  return (
    <section id="srs" aria-labelledby="srs-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6" data-srs-settings>
      <h2 id="srs-title" className="text-lg font-bold">{t('common.onTap')}</h2>
      <p className="mt-1 text-sm text-muted">{t('srsSettingsSection.lichOnDungThuat')}</p>

      <label className="mt-5 block">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{t('srsSettingsSection.mucGhiNhoMong')}</span>
          <span className="text-2xl font-bold tabular-nums" data-retention-value>
            {Math.round(s.retention * 100)}%
          </span>
        </span>
        <input
          type="range"
          min={RETENTION_RANGE[0]}
          max={RETENTION_RANGE[1]}
          step={0.01}
          value={s.retention}
          onChange={(e) => srsSettings.set({ retention: Number(e.target.value) })}
          className="mt-1 h-11 w-full cursor-pointer accent-[var(--ai)]"
          aria-describedby="retention-help"
        />
        <span className="flex justify-between text-xs text-muted" aria-hidden>
          <span>{t('srsSettingsSection.80OnIt')}</span>
          <span>{t('srsSettingsSection.95NhoChac')}</span>
        </span>
      </label>
      <p id="retention-help" className="mt-2 text-sm text-muted">{t('srsSettingsSection.caoHonThiNho')}{reviewCount > 0 ? (
          <span className="mt-1 block text-ink" data-load-estimate>{t('srsSettingsSection.voiTheDangOn', { reviewCount, toFixed: loadNow.toFixed(1), v: Math.abs(s.retention - SRS_DEFAULTS.retention) > 0.001 &&
              t(loadNow >= loadBase ? 'srsSettings.loadMore' : 'srsSettings.loadLess', { base: loadBase.toFixed(1), pct: Math.round(Math.abs(loadNow / Math.max(loadBase, 0.01) - 1) * 100) }) })}</span>
        ) : (
          <span className="mt-1 block">{t('srsSettingsSection.chuaDuDuLieu')}</span>
        )}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3">
          <span>{t('srsSettingsSection.theMoiToiDa')}</span>
          <input type="number" inputMode="numeric" min={0} max={9999} value={s.newPerDay} onChange={number('newPerDay')} className={field} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>{t('srsSettingsSection.luotOnToiDa')}</span>
          <input type="number" inputMode="numeric" min={0} max={99999} value={s.reviewsPerDay} onChange={number('reviewsPerDay')} className={field} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>{t('srsSettingsSection.khoangCachToiDa')}</span>
          <input type="number" inputMode="numeric" min={7} max={36500} value={s.maxInterval} onChange={number('maxInterval')} className={field} />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span>{t('srsSettingsSection.xaoNheNgayOn')}<span className="block text-xs text-muted">{t('srsSettingsSection.deTheHocCung')}</span>
          </span>
          <input type="checkbox" checked={s.fuzz} onChange={(e) => srsSettings.set({ fuzz: e.target.checked })} className="size-5 accent-[var(--ai)]" />
        </label>
      </div>
    </section>
  )
}

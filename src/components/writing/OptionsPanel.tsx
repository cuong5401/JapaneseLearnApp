import { useId, type ReactNode } from 'react'
import { COLS, PAPERS, PER_PAGE, ROWS, fadeCount, setWritingOptions, type Guide, type WritingOptions } from '../../lib/writing/options'
import { Segmented } from '../Segmented'
import { t } from '../../i18n'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 cursor-pointer accent-[var(--ai)]" />
      <span>{children}</span>
    </label>
  )
}

const GUIDE_LABEL: Record<Guide, string> = { get cross() {
    return t('optionsPanel.chuThapNetDut')
  }, get quad() {
    return t('optionsPanel.4OVuong')
  }, get none() {
    return t('optionsPanel.khong')
  } }
const num = <T extends number>(list: readonly T[], unit = '') => list.map((v) => ({ value: v, label: `${v}${unit}` }))

/** Tùy chọn phiếu (lưu ngay, lần sau mở lại giữ nguyên). */
export function OptionsPanel({ o, hasKanji }: { o: WritingOptions; hasKanji: boolean }) {
  const set = setWritingOptions
  const fadeId = useId()
  const fades = fadeCount(o)
  return (
    <section aria-labelledby="writing-options" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h2 id="writing-options" className="mb-3 text-lg font-bold">{t('optionsPanel.tuyChon')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('optionsPanel.khoGiayDoc')}>
          <Segmented size="sm" label={t('optionsPanel.khoGiay')} value={o.paper} onChange={(paper) => set({ paper })} options={PAPERS.map((p) => ({ value: p, label: p }))} />
        </Field>
        <Field label={t('optionsPanel.soChuMoiTrang')}>
          <Segmented size="sm" label={t('optionsPanel.soChuMoiTrang')} value={o.perPage} onChange={(perPage) => set({ perPage })} options={num(PER_PAGE)} />
        </Field>
        <Field label={t('optionsPanel.soOMoiHang')}>
          <Segmented size="sm" label={t('optionsPanel.soOMoiHang')} value={o.cols} onChange={(cols) => set({ cols })} options={num(COLS)} />
        </Field>
        <Field label={t('optionsPanel.soHangTapViet2')}>
          <Segmented size="sm" label={t('optionsPanel.soHangTapViet')} value={o.rows} onChange={(rows) => set({ rows })} options={num(ROWS)} />
        </Field>
        <Field label={t('optionsPanel.duongKeTrongO')}>
          <Segmented size="sm" label={t('optionsPanel.duongKeTrongO')} value={o.guide} onChange={(guide) => set({ guide })} options={(['cross', 'quad', 'none'] as Guide[]).map((g) => ({ value: g, label: GUIDE_LABEL[g] }))} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fadeId} className="flex items-baseline justify-between text-sm font-medium text-muted">
            <span>{t('optionsPanel.oChuMoDe')}</span>
            <span className="text-ink tabular-nums" data-fade-value>
              {o.fade === 'row' ? t('optionsPanel.caHang') : t('optionsPanel.o', { fades })}
            </span>
          </label>
          <input
            id={fadeId}
            type="range"
            min={0}
            max={o.cols}
            value={fades}
            onChange={(e) => {
              const v = Number(e.target.value)
              set({ fade: v >= o.cols ? 'row' : v })
            }}
            className="h-11 w-full cursor-pointer accent-[var(--ai)]"
          />
        </div>
      </div>
      <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
        <Toggle checked={o.fadeGradient} onChange={(fadeGradient) => set({ fadeGradient })}>{t('optionsPanel.chuMoNhatDan')}</Toggle>
        <Toggle checked={o.numbers} onChange={(numbers) => set({ numbers })}>{t('optionsPanel.soThuTuNet')}</Toggle>
      </div>
      <fieldset className="mt-3 border-t border-line pt-3">
        <legend className="sr-only">{t('optionsPanel.hangTieuDe2')}</legend>
        <p className="text-sm font-medium text-muted">{t('optionsPanel.hangTieuDe', { v: hasKanji ? '' : t('optionsPanel.kanaNote') })}</p>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Toggle checked={o.showHanViet} onChange={(showHanViet) => set({ showHanViet })}>{t('optionsPanel.hanVietSoThu')}</Toggle>
          <Toggle checked={o.showOn} onChange={(showOn) => set({ showOn })}>{t('optionsPanel.amOn')}</Toggle>
          <Toggle checked={o.showKun} onChange={(showKun) => set({ showKun })}>{t('optionsPanel.amKun')}</Toggle>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm">{t('optionsPanel.tuViDu')}</span>
          <Segmented
            size="sm"
            label={t('optionsPanel.soTuViDu')}
            value={o.examples}
            onChange={(examples) => set({ examples })}
            options={[
              { value: 0, label: t('optionsPanel.khong') },
              { value: 1, label: t('optionsPanel.1Tu') },
              { value: 2, label: t('optionsPanel.2Tu') },
            ]}
          />
        </div>
      </fieldset>
    </section>
  )
}

import { useId, type ReactNode } from 'react'
import { COLS, PAPERS, PER_PAGE, ROWS, fadeCount, setWritingOptions, type Guide, type WritingOptions } from '../../lib/writing/options'
import { Segmented } from '../Segmented'

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

const GUIDE_LABEL: Record<Guide, string> = { cross: 'Chữ thập nét đứt', quad: '4 ô vuông', none: 'Không' }
const num = <T extends number>(list: readonly T[], unit = '') => list.map((v) => ({ value: v, label: `${v}${unit}` }))

/** Tùy chọn phiếu (lưu ngay, lần sau mở lại giữ nguyên). */
export function OptionsPanel({ o, hasKanji }: { o: WritingOptions; hasKanji: boolean }) {
  const set = setWritingOptions
  const fadeId = useId()
  const fades = fadeCount(o)
  return (
    <section aria-labelledby="writing-options" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h2 id="writing-options" className="mb-3 text-lg font-bold">
        Tùy chọn
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Khổ giấy (dọc)">
          <Segmented size="sm" label="Khổ giấy" value={o.paper} onChange={(paper) => set({ paper })} options={PAPERS.map((p) => ({ value: p, label: p }))} />
        </Field>
        <Field label="Số chữ mỗi trang">
          <Segmented size="sm" label="Số chữ mỗi trang" value={o.perPage} onChange={(perPage) => set({ perPage })} options={num(PER_PAGE)} />
        </Field>
        <Field label="Số ô mỗi hàng">
          <Segmented size="sm" label="Số ô mỗi hàng" value={o.cols} onChange={(cols) => set({ cols })} options={num(COLS)} />
        </Field>
        <Field label="Số hàng tập viết mỗi chữ">
          <Segmented size="sm" label="Số hàng tập viết" value={o.rows} onChange={(rows) => set({ rows })} options={num(ROWS)} />
        </Field>
        <Field label="Đường kẻ trong ô">
          <Segmented size="sm" label="Đường kẻ trong ô" value={o.guide} onChange={(guide) => set({ guide })} options={(['cross', 'quad', 'none'] as Guide[]).map((g) => ({ value: g, label: GUIDE_LABEL[g] }))} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fadeId} className="flex items-baseline justify-between text-sm font-medium text-muted">
            <span>Ô chữ mờ để tô (hàng đầu)</span>
            <span className="text-ink tabular-nums" data-fade-value>
              {o.fade === 'row' ? 'Cả hàng' : `${fades} ô`}
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
        <Toggle checked={o.fadeGradient} onChange={(fadeGradient) => set({ fadeGradient })}>
          Chữ mờ nhạt dần từ trái sang phải
        </Toggle>
        <Toggle checked={o.numbers} onChange={(numbers) => set({ numbers })}>
          Số thứ tự nét ở ô chữ mẫu
        </Toggle>
      </div>
      <fieldset className="mt-3 border-t border-line pt-3">
        <legend className="sr-only">Hàng tiêu đề</legend>
        <p className="text-sm font-medium text-muted">Hàng tiêu đề {hasKanji ? '' : '(kana luôn hiện romaji và chữ bảng kia)'}</p>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Toggle checked={o.showHanViet} onChange={(showHanViet) => set({ showHanViet })}>
            Hán Việt + số thứ tự
          </Toggle>
          <Toggle checked={o.showOn} onChange={(showOn) => set({ showOn })}>
            Âm On
          </Toggle>
          <Toggle checked={o.showKun} onChange={(showKun) => set({ showKun })}>
            Âm Kun
          </Toggle>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm">Từ ví dụ</span>
          <Segmented
            size="sm"
            label="Số từ ví dụ"
            value={o.examples}
            onChange={(examples) => set({ examples })}
            options={[
              { value: 0, label: 'Không' },
              { value: 1, label: '1 từ' },
              { value: 2, label: '2 từ' },
            ]}
          />
        </div>
      </fieldset>
    </section>
  )
}

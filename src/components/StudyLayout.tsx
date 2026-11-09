import type { ReactNode } from 'react'
import { AnimatedNumber } from './AnimatedNumber'

/** Khung trang học: rộng 560px, desktop thêm cột 280px nên tiêu đề và thẻ cùng thẳng hàng. */
export const STUDY_PAGE = 'mx-auto w-full max-w-[560px] lg:max-w-[840px] xl:max-w-[880px]'

/**
 * Khung trang bài học (từ vựng, kanji, bộ thủ, sổ tay): độ rộng cố định theo breakpoint, giống nhau ở cả
 * 3 tab Danh sách / Flashcard / Quiz để đổi tab không làm trang co giãn.
 */
export const LESSON_PAGE = 'mx-auto w-full max-w-[880px]'

/**
 * Vùng nội dung tab: cao tối thiểu bằng vùng flashcard (thẻ clamp(21rem,60vh,28rem) + hàng nút trên/dưới)
 * để đổi tab (danh sách ngắn ↔ flashcard) không làm trang co lại.
 */
export const TAB_AREA = 'min-h-[calc(clamp(21rem,60vh,28rem)+9rem)]'

/** Vùng học (tối đa 560px) và cột thông tin phiên 280px bên phải trên desktop. */
export function StudyLayout({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,560px)_250px] lg:gap-8 xl:grid-cols-[minmax(0,560px)_280px] xl:gap-10">
      <div className="min-w-0">{children}</div>
      <aside className="hidden lg:block" aria-label="Thông tin phiên học">
        <div className="sticky top-10">{aside}</div>
      </aside>
    </div>
  )
}

export interface SessionStat {
  label: string
  value: number
  total?: number
  tone?: 'default' | 'good' | 'bad'
}

const TONE = { default: 'text-ink', good: 'text-matsu', bad: 'text-beni' }

export function SessionPanel({
  title = 'Phiên học',
  stats,
  shortcuts,
}: {
  title?: string
  stats: SessionStat[]
  shortcuts: { keys: string[]; label: string }[]
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-muted">{title}</h2>
        <dl className="mt-3 space-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className={`text-xl font-bold ${TONE[s.tone ?? 'default']}`}>
                <AnimatedNumber value={s.value} />
                {s.total !== undefined && <span className="text-sm font-normal text-muted">/{s.total}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-2xl border border-line p-5">
        <h2 className="text-sm font-semibold text-muted">Phím tắt</h2>
        <ul className="mt-3 space-y-2.5 text-sm">
          {shortcuts.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3">
              <span>{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-7 rounded-md border border-line border-b-2 bg-surface px-1.5 py-0.5 text-center font-sans text-xs font-semibold text-muted"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

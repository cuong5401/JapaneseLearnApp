import { useMemo, useState, type ReactNode } from 'react'
import { useCards, useStats } from '../hooks/useProgress'
import { LESSON_SIZES, continueLesson, lessonProgress, splitLessons, type LessonProgress, type LessonState } from '../lib/lessons'
import { setLessonSize, useLessonSize } from '../lib/settings'
import { AnimatedNumber } from './AnimatedNumber'
import { ButtonLink, CardLink } from './Pressable'
import { ProgressBar } from './ProgressBar'
import { Segmented } from './Segmented'
import { Stagger, StaggerItem } from './Stagger'

const PER_PAGE = 40

const STATE_LABEL: Record<LessonState, { text: string; cls: string }> = {
  new: { text: 'Chưa học', cls: 'text-muted' },
  learning: { text: 'Đang học', cls: 'text-ai' },
  mastered: { text: 'Đã thuộc', cls: 'text-matsu' },
}

function LessonTile({ href, index, preview, progress, current }: { href: string; index: number; preview: ReactNode; progress: LessonProgress; current: boolean }) {
  const state = STATE_LABEL[progress.state]
  return (
    <CardLink
      to={href}
      aria-label={`Bài ${index + 1}, ${state.text}, đã học ${progress.learned}/${progress.total}`}
      className={`flex h-full flex-col rounded-xl border p-3.5 transition-colors ${
        current ? 'border-ai bg-ai-soft' : progress.state === 'mastered' ? 'border-matsu/50 bg-surface' : 'border-line bg-surface hover:border-ai'
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">Bài {index + 1}</span>
        <span className={`text-xs font-medium ${state.cls}`}>{state.text}</span>
      </span>
      <span lang="ja" className="mt-1 truncate font-jp text-sm text-muted">
        {preview}
      </span>
      <span className="mt-auto flex items-center gap-2 pt-3">
        <ProgressBar {...progress} label={`Tiến độ bài ${index + 1}`} />
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {progress.learned}/{progress.total}
        </span>
      </span>
    </CardLink>
  )
}

interface Props<T extends { id: string }> {
  items: T[]
  /** Đơn vị đếm: "từ", "chữ", "bộ", "mục" */
  unit: string
  /** Tên bộ cho nhãn thanh tiến độ */
  title: string
  /** Đường dẫn tới bài thứ `index` (bắt đầu từ 0) */
  href: (index: number) => string
  /** Vài mục đầu của bài hiển thị trên ô bài */
  preview: (lesson: T[]) => ReactNode
  /** Nội dung chen giữa phần tóm tắt và lưới bài (thẻ "Từ chưa thuộc"…) */
  between?: ReactNode
  /** Liên kết phụ cạnh tiêu đề "Các bài" */
  links?: ReactNode
}

/**
 * Tóm tắt bộ + lưới các bài (chia theo cài đặt 20/30/50), nút "Học tiếp", phân trang 40 bài.
 * Dùng chung cho từ vựng, chữ Hán, bộ thủ và sổ tay.
 */
export function LessonGrid<T extends { id: string }>({ items, unit, title, href, preview, between, links }: Props<T>) {
  const size = useLessonSize()
  const cards = useCards()
  const lessons = useMemo(() => splitLessons(items, size), [items, size])
  const progress = useMemo(() => lessons.map((l) => lessonProgress(l.map((w) => w.id), cards)), [lessons, cards])
  const next = continueLesson(progress)
  const allIds = useMemo(() => items.map((w) => w.id), [items])
  const stats = useStats(allIds)
  const pages = Math.ceil(lessons.length / PER_PAGE)
  const [page, setPage] = useState(() => Math.floor(next / PER_PAGE))
  const shownPage = Math.min(page, Math.max(0, pages - 1))

  if (items.length === 0) return <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">Chưa có mục nào.</p>

  return (
    <>
      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="text-sm text-muted">
            <AnimatedNumber value={items.length} className="font-semibold text-ink" /> {unit}, chia thành {lessons.length} bài
          </p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar {...stats} label={`Tiến độ ${title}`} />
            <span className="shrink-0 text-sm tabular-nums text-muted">
              {stats.learned}/{stats.total}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="text-muted">Mỗi bài</span>
            <Segmented
              size="sm"
              label={`Số ${unit} mỗi bài`}
              value={size}
              onChange={(v) => {
                setLessonSize(v)
                setPage(0)
              }}
              options={LESSON_SIZES.map((n) => ({ value: n, label: `${n} ${unit}` }))}
            />
          </div>
        </div>
        <ButtonLink to={href(next)} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-ai px-6 font-semibold text-on-ai hover:opacity-90">
          {progress[next]?.state === 'learning' ? `Học tiếp Bài ${next + 1}` : `Học Bài ${next + 1}`}
        </ButtonLink>
      </section>

      {between}

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Các bài</h2>
        {links}
      </div>

      {pages > 1 && (
        <nav aria-label="Trang danh sách bài" className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: pages }, (_, p) => (
            <button
              key={p}
              type="button"
              aria-current={p === shownPage ? 'page' : undefined}
              onClick={() => setPage(p)}
              className={`min-h-10 rounded-lg border px-3 text-sm tabular-nums ${
                p === shownPage ? 'border-ai bg-ai-soft font-semibold text-ai' : 'border-line text-muted hover:text-ink'
              }`}
            >
              Bài {p * PER_PAGE + 1}–{Math.min(lessons.length, (p + 1) * PER_PAGE)}
            </button>
          ))}
        </nav>
      )}

      <Stagger key={`${size}-${shownPage}`} as="ol" step={0.012} className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {lessons.slice(shownPage * PER_PAGE, (shownPage + 1) * PER_PAGE).map((l, i) => {
          const index = shownPage * PER_PAGE + i
          return (
            <StaggerItem as="li" key={index}>
              <LessonTile href={href(index)} index={index} preview={preview(l)} progress={progress[index]} current={index === next} />
            </StaggerItem>
          )
        })}
      </Stagger>
    </>
  )
}

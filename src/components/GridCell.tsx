import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Lớp kích thước & cỡ chữ, ví dụ "size-40 text-8xl" */
  className?: string
  tone?: 'default' | 'correct' | 'wrong'
}

const TONES = {
  default: 'bg-surface border-cell-line',
  correct: 'bg-matsu-soft border-matsu',
  wrong: 'bg-beni-soft border-beni',
}

/** Ô giấy tập viết (原稿用紙) có đường kẻ chữ thập — khung hiển thị chữ Nhật. */
export function GridCell({ children, className = '', tone = 'default' }: Props) {
  return (
    <div
      lang="ja"
      className={`relative grid shrink-0 place-items-center border-2 rounded-[3px] font-jp leading-none ${TONES[tone]} ${className}`}
    >
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1="50" y1="0" x2="50" y2="100" stroke="var(--cell-guide)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="var(--cell-guide)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="relative">{children}</span>
    </div>
  )
}

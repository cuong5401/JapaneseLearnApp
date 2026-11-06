import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Lớp kích thước (chỉ cần chiều rộng, ô luôn vuông), ví dụ "size-40" hoặc "w-full" */
  className?: string
  tone?: 'default' | 'correct' | 'wrong'
  /**
   * Cỡ chữ tính theo tỉ lệ chiều rộng của chính ô (0–1). Mặc định: 0.62 cho 1 ký tự,
   * với chuỗi dài hơn thì chia đều để không bao giờ vượt viền.
   */
  fit?: number
}

const TONES = {
  default: 'bg-surface border-cell-line',
  correct: 'bg-matsu-soft border-matsu',
  wrong: 'bg-beni-soft border-beni',
}

function autoFit(children: ReactNode): number {
  const len = typeof children === 'string' ? [...children].length : 1
  return len <= 1 ? 0.62 : Math.min(0.62, 0.84 / len)
}

/**
 * Ô giấy tập viết (原稿用紙) có đường kẻ chữ thập — khung hiển thị chữ Nhật.
 * Ô là một container (container-type: inline-size) nên cỡ chữ đi theo kích thước ô (cqw),
 * không theo viewport: ô to thì chữ to, ô nhỏ thì chữ nhỏ, luôn nằm giữa và trong viền.
 */
export function GridCell({ children, className = '', tone = 'default', fit }: Props) {
  const ratio = fit ?? autoFit(children)
  return (
    <div
      lang="ja"
      data-gridcell
      className={`@container relative grid aspect-square shrink-0 place-items-center overflow-hidden rounded-[3px] border-2 font-jp ${TONES[tone]} ${className}`}
    >
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1="50" y1="0" x2="50" y2="100" stroke="var(--cell-guide)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="var(--cell-guide)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <span data-gridcell-glyph className="relative block whitespace-nowrap leading-none" style={{ fontSize: `${ratio * 100}cqw` }}>
        {children}
      </span>
    </div>
  )
}

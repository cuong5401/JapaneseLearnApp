import type { NotebookColor } from '../../lib/notebooks'

/** Ô màu nhỏ của sổ tay (màu lấy từ biến CSS --nb-*, đổi theo theme). */
export function BookColor({ color, className = 'size-3.5' }: { color: NotebookColor; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-[3px] ${className}`} style={{ background: `var(--nb-${color})` }} />
}

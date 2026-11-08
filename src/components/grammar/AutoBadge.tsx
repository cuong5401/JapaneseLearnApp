import { useGrammarChecked } from '../../lib/grammarChecked'
import type { GrammarEntry } from '../../types'

/** Nhãn cho mẫu Kotonoha tự soạn: "chưa kiểm tra" (vàng) cho đến khi bạn bấm "Đã kiểm tra". */
export function AutoBadge({ g, className = '' }: { g: GrammarEntry; className?: string }) {
  const checked = g.id in useGrammarChecked()
  if (!g.auto) return null
  return (
    <span
      data-auto-badge={checked ? 'checked' : 'unchecked'}
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        checked ? 'bg-sunken text-muted' : 'bg-kihada-soft text-ink'
      } ${className}`}
    >
      {checked ? 'Kotonoha soạn' : 'Kotonoha soạn · chưa kiểm tra'}
    </span>
  )
}

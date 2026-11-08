import { useRef, type PointerEvent } from 'react'
import { isSaved, useNotebooks } from '../../lib/notebooks'
import { quickSave } from '../../lib/quickSave'
import { openSaveSheet } from '../../lib/saveSheet'

const HOLD_MS = 500
const MOVE_TOLERANCE = 8

export function BookmarkIcon({ filled, className = 'size-5' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

/**
 * Nút đánh dấu: bấm mở sheet "Lưu vào sổ tay"; nhấn giữ (hoặc chuột phải) thì lưu nhanh.
 * Chặn sự kiện lan ra ngoài để không lật flashcard / không mở chi tiết của dòng chứa nó.
 */
export function BookmarkButton({ itemRef, label = 'mục này', size = 'md', className = '' }: { itemRef: string; label?: string; size?: 'sm' | 'md'; className?: string }) {
  const state = useNotebooks()
  const saved = isSaved(state, itemRef)
  const hold = useRef<{ timer?: ReturnType<typeof setTimeout>; x: number; y: number; fired: boolean }>({ x: 0, y: 0, fired: false })

  const clear = () => clearTimeout(hold.current.timer)

  const onPointerDown = (e: PointerEvent) => {
    e.stopPropagation()
    if (e.button !== 0) return
    clear()
    hold.current = {
      x: e.clientX,
      y: e.clientY,
      fired: false,
      timer: setTimeout(() => {
        hold.current.fired = true
        navigator.vibrate?.(15)
        quickSave(itemRef)
      }, HOLD_MS),
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > MOVE_TOLERANCE) clear()
  }

  const dims = size === 'sm' ? 'size-9' : 'size-11'
  return (
    <button
      type="button"
      data-bookmark={itemRef}
      aria-label={saved ? `Đã lưu ${label} vào sổ tay. Đổi sổ` : `Lưu ${label} vào sổ tay`}
      aria-pressed={saved}
      title="Lưu vào sổ tay (nhấn giữ để lưu nhanh)"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={clear}
      onPointerCancel={clear}
      onPointerLeave={clear}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        clear()
        if (!hold.current.fired) quickSave(itemRef)
        hold.current.fired = true
      }}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        if (hold.current.fired) {
          hold.current.fired = false
          return
        }
        openSaveSheet(itemRef)
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={`${dims} grid shrink-0 touch-manipulation select-none place-items-center rounded-full transition-colors [-webkit-touch-callout:none] ${
        saved ? 'text-kihada hover:bg-kihada-soft' : 'text-muted hover:bg-sunken hover:text-ink'
      } ${className}`}
    >
      <BookmarkIcon filled={saved} className={size === 'sm' ? 'size-[18px]' : 'size-5'} />
    </button>
  )
}

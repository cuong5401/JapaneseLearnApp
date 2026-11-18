import { motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Hộp xác nhận của app (thay cho window.confirm): nút chính được focus sẵn, Tab chỉ đi vòng trong hộp,
 * Esc hoặc chạm nền = `onCancel`. Phím khác không lọt xuống trang (phím tắt flashcard / quiz).
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = false,
}: {
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  /** Nút xác nhận là hành động mất mát (viền đỏ) */
  danger?: boolean
}) {
  const id = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const cancelCb = useRef(onCancel)
  useEffect(() => {
    cancelCb.current = onCancel
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    // Bắt ở pha capture để phím không tới các phím tắt của trang nằm dưới.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        cancelCb.current()
        return
      }
      if (e.key === 'Tab') {
        const items = [...(boxRef.current?.querySelectorAll<HTMLElement>('button') ?? [])]
        if (items.length === 0) return
        const i = items.indexOf(document.activeElement as HTMLElement)
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1
        e.preventDefault()
        items[next].focus()
        return
      }
      if (!boxRef.current?.contains(e.target as Node)) e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <motion.div aria-hidden className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} onClick={onCancel} />
      <motion.div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={children ? `${id}-body` : undefined}
        data-confirm-dialog
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-[0_10px_40px_rgb(0_0_0/0.22)]"
      >
        <h2 id={`${id}-title`} className="text-lg font-bold">
          {title}
        </h2>
        {children && (
          <div id={`${id}-body`} className="mt-1 text-sm text-muted">
            {children}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className="min-h-12 rounded-xl bg-ai font-semibold text-on-ai hover:opacity-90">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-12 rounded-xl border font-semibold ${danger ? 'border-beni text-beni hover:bg-beni-soft' : 'border-line hover:bg-sunken'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

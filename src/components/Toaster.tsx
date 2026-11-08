import { AnimatePresence, motion } from 'motion/react'
import { dismissToast, useToast } from '../lib/toast'

/** Hiện toast hiện tại; đặt cùng vùng với thông báo cập nhật (trên thanh điều hướng điện thoại). */
export function Toaster() {
  const toast = useToast()
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-6 lg:pl-[240px]"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="pointer-events-auto flex max-w-sm items-center gap-1 rounded-xl bg-ink py-1.5 pr-1.5 pl-4 text-sm font-medium text-paper shadow-lg shadow-ink/20"
            data-toast
          >
            <span className="py-1.5">{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.run()
                  dismissToast()
                }}
                className="min-h-9 rounded-lg px-3 font-semibold text-kihada hover:bg-paper/10"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

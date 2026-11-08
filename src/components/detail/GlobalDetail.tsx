import { AnimatePresence, motion } from 'motion/react'
import { Suspense, lazy, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useDetailStack } from '../../hooks/useDetailStack'
import { DESKTOP, useMediaQuery } from '../../hooks/useMediaQuery'
import { BottomSheet } from '../BottomSheet'
import { PageSkeleton } from '../LoadState'

// Nội dung chi tiết (từ, chữ Hán, bộ thủ) chỉ tải khi mở lần đầu: không làm nặng bundle chính.
const DetailStackView = lazy(() => import('./DetailStack').then((m) => ({ default: m.DetailStackView })))

/** Trang tự hiển thị ngăn xếp của mình (Kanji), không dùng drawer toàn cục. */
const OWN_STACK = new Set(['/kanji'])

/**
 * Chi tiết từ / chữ Hán / bộ thủ mở từ bất kỳ trang nào (?xem=…): kết quả tìm kiếm, từ liên quan,
 * mục trong sổ tay… Desktop là drawer bên phải, điện thoại là bottom sheet. Không rời trang đang xem.
 */
export function GlobalDetail() {
  const { pathname } = useLocation()
  const stack = useDetailStack()
  const desktop = useMediaQuery(DESKTOP)
  const open = stack.frames.length > 0 && !OWN_STACK.has(pathname)
  const close = () => stack.close()

  useEffect(() => {
    if (!open || !desktop) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && stack.close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, desktop, stack])

  if (!desktop)
    return (
      <BottomSheet open={open} onClose={close} label="Chi tiết">
        <Suspense fallback={<PageSkeleton rows={4} />}>
              <DetailStackView frames={stack.frames} onPush={stack.push} onBack={stack.back} />
            </Suspense>
      </BottomSheet>
    )

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div className="absolute inset-0 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết"
            className="absolute inset-y-0 right-0 w-[min(440px,100vw)] overflow-y-auto overscroll-contain border-l border-line bg-paper p-6 shadow-[-8px_0_30px_rgb(0_0_0/0.15)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42 }}
          >
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={close} className="-mt-2 -mr-2 min-h-10 rounded-lg px-3 text-sm text-muted hover:text-ink">
                Đóng
              </button>
            </div>
            <Suspense fallback={<PageSkeleton rows={4} />}>
              <DetailStackView frames={stack.frames} onPush={stack.push} onBack={stack.back} />
            </Suspense>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

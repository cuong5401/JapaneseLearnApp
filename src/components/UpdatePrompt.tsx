import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const HOUR = 60 * 60 * 1000

/**
 * Thông báo nhỏ của service worker:
 *  - "Có bản cập nhật" + nút "Tải lại" khi bản mới đã tải xong (registerType: 'prompt');
 *  - "Đã sẵn sàng học offline" một lần, khi vỏ app vừa được lưu lần đầu.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // App để mở lâu (đã cài trên điện thoại): mỗi giờ hỏi lại xem có bản mới không.
      if (registration) setInterval(() => registration.update().catch(() => {}), HOUR)
    },
  })

  // Thông báo offline tự ẩn sau vài giây; thông báo cập nhật đợi người dùng chọn.
  useEffect(() => {
    if (!offlineReady || needRefresh) return
    const t = setTimeout(() => setOfflineReady(false), 5000)
    return () => clearTimeout(t)
  }, [offlineReady, needRefresh, setOfflineReady])

  const open = needRefresh || offlineReady
  const close = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6 lg:justify-end lg:px-8"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-surface py-2.5 pr-2 pl-4 shadow-lg shadow-ink/10"
          >
            <span lang="ja" aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[3px] bg-ai font-jp text-base text-on-ai">
              {needRefresh ? '新' : '言'}
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium">{needRefresh ? 'Có bản cập nhật' : 'Đã sẵn sàng học offline'}</span>
            {needRefresh && (
              <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="min-h-10 shrink-0 rounded-lg bg-ai px-3.5 text-sm font-semibold text-on-ai hover:opacity-90"
              >
                Tải lại
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Đóng thông báo"
              className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { lockedScrollY } from '../lib/scrollLock'

const KEY = 'jla:scroll:'
/** Chờ dữ liệu tối đa chừng này rồi cuộn tới chỗ gần nhất có thể. */
const MAX_WAIT = 5000
/** Không còn khối "Đang tải" mà chiều cao trang đứng yên chừng này thì coi là xong. */
const STABLE_MS = 300

/** Vùng main còn khối giữ chỗ đang tải (skeleton có role="status" aria-label="Đang tải…"). */
const loading = () => Boolean(document.querySelector('main [role="status"][aria-label^="Đang tải"]'))

const storageKey = (key: string, pathname: string, search: string) => `${KEY}${key}:${pathname}${search}`

function readY(k: string): number | null {
  try {
    const v = sessionStorage.getItem(k)
    const y = v === null ? NaN : Number(v)
    return Number.isFinite(y) && y > 0 ? y : null
  } catch {
    return null
  }
}

/**
 * Giữ vị trí cuộn cho MỌI trang (gắn ở Layout), theo từng mục lịch sử (`location.key`, còn nguyên qua F5):
 *  - Vào trang mới (PUSH / REPLACE sang đường dẫn khác): lên đầu trang.
 *  - Back / Forward / F5 (POP sang đường dẫn khác hoặc lần tải đầu): chờ dữ liệu hiển thị xong (không còn
 *    skeleton "Đang tải", trang đủ cao) rồi cuộn MỘT lần tới vị trí cũ, không nhảy giữa chừng. Người dùng tự cuộn,
 *    chạm hoặc bấm phím trong lúc chờ thì thôi không khôi phục.
 *  - Chỉ đổi tham số trên cùng trang (mở panel ?k=, đổi tab…): không đụng tới vị trí cuộn.
 */
export function useScrollRestore() {
  const location = useLocation()
  const navType = useNavigationType()
  const current = useRef(storageKey(location.key, location.pathname, location.search))
  const prevPath = useRef<string | null>(null)
  const restoring = useRef(false)
  const stopRestore = useRef<() => void>(() => {})

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])

  // Ghi vị trí cuộn của mục lịch sử đang xem.
  useEffect(() => {
    const raf = { id: 0 }
    const save = () => {
      cancelAnimationFrame(raf.id)
      raf.id = requestAnimationFrame(() => {
        // Đang khóa cuộn (khung AI điện thoại: body fixed, scrollY = 0) hoặc đang chờ khôi phục: không ghi đè.
        if (restoring.current || lockedScrollY() !== null) return
        try {
          sessionStorage.setItem(current.current, String(Math.round(window.scrollY)))
        } catch {
          // Không lưu được thì thôi.
        }
      })
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      cancelAnimationFrame(raf.id)
      window.removeEventListener('scroll', save)
    }
  }, [])

  // Layout effect: chạy ngay khi URL đổi, trước khi trình duyệt bắn sự kiện cuộn của trang mới.
  useLayoutEffect(() => {
    const k = storageKey(location.key, location.pathname, location.search)
    current.current = k
    const first = prevPath.current === null
    const pageChanged = prevPath.current !== location.pathname
    prevPath.current = location.pathname
    if (!pageChanged) return
    stopRestore.current()
    const y = navType === 'POP' ? readY(k) : null
    if (y === null) {
      if (!first) window.scrollTo(0, 0)
      return
    }
    window.scrollTo(0, 0)
    restoring.current = true
    const started = performance.now()
    let lastH = -1
    let stableSince = started
    let frame = 0
    const CANCEL = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    const stop = () => {
      restoring.current = false
      cancelAnimationFrame(frame)
      for (const t of CANCEL) window.removeEventListener(t, cancel, true)
    }
    const cancel = () => stop()
    for (const t of CANCEL) window.addEventListener(t, cancel, { capture: true, passive: true })
    const tick = () => {
      const now = performance.now()
      const h = document.documentElement.scrollHeight
      if (h !== lastH) {
        lastH = h
        stableSince = now
      }
      const busy = loading()
      const tallEnough = h - window.innerHeight >= y - 1
      const settled = !busy && now - stableSince >= STABLE_MS
      if ((!busy && tallEnough) || settled || now - started > MAX_WAIT) {
        stop()
        window.scrollTo(0, y)
        try {
          sessionStorage.setItem(k, String(Math.round(window.scrollY)))
        } catch {
          // bỏ qua
        }
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    stopRestore.current = stop
    // Chỉ chạy lại khi sang mục lịch sử khác. Đổi tham số trên cùng trang không hủy việc khôi phục đang chờ.
  }, [location.key, location.pathname, location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopRestore.current(), [])
}

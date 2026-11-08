import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const KEY = 'jla:scroll:'

/**
 * Nhớ vị trí cuộn theo từng mục lịch sử (location.key, giữ nguyên qua F5) để Back hoặc tải lại
 * trang quay về đúng chỗ. `ready`: dữ liệu đã hiển thị đủ để cuộn tới vị trí cũ.
 */
export function useScrollMemory(ready: boolean) {
  const { key } = useLocation()
  const restored = useRef<string | null>(null)

  useEffect(() => {
    let frame = 0
    const save = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(KEY + key, String(Math.round(window.scrollY)))
        } catch {
          // Không lưu được thì thôi.
        }
      })
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', save)
    }
  }, [key])

  useEffect(() => {
    if (!ready || restored.current === key) return
    restored.current = key
    let y: number | null = null
    try {
      const v = sessionStorage.getItem(KEY + key)
      y = v === null ? null : Number(v)
    } catch {
      y = null
    }
    if (y !== null && Number.isFinite(y) && y > 0) requestAnimationFrame(() => window.scrollTo(0, y))
  }, [ready, key])
}

import { useEffect, useRef } from 'react'

/**
 * Esc đóng panel không phải modal (panel chi tiết cạnh lưới ở desktop). Nhường cho lớp phủ khác đang mở
 * (sheet, tìm kiếm, hộp xác nhận, khung Hỏi AI) và khi đang gõ trong ô nhập.
 */
export function useEscapeClose(active: boolean, onClose: () => void) {
  const cb = useRef(onClose)
  useEffect(() => {
    cb.current = onClose
  })
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('[aria-modal="true"], [data-ai-dock="open"]')) return
      cb.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
}

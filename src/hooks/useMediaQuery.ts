import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

export const DESKTOP = '(min-width: 1024px)'
/** Đủ chỗ cho lưới + panel chi tiết cạnh nhau (vùng nội dung ~860px sau sidebar). */
export const WIDE_PANEL = '(min-width: 1180px)'

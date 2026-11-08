import { useSyncExternalStore } from 'react'

/** Thông báo ngắn ở đáy màn hình, có thể kèm một nút hành động ("Đổi", "Hoàn tác"…). */
export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

let current: Toast | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function showToast(text: string, action?: Toast['action'], ms = 4000) {
  clearTimeout(timer)
  current = { id: ++seq, text, action }
  notify()
  timer = setTimeout(dismissToast, ms)
}

export function dismissToast() {
  clearTimeout(timer)
  current = null
  notify()
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => current,
  )
}

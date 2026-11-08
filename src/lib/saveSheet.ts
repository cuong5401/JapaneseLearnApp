import { useSyncExternalStore } from 'react'

/** Mục đang mở trong sheet "Lưu vào sổ tay" (một sheet dùng chung, đặt trong Layout). */
let openRef: string | null = null
const listeners = new Set<() => void>()

export function openSaveSheet(ref: string) {
  openRef = ref
  listeners.forEach((l) => l())
}

export function closeSaveSheet() {
  openRef = null
  listeners.forEach((l) => l())
}

export function useSaveSheetRef(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => openRef,
  )
}

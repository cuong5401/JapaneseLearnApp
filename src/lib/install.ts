import { useSyncExternalStore } from 'react'

/**
 * Cài app (PWA).
 *  - Chrome/Edge/Android: giữ lại sự kiện `beforeinstallprompt` để nút "Cài app" gọi được hộp thoại cài.
 *    Module được import trong main.tsx nên bắt được sự kiện dù nó đến trước khi trang render.
 *  - iPhone/iPad (Safari): không có sự kiện này, chỉ cài được qua Chia sẻ → Thêm vào MH chính.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = 'installed' | 'available' | 'ios' | 'unsupported'

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  // iPadOS báo là "Macintosh" nhưng có cảm ứng.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    notify()
  })
}

function getState(): InstallState {
  if (installed || isStandalone()) return 'installed'
  if (deferred) return 'available'
  if (isIOS()) return 'ios'
  return 'unsupported'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getState, () => 'unsupported' as const)
}

/** Mở hộp thoại cài của trình duyệt. Trả true nếu người dùng đồng ý. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  await e.prompt()
  const { outcome } = await e.userChoice
  // Sự kiện chỉ dùng được một lần.
  deferred = null
  notify()
  return outcome === 'accepted'
}

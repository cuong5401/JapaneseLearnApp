import { useEffect, useSyncExternalStore } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'jla:theme'

export const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'Theo hệ thống',
  light: 'Sáng',
  dark: 'Tối',
}

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function apply(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && media().matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

/** Kho giao diện dùng chung: nút ở sidebar / header và lựa chọn ở trang Cá nhân luôn khớp nhau. */
let choice: ThemeChoice = typeof window === 'undefined' ? 'system' : readChoice()
const listeners = new Set<() => void>()

export const theme = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  get: () => choice,
  set(next: ThemeChoice) {
    choice = next
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      /* bỏ qua */
    }
    apply(next)
    listeners.forEach((l) => l())
  },
  cycle() {
    theme.set(choice === 'system' ? 'light' : choice === 'light' ? 'dark' : 'system')
  },
}

export function useTheme() {
  const current = useSyncExternalStore(theme.subscribe, theme.get)

  // Áp giao diện, và theo hệ thống khi chọn "Theo hệ thống".
  useEffect(() => {
    apply(current)
    if (current !== 'system') return
    const mq = media()
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [current])

  return { choice: current, cycle: theme.cycle, set: theme.set }
}

import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'jla:theme'

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

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice)

  useEffect(() => {
    apply(choice)
    if (choice !== 'system') return
    const mq = media()
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [choice])

  const cycle = useCallback(() => {
    setChoice((prev) => {
      const next: ThemeChoice = prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'
      try {
        if (next === 'system') localStorage.removeItem(KEY)
        else localStorage.setItem(KEY, next)
      } catch {
        /* bỏ qua */
      }
      return next
    })
  }, [])

  return { choice, cycle }
}

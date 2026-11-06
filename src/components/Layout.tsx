import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTheme, type ThemeChoice } from '../hooks/useTheme'
import { useDueIds } from '../hooks/useProgress'

const NAV = [
  { to: '/', glyph: '家', label: 'Trang chủ', end: true },
  { to: '/kana', glyph: 'あ', label: 'Kana', end: false },
  { to: '/review', glyph: '復', label: 'Ôn tập', end: false },
  { to: '/progress', glyph: '進', label: 'Tiến độ', end: false },
]

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'Giao diện: theo hệ thống',
  light: 'Giao diện: sáng',
  dark: 'Giao diện: tối',
}

function ThemeIcon({ choice }: { choice: ThemeChoice }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (choice === 'light')
    return (
      <svg viewBox="0 0 24 24" className="size-5" {...common} aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  if (choice === 'dark')
    return (
      <svg viewBox="0 0 24 24" className="size-5" {...common} aria-hidden>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" className="size-5" {...common} aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

export function Layout() {
  const { choice, cycle } = useTheme()
  const due = useDueIds().length
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <span lang="ja" className="grid size-8 place-items-center rounded-[3px] bg-ai font-jp text-lg text-on-ai">
              言
            </span>
            <span>Kotonoha</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-ai-soft text-ai' : 'text-muted hover:text-ink'}`
                }
              >
                {n.label}
                {n.to === '/review' && due > 0 && (
                  <span className="ml-1.5 rounded-full bg-kihada px-1.5 py-0.5 text-xs font-bold text-[#2b2205]">{due}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={cycle}
            aria-label={THEME_LABEL[choice]}
            title={THEME_LABEL[choice]}
            className="ml-auto grid size-11 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink md:ml-0"
          >
            <ThemeIcon choice={choice} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6">
        <Outlet />
      </main>

      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? 'text-ai' : 'text-muted'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      lang="ja"
                      className={`relative grid size-7 place-items-center rounded-[3px] border font-jp text-base leading-none transition-colors ${
                        isActive ? 'border-ai bg-ai text-on-ai' : 'border-cell-line'
                      }`}
                    >
                      {n.glyph}
                      {n.to === '/review' && due > 0 && (
                        <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-kihada px-1 font-sans text-[10px] font-bold leading-4 text-[#2b2205]">
                          {due > 99 ? '99+' : due}
                        </span>
                      )}
                    </span>
                    {n.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

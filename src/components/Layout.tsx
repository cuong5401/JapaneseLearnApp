import { AnimatePresence, motion } from 'motion/react'
import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { useTheme, type ThemeChoice } from '../hooks/useTheme'
import { useDueIds } from '../hooks/useProgress'
import { isInteractiveTarget } from '../lib/keyboard'
import { searchUi, useSearchUi } from '../lib/searchUi'
import { InstallApp } from './InstallApp'
import { UpdatePrompt } from './UpdatePrompt'
import { Toaster } from './Toaster'
import { SaveSheetHost } from './notebook/SaveSheet'
import { GlobalDetail } from './detail/GlobalDetail'

// Hộp tìm kiếm và chỉ mục của nó chỉ tải khi mở lần đầu.
const SearchDialog = lazy(() => import('./SearchDialog'))

interface NavItem {
  to: string
  glyph: string
  label: string
  short?: string
  end: boolean
  /** Ẩn khỏi thanh đáy điện thoại (vẫn có trong sidebar và nav trên) */
  noBottom?: boolean
}

const NAV: NavItem[] = [
  { to: '/', glyph: '家', label: 'Trang chủ', end: true },
  { to: '/kanji', glyph: '漢', label: 'Chữ Hán', end: false },
  { to: '/grammar', glyph: '文', label: 'Ngữ pháp', end: false },
  { to: '/kana', glyph: 'あ', label: 'Luyện kana', short: 'Kana', end: false, noBottom: true },
  { to: '/review', glyph: '復', label: 'Ôn tập', end: false },
  { to: '/notebooks', glyph: '帳', label: 'Sổ tay', end: false },
  { to: '/progress', glyph: '進', label: 'Tiến độ', end: false },
]

/** Bút vẽ: mở bảng vẽ chữ Hán trong hộp tìm kiếm. */
function PenIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  )
}

function SearchIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'Theo hệ thống',
  light: 'Sáng',
  dark: 'Tối',
}

const SLIDE = { type: 'spring', stiffness: 500, damping: 38 } as const

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

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
      <span lang="ja" className="grid size-9 place-items-center rounded-[3px] bg-ai font-jp text-xl text-on-ai">
        言
      </span>
      <span className="text-[1.05rem]">Kotonoha</span>
    </Link>
  )
}

function DueBadge({ due, className = '' }: { due: number; className?: string }) {
  if (due <= 0) return null
  return (
    <span className={`rounded-full bg-kihada px-1.5 text-center text-[11px] font-bold leading-[18px] text-[#2b2205] ${className}`}>
      {due > 99 ? '99+' : due}
    </span>
  )
}

/** Giữ nguyên nội dung trang cũ trong lúc nó đang mờ đi. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export function Layout() {
  const { choice, cycle } = useTheme()
  const due = useDueIds().length
  const { pathname } = useLocation()
  const themeLabel = `Giao diện: ${THEME_LABEL[choice].toLowerCase()}`
  const search = useSearchUi()

  // Phím "/" mở tìm kiếm (trừ khi đang gõ trong ô nhập).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || isInteractiveTarget(e)) return
      e.preventDefault()
      searchUi.open()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-14 lg:pl-[240px]">
      {/* Desktop: sidebar trái */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-line bg-surface px-4 pt-7 pb-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-7 flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={() => searchUi.open()}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-paper px-3 text-sm text-muted transition-colors hover:border-ai hover:text-ink"
          >
            <SearchIcon className="size-4" />
            <span className="flex-1 truncate text-left">Tìm từ, chữ Hán…</span>
            <kbd className="rounded border border-line border-b-2 px-1.5 text-xs font-semibold">/</kbd>
          </button>
          <button
            type="button"
            onClick={() => searchUi.open({ draw: true })}
            aria-label="Vẽ chữ để tìm"
            title="Vẽ chữ để tìm"
            className="grid w-11 shrink-0 place-items-center rounded-xl border border-line bg-paper text-muted transition-colors hover:border-ai hover:text-ink"
          >
            <PenIcon className="size-4" />
          </button>
        </div>
        <nav aria-label="Điều hướng chính" className="mt-5">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `relative flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium transition-colors ${isActive ? 'text-ai' : 'text-muted hover:text-ink'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-side" transition={SLIDE} className="absolute inset-0 rounded-xl bg-ai-soft" />
                      )}
                      <span
                        lang="ja"
                        className={`relative grid size-8 place-items-center rounded-[3px] border font-jp text-base leading-none ${
                          isActive ? 'border-ai bg-ai text-on-ai' : 'border-cell-line'
                        }`}
                      >
                        {n.glyph}
                      </span>
                      <span className="relative">{n.label}</span>
                      {n.to === '/review' && <DueBadge due={due} className="relative ml-auto min-w-6" />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <InstallApp compact />
        </div>
        <button
          type="button"
          onClick={cycle}
          aria-label={themeLabel}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <ThemeIcon choice={choice} />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-xs">Giao diện</span>
            <span className="font-medium text-ink">{THEME_LABEL[choice]}</span>
          </span>
        </button>
      </aside>

      {/* Điện thoại & tablet: header */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 max-w-[900px] items-center gap-4 px-4 md:px-6">
          <Logo />
          <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="Điều hướng chính">
            {/* Tablet: logo đã dẫn về trang chủ, bỏ mục Trang chủ cho vừa 6 mục. */}
            {NAV.filter((n) => n.to !== '/').map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors ${isActive ? 'text-ai' : 'text-muted hover:text-ink'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-top" transition={SLIDE} className="absolute inset-0 rounded-lg bg-ai-soft" />}
                    <span className="relative">{n.short ?? n.label}</span>
                    {n.to === '/review' && <DueBadge due={due} className="relative ml-1.5 min-w-5" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => searchUi.open()}
            aria-label="Tìm kiếm"
            title="Tìm kiếm (phím /)"
            className="ml-auto grid size-11 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink md:ml-0"
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            onClick={() => searchUi.open({ draw: true })}
            aria-label="Vẽ chữ để tìm"
            title="Vẽ chữ để tìm"
            className="grid size-11 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink md:hidden"
          >
            <PenIcon />
          </button>
          <button
            type="button"
            onClick={cycle}
            aria-label={themeLabel}
            title={themeLabel}
            className="grid size-11 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
          >
            <ThemeIcon choice={choice} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-4 pt-6 md:px-6 md:pt-8 lg:max-w-[1200px] lg:px-10 lg:pt-10">
        {/*
          Không đặt initial={false} ở đây: giá trị đó truyền xuống cả cây con và chặn
          hiệu ứng mount của mọi motion component trong trang tải đầu tiên.
        */}
        <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Điện thoại: thanh điều hướng đáy */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.filter((n) => !n.noBottom).map((n) => (
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
                    <span lang="ja" className="relative grid size-7 place-items-center rounded-[3px] border border-cell-line font-jp text-base leading-none">
                      {isActive && (
                        <motion.span layoutId="nav-bottom" transition={SLIDE} className="absolute -inset-px rounded-[3px] bg-ai" />
                      )}
                      <span className={`relative ${isActive ? 'text-on-ai' : ''}`}>{n.glyph}</span>
                      {n.to === '/review' && <DueBadge due={due} className="absolute -right-2.5 -top-2 min-w-4" />}
                    </span>
                    {n.short ?? n.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <UpdatePrompt />
      <Toaster />
      <GlobalDetail />
      <SaveSheetHost />

      {search.open && (
        <Suspense fallback={null}>
          <SearchDialog onClose={searchUi.close} initialDraw={search.draw} />
        </Suspense>
      )}
    </div>
  )
}

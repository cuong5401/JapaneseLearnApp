import { motion } from 'motion/react'
import { Suspense, lazy, useEffect, type MouseEvent } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { THEME_LABEL, useTheme, type ThemeChoice } from '../hooks/useTheme'
import { useDockNavClick } from '../hooks/useDockNavClick'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useDueIds } from '../hooks/useProgress'
import { isInteractiveTarget } from '../lib/keyboard'
import { NAV, NAV_GROUPS, navActive } from '../lib/nav'
import { searchUi, useSearchUi } from '../lib/searchUi'
import { MainErrorBoundary } from './ErrorPanel'
import { UpdatePrompt } from './UpdatePrompt'
import { Toaster } from './Toaster'
import { SaveSheetHost } from './notebook/SaveSheet'
import { GlobalDetail } from './detail/GlobalDetail'
import { AiDock } from './ai/AiDock'

// Hộp tìm kiếm và chỉ mục của nó chỉ tải khi mở lần đầu.
const SearchDialog = lazy(() => import('./SearchDialog'))

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

const SLIDE = { type: 'spring', stiffness: 500, damping: 38 } as const

export function ThemeIcon({ choice }: { choice: ThemeChoice }) {
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

function Logo({ onClick }: { onClick?: (e: MouseEvent) => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex min-h-11 items-center gap-2.5 font-bold tracking-tight">
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

export function Layout() {
  const { choice, cycle } = useTheme()
  const due = useDueIds().length
  const { pathname } = useLocation()
  const themeLabel = `Giao diện: ${THEME_LABEL[choice].toLowerCase()}`
  const search = useSearchUi()
  // Điện thoại, khung Hỏi AI đang mở: bấm điều hướng thì thu gọn khung và chuyển trang trong một lần bấm.
  const dockNav = useDockNavClick()

  // Vào trang mới: lên đầu trang. Back / F5: chờ dữ liệu xong rồi về đúng vị trí cũ (mọi trang).
  useScrollRestore()

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
          <Logo onClick={dockNav('/')} />
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
        <nav aria-label="Điều hướng chính" className="mt-5 space-y-5">
          {NAV_GROUPS.map((g) => (
            <div key={g.key}>
              <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-muted uppercase">{g.title}</p>
              <ul className="space-y-1">
                {NAV.filter((n) => n.group === g.key).map((n) => {
                  const active = navActive(n, pathname)
                  return (
                    <li key={n.to}>
                      <Link
                        to={n.to}
                        onClick={dockNav(n.to)}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium transition-colors ${active ? 'text-ai' : 'text-muted hover:text-ink'}`}
                      >
                        {active && <motion.span layoutId="nav-side" transition={SLIDE} className="absolute inset-0 rounded-xl bg-ai-soft" />}
                        <span
                          lang="ja"
                          className={`relative grid size-8 place-items-center rounded-[3px] border font-jp text-base leading-none ${
                            active ? 'border-ai bg-ai text-on-ai' : 'border-cell-line'
                          }`}
                        >
                          {n.glyph}
                        </span>
                        <span className="relative">{n.label}</span>
                        {n.to === '/review' && <DueBadge due={due} className="relative ml-auto min-w-6" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <button
          type="button"
          onClick={cycle}
          aria-label={themeLabel}
          className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <ThemeIcon choice={choice} />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-xs">Giao diện</span>
            <span className="font-medium text-ink">{THEME_LABEL[choice]}</span>
          </span>
        </button>
      </aside>

      {/* Điện thoại & tablet: header */}
      <header data-app-header className="sticky top-0 z-20 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 max-w-[900px] items-center gap-4 px-4 md:px-6">
          <Logo onClick={dockNav('/')} />
          <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="Điều hướng chính">
            {/* Tablet: logo đã dẫn về trang chủ, bỏ mục Trang chủ. */}
            {NAV.filter((n) => n.to !== '/').map((n) => {
              const active = navActive(n, pathname)
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={dockNav(n.to)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-11 items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors ${active ? 'text-ai' : 'text-muted hover:text-ink'}`}
                >
                  {active && <motion.span layoutId="nav-top" transition={SLIDE} className="absolute inset-0 rounded-lg bg-ai-soft" />}
                  <span className="relative">{n.label}</span>
                  {n.to === '/review' && <DueBadge due={due} className="relative ml-1.5 min-w-5" />}
                </Link>
              )
            })}
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

      {/* Lề phải md+ ≥ 40px: chừa chỗ cho tab Hỏi AI (28px) dính lề phải, không đè nội dung / thanh cuộn panel. */}
      <main className="mx-auto w-full max-w-[900px] px-4 pt-6 md:pr-10 md:pl-6 md:pt-8 lg:max-w-[1200px] lg:px-10 lg:pt-10">
        {/*
          KHÔNG dùng AnimatePresence mode="wait" / exit / giữ trang cũ cho chuyển trang: trang đang thoát vẫn chạy
          hook và hiệu ứng thoát lồng nhau, chỉ cần một cái không hoàn tất là trang mới không bao giờ mount
          (main trắng). Trang mới render ngay, chỉ có hiệu ứng vào.
        */}
        <MainErrorBoundary resetKey={pathname}>
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <Outlet />
          </motion.div>
        </MainErrorBoundary>
      </main>

      {/* Điện thoại: thanh điều hướng đáy */}
      <nav
        aria-label="Điều hướng chính"
        data-bottom-nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((n) => {
            const active = navActive(n, pathname)
            return (
              <li key={n.to}>
                <Link
                  to={n.to}
                  onClick={dockNav(n.to)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-ai' : 'text-muted'}`}
                >
                  <span lang="ja" className="relative grid size-7 place-items-center rounded-[3px] border border-cell-line font-jp text-base leading-none">
                    {active && <motion.span layoutId="nav-bottom" transition={SLIDE} className="absolute -inset-px rounded-[3px] bg-ai" />}
                    <span className={`relative ${active ? 'text-on-ai' : ''}`}>{n.glyph}</span>
                    {n.to === '/review' && <DueBadge due={due} className="absolute -right-2.5 -top-2 min-w-4" />}
                  </span>
                  {n.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <UpdatePrompt />
      <Toaster />
      <GlobalDetail />
      <SaveSheetHost />
      {/* Khung chat nổi ở mọi trang, trừ trang Hỏi AI đầy đủ. */}
      {!pathname.startsWith('/ai') && <AiDock />}

      {search.open && (
        <Suspense fallback={null}>
          <SearchDialog onClose={searchUi.close} initialDraw={search.draw} />
        </Suspense>
      )}
    </div>
  )
}

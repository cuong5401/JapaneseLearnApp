import { motion } from 'motion/react'
import { Suspense, lazy, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { aiDock, useAiDock } from '../../lib/ai/dock'

// Nội dung chat (Markdown, lịch sử…) chỉ tải khi mở khung lần đầu.
const DockChat = lazy(() => import('./DockChat'))

const TAB_W = 28
const TAB_W_QUIET = 16
const TAB_H = 64
/** Từ đây trở lên: khung 400×600 ở góc phải dưới; nhỏ hơn: gần full ngang, nằm trên thanh điều hướng đáy. */
const WIDE = 768
const SPRING = { type: 'spring', duration: 0.25, bounce: 0.12 } as const

interface Viewport {
  w: number
  h: number
  /** visualViewport: phần đang nhìn thấy (bàn phím ảo iOS che phần dưới) */
  vvTop: number
  vvH: number
  /** Đáy header (điện thoại/tablet) và chiều cao thanh điều hướng đáy (0 nếu ẩn) */
  headerBottom: number
  navH: number
}

function measure(): Viewport {
  const vv = window.visualViewport
  const header = document.querySelector('[data-app-header]')?.getBoundingClientRect()
  const nav = document.querySelector('[data-bottom-nav]')?.getBoundingClientRect()
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    vvTop: vv?.offsetTop ?? 0,
    vvH: vv?.height ?? window.innerHeight,
    headerBottom: header && header.height > 0 ? Math.max(0, header.bottom) : 0,
    navH: nav && nav.height > 0 ? nav.height : 0,
  }
}

function useViewport(): Viewport {
  const [vp, setVp] = useState(measure)
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setVp(measure()))
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])
  return vp
}

/** Kích thước và vị trí khung mở, giới hạn kéo tab (px theo layout viewport). */
function dockGeometry(vp: Viewport) {
  const visibleBottom = vp.vvTop + vp.vvH
  const keyboard = vp.h - visibleBottom > 80
  const tabMin = vp.headerBottom + 8
  const tabMax = Math.max(tabMin, vp.h - vp.navH - 8 - TAB_H)
  if (vp.w >= WIDE) {
    const width = Math.min(400, vp.w - 48)
    const height = Math.max(240, Math.min(600, vp.vvH - 48))
    return { width, height, right: 24, top: visibleBottom - 24 - height, tabMin, tabMax, keyboard }
  }
  // Điện thoại: nằm trên thanh điều hướng đáy; bàn phím mở thì bám ngay trên bàn phím (thanh đáy bị che).
  const bottom = visibleBottom - 8 - (keyboard ? 0 : vp.navH)
  const ceiling = keyboard ? vp.vvTop + 8 : vp.headerBottom + 8
  const height = Math.max(160, Math.min(Math.round(vp.h * 0.65), bottom - ceiling))
  return { width: vp.w - 16, height, right: 8, top: bottom - height, tabMin, tabMax, keyboard }
}

type DockMark = 'own' | 'mark'

/** State người dùng của mục lịch sử hiện tại (React Router lưu ở history.state.usr). */
const historyUsr = () => (window.history.state as { usr?: Record<string, unknown> | null } | null)?.usr ?? null
const historyMark = () => historyUsr()?.aiDock as DockMark | undefined

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Có hộp thoại modal khác đang mở (sheet chi tiết, tìm kiếm…): Esc là của nó. */
const otherModalOpen = (panel: HTMLElement | null) =>
  [...document.querySelectorAll('[aria-modal="true"]')].some((el) => !panel?.contains(el))

/**
 * Khung chat "Hỏi AI" nổi ở mọi trang. Thu gọn: tab nhỏ dính lề phải (kéo dọc được);
 * mở: khung ở góc phải dưới. Tab và khung là một khối trượt ngang.
 * Back của trình duyệt / Esc thu gọn khung (khi mở có đẩy một mục lịch sử cùng URL).
 */
export function AiDock() {
  const dock = useAiDock()
  const vp = useViewport()
  const g = dockGeometry(vp)
  const location = useLocation()
  // Đường dẫn trong app theo router (KHÔNG gồm basename /JapaneseLearnApp/): navigate() tự thêm basename.
  const here = `${location.pathname}${location.search}${location.hash}`
  const navigate = useNavigate()
  const navType = useNavigationType()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const [loaded, setLoaded] = useState(dock.open)
  const [dragY, setDragY] = useState<number | null>(null)
  const drag = useRef<{ startY: number; from: number; moved: boolean; id: number } | null>(null)
  const suppressClick = useRef(false)
  const quiet = dock.quiet > 0 && !dock.open
  const tabW = quiet ? TAB_W_QUIET : TAB_W
  const tabY = clamp(dragY ?? dock.tabY ?? Math.round(vp.h * 0.55), g.tabMin, g.tabMax)
  /*
   * Nút Back thu gọn khung: khi khung mở, mục lịch sử hiện tại mang dấu `aiDock` trong state.
   *  - 'own': mục do khung tự đẩy (cùng URL) → thu gọn bằng nút › thì lùi lại mục đó.
   *  - 'mark': mục của trang (vd. mở chi tiết cùng trang) chỉ được gắn dấu → thu gọn thì gỡ dấu.
   * Back (POP) sang mục không có dấu trong lúc khung mở → thu gọn.
   * Đọc dấu thẳng từ history.state (React Router cập nhật `location` trong transition, có thể trễ
   * khi nội dung khung đang tải), và bắt Back bằng sự kiện popstate.
   */
  const withMark = (m: DockMark | undefined) => {
    const { aiDock: _drop, ...rest } = historyUsr() ?? {}
    void _drop
    return m ? { ...rest, aiDock: m } : Object.keys(rest).length ? rest : null
  }

  if (dock.open && !loaded) setLoaded(true)

  // Mở: đẩy một mục lịch sử cùng URL. Lần mount đầu (tải lại trang khi khung đang mở) dùng lại dấu có sẵn;
  // các lần mở sau luôn đẩy mục mới vì dấu còn sót trên mục cũ không còn đúng.
  const firstRun = useRef(true)
  useEffect(() => {
    const first = firstRun.current
    firstRun.current = false
    if (dock.open && !(first && historyMark())) navigate(here, { state: withMark('own') })
  }, [dock.open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Back / Forward sang mục không có dấu → thu gọn.
  useEffect(() => {
    if (!dock.open) return
    const onPop = () => {
      if (!historyMark()) aiDock.close()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [dock.open])

  // Trang tự đổi mục lịch sử trong lúc khung mở: gắn lại dấu (không làm gì với POP, đã xử lý ở trên).
  const prev = useRef({ key: location.key, pathname: location.pathname, mark: historyMark() })
  useEffect(() => {
    const p = prev.current
    const mark = historyMark()
    prev.current = { key: location.key, pathname: location.pathname, mark }
    if (p.key === location.key || !dock.open || mark || navType === 'POP') return
    // Sang trang khác: thêm một mục để Back thu gọn khung trước.
    if (navType === 'PUSH' && location.pathname !== p.pathname) navigate(here, { state: withMark('own') })
    // Trang thay mục hiện tại (replace) hoặc mở chi tiết cùng trang: gắn dấu, giữ "own" nếu mục bị thay là của khung.
    else navigate(here, { replace: true, state: withMark(navType === 'REPLACE' && p.mark === 'own' ? 'own' : 'mark') })
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const collapse = () => {
    const mark = historyMark()
    aiDock.close()
    if (mark === 'own') navigate(-1)
    else if (mark) navigate(here, { replace: true, state: withMark(undefined) })
    tabRef.current?.focus({ preventScroll: true })
  }

  // Esc: thu gọn khi không có hộp thoại khác đang mở.
  useEffect(() => {
    if (!dock.open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !otherModalOpen(panelRef.current)) collapse()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Desktop: mở xong thì đặt con trỏ vào ô nhập (điện thoại không tự bật bàn phím).
  useEffect(() => {
    if (!dock.open) return
    const t = setTimeout(() => {
      if (window.innerWidth >= WIDE) inputRef.current?.focus({ preventScroll: true })
      else panelRef.current?.focus({ preventScroll: true })
    }, 260)
    return () => clearTimeout(t)
  }, [dock.open])

  const onPanelKey = (e: KeyboardEvent) => {
    // Esc trong khung chỉ thu gọn khung, không đóng sheet nằm dưới.
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      collapse()
    }
  }

  /* Kéo tab dọc lề phải: giữ và kéo; chạm (không kéo) thì mở khung. */
  const onTabDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    drag.current = { startY: e.clientY, from: tabY, moved: false, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onTabMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dy) < 6) return
    d.moved = true
    setDragY(clamp(d.from + dy, g.tabMin, g.tabMax))
  }
  const onTabUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId) return
    if (d.moved) {
      suppressClick.current = true
      aiDock.setTabY(clamp(d.from + (e.clientY - d.startY), g.tabMin, g.tabMax))
    }
    setDragY(null)
  }
  const onTabClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    aiDock.open()
  }
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    aiDock.setTabY(clamp(tabY + (e.key === 'ArrowUp' ? -24 : 24), g.tabMin, g.tabMax))
  }

  const x = dock.open ? 0 : g.width + g.right
  const y = dock.open ? g.top : tabY

  return (
    <div data-ai-dock={dock.open ? 'open' : 'closed'} className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
      <motion.div
        className="absolute top-0 right-0 flex items-start"
        initial={false}
        animate={{ x, y }}
        transition={dragY !== null ? { duration: 0 } : SPRING}
      >
        <button
          ref={tabRef}
          type="button"
          data-ai-tab
          data-quiet={quiet ? 'true' : undefined}
          aria-label={dock.unread ? 'Mở Hỏi AI (có câu trả lời mới)' : 'Mở Hỏi AI'}
          aria-expanded={dock.open}
          aria-controls="ai-dock-panel"
          tabIndex={dock.open ? -1 : 0}
          onPointerDown={onTabDown}
          onPointerMove={onTabMove}
          onPointerUp={onTabUp}
          onPointerCancel={onTabUp}
          onClick={onTabClick}
          onKeyDown={onTabKey}
          style={{ width: tabW, height: TAB_H, touchAction: 'none' }}
          className={`relative flex shrink-0 cursor-grab flex-col items-center justify-center gap-0.5 rounded-l-xl bg-ai text-on-ai shadow-[-2px_2px_10px_rgb(0_0_0/0.18)] transition-[opacity,width] duration-200 select-none active:cursor-grabbing ${
            dock.open ? 'pointer-events-none opacity-0' : quiet ? 'pointer-events-auto opacity-50' : 'pointer-events-auto opacity-100'
          }`}
        >
          {!quiet && (
            <>
              <span lang="ja" aria-hidden className="font-jp text-sm leading-none font-bold">
                問
              </span>
              <span aria-hidden className="text-base leading-none">
                ‹
              </span>
            </>
          )}
          {dock.unread && <span data-ai-unread aria-hidden className="absolute -top-1 -left-1 size-3 rounded-full border-2 border-paper bg-beni" />}
        </button>

        <div
          ref={panelRef}
          id="ai-dock-panel"
          role={dock.open ? 'dialog' : undefined}
          aria-labelledby={dock.open ? 'ai-dock-title' : undefined}
          aria-hidden={dock.open ? undefined : true}
          tabIndex={-1}
          inert={!dock.open}
          onKeyDown={onPanelKey}
          data-ai-panel
          style={{ width: g.width, height: g.height, marginRight: g.right }}
          className="pointer-events-auto overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_10px_40px_rgb(0_0_0/0.22)] outline-none"
        >
          {loaded && (
            <Suspense fallback={<div className="p-4 text-sm text-muted">Đang tải…</div>}>
              <DockChat
                inputRef={inputRef}
                onCollapse={collapse}
                onLeave={() => aiDock.close()}
                onExpand={(convId) => {
                  aiDock.close()
                  navigate(convId ? `/ai?c=${convId}` : `/ai?mode=${dock.mode}`)
                }}
              />
            </Suspense>
          )}
        </div>
      </motion.div>
    </div>
  )
}

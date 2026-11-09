import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { Suspense, lazy, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { DOCK_PHONE, useMediaQuery } from '../../hooks/useMediaQuery'
import { aiDock, historyMark, historyUsr, useAiDock, type DockMark } from '../../lib/ai/dock'
import { lockScroll } from '../../lib/scrollLock'

// Nội dung chat (Markdown, lịch sử…) chỉ tải khi mở khung lần đầu.
const DockChat = lazy(() => import('./DockChat'))

const TAB_W = 28
const TAB_W_QUIET = 16
const TAB_H = 64
const SPRING = { type: 'spring', duration: 0.25, bounce: 0.12 } as const
/** Vuốt header sang phải: quá tỉ lệ này của chiều rộng hoặc nhanh hơn vận tốc này (px/s) thì thu gọn. */
const SWIPE_RATIO = 0.33
const SWIPE_VELOCITY = 500

interface Viewport {
  w: number
  h: number
  /** visualViewport: phần đang nhìn thấy (bàn phím ảo iOS che phần dưới) */
  vvTop: number
  vvH: number
  /** Đáy header (điện thoại/tablet), chiều cao thanh điều hướng đáy (0 nếu ẩn), safe-area-inset-top */
  headerBottom: number
  navH: number
  safeTop: number
}

function measure(): Viewport {
  const vv = window.visualViewport
  const header = document.querySelector('[data-app-header]')?.getBoundingClientRect()
  const nav = document.querySelector('[data-bottom-nav]')?.getBoundingClientRect()
  const probe = document.querySelector<HTMLElement>('[data-safe-top]')
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    vvTop: vv?.offsetTop ?? 0,
    vvH: vv?.height ?? window.innerHeight,
    headerBottom: header && header.height > 0 ? Math.max(0, header.bottom) : 0,
    navH: nav && nav.height > 0 ? nav.height : 0,
    safeTop: probe ? parseFloat(getComputedStyle(probe).paddingTop) || 0 : 0,
  }
}

/** Kích thước cửa sổ và visualViewport, cập nhật theo khung hình (resize, cuộn visualViewport khi bàn phím mở). */
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

/**
 * Kích thước và vị trí khung mở, giới hạn kéo tab (px theo layout viewport).
 *  - Desktop: 400×600 ở góc phải dưới.
 *  - Điện thoại: sheet từ safe-area-top + 8px tới ngay trên thanh điều hướng đáy; bàn phím mở thì
 *    chiếm đúng phần còn thấy (top = visualViewport.offsetTop, height = visualViewport.height).
 */
function dockGeometry(vp: Viewport, phone: boolean, keyboard: boolean) {
  const visibleBottom = vp.vvTop + vp.vvH
  const tabMin = vp.headerBottom + 8
  const tabMax = Math.max(tabMin, vp.h - vp.navH - 8 - TAB_H)
  if (!phone) {
    const width = Math.min(400, vp.w - 48)
    const height = Math.max(240, Math.min(600, vp.vvH - 48))
    return { width, height, right: 24, top: visibleBottom - 24 - height, tabMin, tabMax }
  }
  if (keyboard) return { width: vp.w - 16, height: Math.max(120, vp.vvH), right: 8, top: vp.vvTop, tabMin, tabMax }
  const top = vp.safeTop + 8
  const bottom = Math.min(visibleBottom, vp.h - vp.navH) - 8
  return { width: vp.w - 16, height: Math.max(160, bottom - top), right: 8, top, tabMin, tabMax }
}

/** Bắt con trỏ để kéo tiếp khi ngón tay ra ngoài phần tử; trình duyệt có thể từ chối (con trỏ đã kết thúc). */
const capture = (e: PointerEvent<Element>) => {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    // Không bắt được thì vẫn kéo được khi ngón tay còn trên phần tử.
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Có hộp thoại modal khác đang mở (sheet chi tiết, tìm kiếm…): Esc là của nó. */
const otherModalOpen = (panel: HTMLElement | null) =>
  [...document.querySelectorAll('[aria-modal="true"]')].some((el) => !panel?.contains(el))

/**
 * Khung chat "Hỏi AI" nổi ở mọi trang. Thu gọn: tab nhỏ dính lề phải (kéo dọc được).
 * Mở: desktop là khung nhỏ góc phải dưới (chuyển trang vẫn mở); điện thoại là sheet gần toàn màn hình có
 * lớp nền mờ, khóa cuộn trang, bám theo bàn phím ảo; bấm điều hướng / vuốt header sang phải thì thu gọn.
 * Tab và khung là một khối trượt ngang. Back / Esc thu gọn (khi mở có đẩy một mục lịch sử cùng URL).
 */
export function AiDock() {
  const dock = useAiDock()
  const phone = useMediaQuery(DOCK_PHONE)
  const vp = useViewport()
  const reduceMotion = useReducedMotion()
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

  /*
   * Bàn phím ảo: iOS thu visualViewport (phần dưới bị che); Chrome Android với interactive-widget=resizes-content
   * thu cả innerHeight → nhận ra khi ô nhập của khung đang focus và innerHeight thấp hơn mức cao nhất đã thấy.
   */
  const [inputFocused, setInputFocused] = useState(false)
  const [maxH, setMaxH] = useState(vp.h)
  if (vp.h > maxH) setMaxH(vp.h)
  const keyboard = phone && dock.open && (vp.h - (vp.vvTop + vp.vvH) > 80 || (inputFocused && maxH - vp.h > 150))
  const g = dockGeometry(vp, phone, keyboard)

  const quiet = dock.quiet > 0 && !dock.open
  const tabW = quiet ? TAB_W_QUIET : TAB_W
  const tabY = clamp(dragY ?? dock.tabY ?? Math.round(vp.h * 0.55), g.tabMin, g.tabMax)
  const sheet = phone && dock.open

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

  // Trang tự đổi mục lịch sử trong lúc khung mở (không xét POP, đã xử lý ở trên):
  //  - điện thoại sang trang khác (link trong trang): thu gọn (bottom nav / header đã tự thu gọn trước khi chuyển);
  //  - desktop sang trang khác: khung vẫn mở, thêm một mục để Back thu gọn khung trước;
  //  - trang thay mục hiện tại (replace) hoặc mở chi tiết cùng trang: gắn lại dấu.
  const prev = useRef({ key: location.key, pathname: location.pathname, mark: historyMark() })
  useEffect(() => {
    const p = prev.current
    const mark = historyMark()
    prev.current = { key: location.key, pathname: location.pathname, mark }
    if (p.key === location.key || !dock.open || mark || navType === 'POP') return
    const pageChange = navType === 'PUSH' && location.pathname !== p.pathname
    if (pageChange && phone) aiDock.close()
    else if (pageChange) navigate(here, { state: withMark('own') })
    else navigate(here, { replace: true, state: withMark(navType === 'REPLACE' && p.mark === 'own' ? 'own' : 'mark') })
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const swipeX = useMotionValue(0)
  const collapse = () => {
    const mark = historyMark()
    aiDock.close()
    if (swipeX.get() !== 0) animate(swipeX, 0, SPRING)
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

  // Điện thoại: khóa cuộn trang (body fixed) khi sheet mở, trả đúng vị trí cũ khi thu gọn.
  useEffect(() => {
    if (!sheet) return
    return lockScroll()
  }, [sheet])

  // Bàn phím mở: ẩn thanh điều hướng đáy và tab (CSS theo html[data-keyboard]).
  useEffect(() => {
    if (!keyboard) return
    document.documentElement.dataset.keyboard = 'open'
    return () => {
      delete document.documentElement.dataset.keyboard
    }
  }, [keyboard])

  // Mở xong: desktop đặt con trỏ vào ô nhập; điện thoại chỉ focus khung (không tự bật bàn phím).
  useEffect(() => {
    if (!dock.open) return
    const t = setTimeout(() => {
      if (!phone) inputRef.current?.focus({ preventScroll: true })
      else panelRef.current?.focus({ preventScroll: true })
    }, 260)
    return () => clearTimeout(t)
  }, [dock.open, phone])

  const onPanelKey = (e: KeyboardEvent) => {
    // Esc trong khung chỉ thu gọn khung, không đóng sheet nằm dưới.
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      collapse()
    }
  }

  /* Lớp nền (điện thoại): chạm / vuốt không thu gọn, không truyền xuống trang; khung lắc nhẹ để báo đang mở. */
  const shake = () => {
    if (reduceMotion) return
    animate(swipeX, [0, -10, 10, -6, 0], { duration: 0.3 })
  }

  /* Vuốt header sang phải để thu gọn (điện thoại). Không nhận cử chỉ bắt đầu trong danh sách tin / ô nhập. */
  const swipe = useRef<{ id: number; x0: number; y0: number; active: boolean; samples: { x: number; t: number }[] } | null>(null)
  const headerProps = phone
    ? {
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          if (e.button !== 0) return
          swipe.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, active: false, samples: [{ x: e.clientX, t: e.timeStamp }] }
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          const s = swipe.current
          if (!s || s.id !== e.pointerId) return
          const dx = e.clientX - s.x0
          const dy = e.clientY - s.y0
          if (!s.active) {
            if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
              swipe.current = null
              return
            }
            if (dx <= 8 || dx < Math.abs(dy)) return
            s.active = true
            capture(e)
          }
          swipeX.set(Math.max(0, dx))
          s.samples = [...s.samples.slice(-4), { x: e.clientX, t: e.timeStamp }]
        },
        onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
          const s = swipe.current
          swipe.current = null
          if (!s || s.id !== e.pointerId || !s.active) return
          const a = s.samples[0]
          const b = s.samples[s.samples.length - 1]
          const v = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0
          if (swipeX.get() > g.width * SWIPE_RATIO || v > SWIPE_VELOCITY) collapse()
          else animate(swipeX, 0, SPRING)
        },
        onPointerCancel: () => {
          if (swipe.current?.active) animate(swipeX, 0, SPRING)
          swipe.current = null
        },
        // Đã vuốt thì không tính là bấm nút trong header.
        onClickCapture: (e: MouseEvent) => {
          if (swipeX.get() > 0) e.stopPropagation()
        },
      }
    : undefined

  /* Kéo tab dọc lề phải: giữ và kéo; chạm (không kéo) thì mở khung. */
  const onTabDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    drag.current = { startY: e.clientY, from: tabY, moved: false, id: e.pointerId }
    capture(e)
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
  // Điện thoại: dọc không animation (sheet bám bàn phím theo từng khung hình; khi mở, khung vào từ ngoài màn hình).
  const transition = dragY !== null ? { duration: 0 } : phone ? { x: SPRING, y: { duration: 0 } } : SPRING

  return (
    <div data-ai-dock={dock.open ? 'open' : 'closed'} data-ai-sheet={sheet ? 'true' : undefined} className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
      <div data-safe-top aria-hidden className="invisible absolute pt-[env(safe-area-inset-top)]" />
      {sheet && (
        <motion.div
          data-ai-backdrop
          aria-hidden
          className="pointer-events-auto absolute inset-x-0 top-0 bg-ink/35"
          style={{ bottom: keyboard ? 0 : vp.navH, touchAction: 'none' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            shake()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        />
      )}
      <motion.div className="absolute top-0 right-0" style={{ x: swipeX }}>
        <motion.div className="flex items-start" initial={false} animate={{ x, y }} transition={transition}>
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
            onFocus={(e) => {
              if ((e.target as Element) === inputRef.current) setInputFocused(true)
            }}
            onBlur={(e) => {
              if ((e.target as Element) === inputRef.current) setInputFocused(false)
            }}
            data-ai-panel
            style={{ width: g.width, height: g.height, marginRight: g.right }}
            className="pointer-events-auto overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_10px_40px_rgb(0_0_0/0.22)] outline-none"
          >
            {loaded && (
              <Suspense fallback={<div className="p-4 text-sm text-muted">Đang tải…</div>}>
                <DockChat
                  inputRef={inputRef}
                  headerProps={headerProps}
                  keyboard={keyboard}
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
      </motion.div>
    </div>
  )
}

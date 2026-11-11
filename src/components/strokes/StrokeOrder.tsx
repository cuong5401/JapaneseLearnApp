import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react'
import { STROKE_VIEWBOX, firstPoint, labelPositions, retryStrokes, strokeEnd, useStrokes, type Stroke } from '../../lib/strokes'
import { Skeleton } from '../LoadState'

/** Tốc độ vẽ cố định (đơn vị viewBox / ms) và thời gian nghỉ giữa hai nét. */
const SPEED = 0.09
const PAUSE_MS = 280

const SIZES = {
  md: 'size-40',
  sm: 'size-32',
}

/** Lưới chữ thập nét đứt như GridCell (đơn vị viewBox 109). */
function Guides() {
  const c = STROKE_VIEWBOX / 2
  return (
    <g stroke="var(--cell-guide)" strokeWidth="0.6" strokeDasharray="3 3" aria-hidden>
      <line x1={c} y1="0" x2={c} y2={STROKE_VIEWBOX} />
      <line x1="0" y1={c} x2={STROKE_VIEWBOX} y2={c} />
    </g>
  )
}

const STROKE_STYLE = { fill: 'none', strokeWidth: 3.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Frame({ className, children, ref }: { className: string; children: ReactNode; ref?: Ref<SVGSVGElement> }) {
  return (
    <svg ref={ref} viewBox={`0 0 ${STROKE_VIEWBOX} ${STROKE_VIEWBOX}`} className={`block shrink-0 rounded-[3px] border-2 border-cell-line bg-surface ${className}`} aria-hidden>
      <Guides />
      {children}
    </svg>
  )
}

/** Chỉ có khung (cùng kích thước khi có dữ liệu): tải xong không đẩy nội dung. */
function Placeholder({ size }: { size: keyof typeof SIZES }) {
  return <Skeleton className={`${SIZES[size]} rounded-[3px]`} />
}

/** Cỡ chữ số (đơn vị viewBox) theo kích thước khung thật: chữ luôn ≥ 11px trên màn hình. */
function useLabelSize(ref: RefObject<SVGSVGElement | null>) {
  const [px, setPx] = useState(1.47) // ~160px / 109
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setPx(w / STROKE_VIEWBOX)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  const font = Math.max(6.2, 11 / px)
  return { font, small: Math.max(5, 9.5 / px, font * 0.8), r: Math.max(4.5, font * 0.62) }
}

type NumState = 'current' | 'done' | 'todo'

/**
 * Tự phát hoạt ảnh một lần khi mở chữ (tốc độ cố định, luôn có số thứ tự nét và nét mờ).
 * Chạm / Enter / Space trên khung: vẽ lại từ đầu (kể cả đang vẽ dở).
 * Reduced motion: hiện ngay đủ nét; mỗi lần chạm hiện thêm một nét (bắt đầu từ nét 1), hết thì quay lại.
 */
function Player({ strokes, char, size, autoPlay }: { strokes: Stroke[]; char: string; size: keyof typeof SIZES; autoPlay: boolean }) {
  const reduce = useReducedMotion() ?? false
  const total = strokes.length
  // step = số nét đã vẽ xong; khi đang phát, nét đang vẽ là strokes[step]
  const [step, setStep] = useState(() => (reduce || !autoPlay ? total : 0))
  const [playing, setPlaying] = useState(() => !reduce && autoPlay)
  const svg = useRef<SVGSVGElement>(null)
  const paths = useRef<(SVGPathElement | null)[]>([])
  const lengths = useRef<number[]>([])
  const drawn = useRef(0) // phần đã vẽ của nét strokes[step]
  const { font, small, r } = useLabelSize(svg)
  const labels = useMemo(() => labelPositions(strokes, r), [strokes, r])
  const geo = useMemo(() => strokes.map((s) => ({ start: firstPoint(s.d), end: strokeEnd(s.d) })), [strokes])

  useLayoutEffect(() => {
    lengths.current = strokes.map((_, i) => paths.current[i]?.getTotalLength() ?? 100)
  }, [strokes])

  /** Đặt dash cho nét đang vẽ, xóa dash ở các nét khác. */
  const paint = useCallback(() => {
    paths.current.forEach((el, i) => {
      if (!el) return
      if (playing && i === step) {
        const len = lengths.current[i] ?? 100
        el.style.strokeDasharray = `${len} ${len}`
        el.style.strokeDashoffset = String(len - Math.min(drawn.current, len))
      } else {
        el.style.strokeDasharray = ''
        el.style.strokeDashoffset = ''
      }
    })
  }, [step, playing])
  useLayoutEffect(paint, [paint])

  useEffect(() => {
    if (!playing || step >= total) return
    // trạng thái của vòng hoạt ảnh gom trong một đối tượng (không gán lại biến của effect)
    const t = { raf: 0, last: performance.now(), wait: step > 0 && drawn.current === 0 ? PAUSE_MS : 0 }
    const tick = (now: number) => {
      const dt = now - t.last
      t.last = now
      if (t.wait > 0) t.wait -= dt
      else {
        drawn.current += dt * SPEED
        const len = lengths.current[step] ?? 100
        if (drawn.current >= len) {
          drawn.current = 0
          setStep(step + 1)
          // vẽ xong nét cuối thì dừng (trong callback, không setState đồng bộ trong effect)
          if (step + 1 >= total) setPlaying(false)
          return
        }
        paint()
      }
      t.raf = requestAnimationFrame(tick)
    }
    t.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(t.raf)
  }, [playing, step, total, paint])

  const replay = () => {
    drawn.current = 0
    if (reduce) {
      // Không hoạt ảnh: mỗi lần chạm thêm một nét; đang đủ nét thì về nét 1.
      setStep((s) => (s >= total ? 1 : s + 1))
      return
    }
    setStep(0)
    setPlaying(true)
  }

  // Nét "hiện tại": đang phát → nét đang vẽ; đứng yên → nét vừa thêm (nét cuối khi đã đủ).
  const cur = playing ? step : step - 1
  const state = (i: number): NumState => (i === cur ? 'current' : i < step ? 'done' : 'todo')
  const arrow = !playing && cur >= 0 ? geo[cur].end : null

  return (
    <button
      type="button"
      onClick={replay}
      aria-label={`Vẽ lại thứ tự nét chữ ${char}`}
      title={`Thứ tự nét chữ ${char}: ${total} nét. Chạm để vẽ lại`}
      data-stroke-order={char}
      data-playing={playing ? 'true' : 'false'}
      data-step={step}
      data-total={total}
      className={`group relative block shrink-0 cursor-pointer rounded-[3px] ${SIZES[size]}`}
    >
      <Frame ref={svg} className="size-full transition-colors group-hover:border-ai">
        {/* nét mờ: nét chưa vẽ, mảnh và nhạt */}
        {strokes.map((s, i) =>
          i >= step && i !== cur ? <path key={`g${s.n}`} d={s.d} {...STROKE_STYLE} strokeWidth={2} stroke="var(--cell-line)" opacity={0.45} /> : null,
        )}
        {strokes.map((s, i) => (
          <path
            key={s.n}
            data-stroke={s.n}
            ref={(el) => {
              paths.current[i] = el
            }}
            d={s.d}
            {...STROKE_STYLE}
            // nét chưa vẽ vẫn render (ẩn) để đo getTotalLength
            stroke={i === cur ? 'var(--beni)' : i < step ? 'var(--ink)' : 'none'}
          />
        ))}
        {/* chấm đặt bút của nét hiện tại: thấy nét bắt đầu từ đâu */}
        {cur >= 0 && cur < total && <circle cx={geo[cur].start[0]} cy={geo[cur].start[1]} r={1.9} fill="var(--beni)" data-stroke-start />}
        {arrow && (
          <polygon
            data-stroke-arrow
            fill="var(--beni)"
            points={[
              [arrow.at[0] + arrow.dir[0] * 4.5, arrow.at[1] + arrow.dir[1] * 4.5],
              [arrow.at[0] - arrow.dir[1] * 2.6 + arrow.dir[0] * 0.5, arrow.at[1] + arrow.dir[0] * 2.6 + arrow.dir[1] * 0.5],
              [arrow.at[0] + arrow.dir[1] * 2.6 + arrow.dir[0] * 0.5, arrow.at[1] - arrow.dir[0] * 2.6 + arrow.dir[1] * 0.5],
            ]
              .map((p) => p.map((v) => v.toFixed(1)).join(','))
              .join(' ')}
          />
        )}
        {strokes.map((s, i) => {
          const st = state(i)
          if (st === 'todo') return null
          const [cx, cy] = labels[i]
          return (
            <g key={`n${s.n}`} data-stroke-num={s.n} data-state={st} data-cx={cx.toFixed(1)} data-cy={cy.toFixed(1)}>
              {st === 'current' && <circle cx={cx} cy={cy} r={r} fill="var(--beni)" />}
              <text
                x={cx}
                y={cy}
                dy="0.36em"
                textAnchor="middle"
                fontSize={st === 'current' ? font : small}
                fontWeight={st === 'current' ? 700 : 600}
                fill={st === 'current' ? 'var(--on-ai)' : 'var(--muted)'}
                className="font-sans tabular-nums"
              >
                {s.n}
              </text>
            </g>
          )
        })}
      </Frame>
      {/* gợi ý chạm để vẽ lại: icon nhỏ mờ, rõ hơn khi hover / focus */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute right-1.5 bottom-1.5 size-4 text-muted opacity-40 transition-opacity group-hover:opacity-90 group-focus-visible:opacity-90"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
      </svg>
    </button>
  )
}

/**
 * Hướng dẫn thứ tự nét: hoạt ảnh vẽ từng nét theo đúng hướng viết, có số thứ tự và nét mờ; chạm khung để vẽ lại.
 * Kích thước cố định ở mọi trạng thái (đang tải / không có dữ liệu) để không layout shift.
 */
export function StrokeOrder({ char, size = 'md', autoPlay = true }: { char: string; size?: keyof typeof SIZES; autoPlay?: boolean }) {
  const state = useStrokes(char)
  if (state.status === 'ready') return <Player key={char} strokes={state.data.strokes} char={char} size={size} autoPlay={autoPlay} />
  if (state.status === 'loading') return <Placeholder size={size} />
  return (
    <div data-stroke-order={char} data-stroke-missing>
      <div className={`grid place-items-center rounded-[3px] border-2 border-dashed border-cell-line p-3 text-center text-sm text-muted ${SIZES[size]}`}>
        {state.status === 'error' ? (
          <span>
            Không tải được thứ tự nét.{' '}
            <button type="button" onClick={() => retryStrokes(char)} className="font-medium text-ai underline">
              Thử lại
            </button>
          </span>
        ) : (
          'Chưa có dữ liệu thứ tự nét'
        )}
      </div>
    </div>
  )
}

/** Khối "Thứ tự nét" có tiêu đề, dùng trong panel chi tiết (chữ Hán, bộ thủ, kana). */
export function StrokeSection({ char, autoPlay = true }: { char: string; autoPlay?: boolean }) {
  return (
    <section className="mt-5" aria-label={`Thứ tự nét chữ ${char}`}>
      <h3 className="mb-2 text-sm font-semibold text-muted">Thứ tự nét</h3>
      <StrokeOrder char={char} autoPlay={autoPlay} />
    </section>
  )
}

/** Nút nhỏ "Xem cách viết" mở hoạt ảnh tại chỗ (mặt sau flashcard): không lật / kéo thẻ. */
export function StrokeOrderToggle({ char, label = 'Xem cách viết' }: { char: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
  return (
    <div onClick={stop} onPointerDown={stop} onKeyDown={stop} className="mt-3" data-stroke-toggle>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-ai hover:border-ai"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
        </svg>
        {open ? 'Ẩn cách viết' : label}
      </button>
      {open && (
        <div className="mt-3">
          <StrokeOrder char={char} size="sm" />
        </div>
      )}
    </div>
  )
}

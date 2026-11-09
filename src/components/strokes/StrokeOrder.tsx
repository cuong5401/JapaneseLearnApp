import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { STROKE_CREDIT, STROKE_VIEWBOX, retryStrokes, useStrokes, type Stroke } from '../../lib/strokes'
import { Skeleton } from '../LoadState'
import { Segmented } from '../Segmented'

/** Tốc độ vẽ (đơn vị viewBox / ms ở 1×) và thời gian nghỉ giữa hai nét. */
const SPEED = 0.09
const PAUSE_MS = 280
const SPEEDS = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
]

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

function Frame({ className, children, label }: { className: string; children: ReactNode; label?: string }) {
  return (
    <svg
      viewBox={`0 0 ${STROKE_VIEWBOX} ${STROKE_VIEWBOX}`}
      className={`shrink-0 rounded-[3px] border-2 border-cell-line bg-surface ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Guides />
      {children}
    </svg>
  )
}

function IconButton({ label, onClick, disabled, children, pressed }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink hover:border-ai disabled:opacity-40 aria-pressed:border-ai aria-pressed:bg-ai-soft"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  )
}

/** Dải hình tĩnh: ô thứ k có k nét (nét thứ k tô đỏ), như sách tập viết. Chạm ô thì nhảy tới nét đó. */
function Strip({ strokes, step, onPick }: { strokes: Stroke[]; step: number; onPick: (k: number) => void }) {
  return (
    <ol className="-mx-1 mt-3 flex h-[3.75rem] gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-1" aria-label="Từng nét" data-stroke-strip>
      {strokes.map((_, k) => (
        <li key={k} className="shrink-0">
          <button
            type="button"
            onClick={() => onPick(k + 1)}
            aria-label={`Nét ${k + 1}`}
            aria-current={step === k + 1 ? 'step' : undefined}
            className="block rounded-[5px] outline-offset-2 aria-[current=step]:ring-2 aria-[current=step]:ring-ai"
          >
            <Frame className="size-12">
              {strokes.slice(0, k + 1).map((s, i) => (
                <path key={s.n} d={s.d} {...STROKE_STYLE} strokeWidth={4.5} stroke={i === k ? 'var(--beni)' : 'var(--ink)'} />
              ))}
            </Frame>
          </button>
        </li>
      ))}
    </ol>
  )
}

/** Chiều cao cố định của cả khối (khung + điều khiển + dải + ghi nguồn) để tải xong không đẩy nội dung. */
function Placeholder({ size, children }: { size: keyof typeof SIZES; children?: ReactNode }) {
  return (
    <div>
      {children ?? <Skeleton className={`${SIZES[size]} rounded-[3px]`} />}
      <Skeleton className="mt-3 h-11 w-full max-w-72" />
      <Skeleton className="mt-2 h-9 w-full max-w-72" />
      <Skeleton className="mt-3 h-[3.75rem] w-full" />
      <p className="mt-1 h-4 text-[11px] leading-4 text-muted">{STROKE_CREDIT}</p>
    </div>
  )
}

function Player({ strokes, char, size, autoPlay }: { strokes: Stroke[]; char: string; size: keyof typeof SIZES; autoPlay: boolean }) {
  const reduce = useReducedMotion() ?? false
  const total = strokes.length
  // step = số nét đã vẽ xong; nét đang vẽ (nếu có) là strokes[step]
  const [step, setStep] = useState(() => (reduce || !autoPlay ? total : 0))
  const [playing, setPlaying] = useState(() => !reduce && autoPlay)
  const [speed, setSpeed] = useState(1)
  const [numbers, setNumbers] = useState(false)
  const [ghost, setGhost] = useState(true)
  const paths = useRef<(SVGPathElement | null)[]>([])
  const lengths = useRef<number[]>([])
  const drawn = useRef(0) // phần đã vẽ của nét strokes[step]

  useLayoutEffect(() => {
    lengths.current = strokes.map((_, i) => paths.current[i]?.getTotalLength() ?? 100)
  }, [strokes])

  /** Đặt dash cho nét đang vẽ, xóa dash ở các nét khác. */
  const paint = useCallback(() => {
    paths.current.forEach((el, i) => {
      if (!el) return
      if (i === step) {
        const len = lengths.current[i] ?? 100
        el.style.strokeDasharray = `${len} ${len}`
        el.style.strokeDashoffset = String(len - Math.min(drawn.current, len))
      } else {
        el.style.strokeDasharray = ''
        el.style.strokeDashoffset = ''
      }
    })
  }, [step])
  useLayoutEffect(paint, [paint])

  useEffect(() => {
    if (!playing) return
    if (step >= total) {
      setPlaying(false)
      return
    }
    let raf = 0
    let last = performance.now()
    let wait = step > 0 && drawn.current === 0 ? PAUSE_MS : 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (wait > 0) wait -= dt
      else {
        drawn.current += dt * SPEED * speed
        const len = lengths.current[step] ?? 100
        if (drawn.current >= len) {
          drawn.current = 0
          setStep((s) => s + 1)
          return
        }
        paint()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, step, total, speed, paint])

  const goto = (k: number) => {
    setPlaying(false)
    drawn.current = 0
    setStep(Math.max(0, Math.min(total, k)))
  }
  const replay = () => {
    drawn.current = 0
    setStep(0)
    setPlaying(true)
  }
  const toggle = () => {
    if (playing) setPlaying(false)
    else if (step >= total) replay()
    else setPlaying(true)
  }

  const showCurrent = playing || drawn.current > 0
  return (
    <div data-stroke-order={char} data-playing={playing ? 'true' : 'false'}>
      <Frame className={SIZES[size]} label={`Thứ tự nét chữ ${char}: ${total} nét`}>
        {ghost &&
          strokes.map((s, i) => (i >= step ? <path key={`g${s.n}`} d={s.d} {...STROKE_STYLE} stroke="var(--cell-line)" opacity={0.55} /> : null))}
        {strokes.map((s, i) =>
          i < step || (i === step && showCurrent) ? (
            <path
              key={s.n}
              ref={(el) => {
                paths.current[i] = el
              }}
              d={s.d}
              {...STROKE_STYLE}
              stroke={i === step ? 'var(--beni)' : 'var(--ink)'}
            />
          ) : (
            // vẫn render (ẩn) để đo getTotalLength
            <path key={s.n} ref={(el) => {
              paths.current[i] = el
            }} d={s.d} {...STROKE_STYLE} stroke="none" />
          ),
        )}
        {numbers &&
          strokes.map((s, i) => (
            <text key={`n${s.n}`} x={s.x} y={s.y} fontSize="8" fill={i < step ? 'var(--beni)' : 'var(--muted)'} className="font-sans">
              {s.n}
            </text>
          ))}
      </Frame>

      <div className="mt-3 flex h-11 items-center gap-1.5">
        <IconButton label="Nét trước" onClick={() => goto(step - 1)} disabled={step === 0}>
          <path d="m15 18-6-6 6-6" />
        </IconButton>
        {!reduce && (
          <IconButton label={playing ? 'Tạm dừng' : 'Phát'} onClick={toggle}>
            {playing ? <path d="M9 5v14M15 5v14" /> : <path d="M7 5l12 7-12 7z" fill="currentColor" />}
          </IconButton>
        )}
        <IconButton label="Nét sau" onClick={() => goto(step + 1)} disabled={step >= total}>
          <path d="m9 18 6-6-6-6" />
        </IconButton>
        {!reduce && (
          <IconButton label="Vẽ lại" onClick={replay}>
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
          </IconButton>
        )}
        <span className="ml-1 text-sm tabular-nums text-muted" data-stroke-step aria-live="polite">
          Nét {step}/{total}
        </span>
      </div>
      <div className="mt-2 flex h-9 items-center gap-1.5">
        {!reduce && <Segmented<number> size="sm" label="Tốc độ vẽ" value={speed} onChange={setSpeed} options={SPEEDS} />}
        <button
          type="button"
          aria-pressed={numbers}
          onClick={() => setNumbers((v) => !v)}
          className="min-h-9 rounded-lg px-2.5 text-sm text-muted hover:text-ink aria-pressed:bg-ai-soft aria-pressed:text-ai"
        >
          Số nét
        </button>
        <button
          type="button"
          aria-pressed={ghost}
          onClick={() => setGhost((v) => !v)}
          className="min-h-9 rounded-lg px-2.5 text-sm text-muted hover:text-ink aria-pressed:bg-ai-soft aria-pressed:text-ai"
        >
          Nét mờ
        </button>
      </div>
      <Strip strokes={strokes} step={step} onPick={goto} />
      <p className="mt-1 h-4 truncate text-[11px] leading-4 text-muted">{STROKE_CREDIT}</p>
    </div>
  )
}

/**
 * Hướng dẫn thứ tự nét: hoạt ảnh vẽ từng nét theo đúng hướng viết, điều khiển từng nét, tốc độ, số nét,
 * dải hình tĩnh. Kích thước cố định ở mọi trạng thái (đang tải / không có dữ liệu) để không layout shift.
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
      {/* giữ đúng chiều cao phần điều khiển + dải hình như khi có dữ liệu */}
      <div aria-hidden className="h-48" />
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

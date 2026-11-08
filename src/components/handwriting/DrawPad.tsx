import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Point, Stroke } from '../../lib/handwriting/recognize'

interface Props {
  strokes: readonly Stroke[]
  onStroke: (s: Stroke) => void
  /** Kích thước khung (px CSS) mỗi khi đổi. */
  onSize: (px: number) => void
}

const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

/** Nét mượt: đường cong bậc hai qua trung điểm của các điểm liên tiếp. */
function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.length === 0) return
  ctx.beginPath()
  if (s.length === 1) {
    ctx.arc(s[0][0], s[0][1], ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.moveTo(s[0][0], s[0][1])
  for (let i = 1; i < s.length - 1; i++) {
    const m = mid(s[i], s[i + 1])
    ctx.quadraticCurveTo(s[i][0], s[i][1], m[0], m[1])
  }
  const last = s[s.length - 1]
  ctx.lineTo(last[0], last[1])
  ctx.stroke()
}

/**
 * Khung vẽ vuông có lưới chữ thập (như GridCell). Pointer events nên dùng được chuột, cảm ứng và bút;
 * touch-action: none để trang không cuộn khi đang vẽ. Tọa độ nét tính theo px CSS của khung.
 */
export function DrawPad({ strokes, onStroke, onSize }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const current = useRef<Stroke | null>(null)
  const [px, setPx] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      setPx(w)
      onSize(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [onSize])

  const context = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return null
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#17213f'
    ctx.strokeStyle = ink
    ctx.fillStyle = ink
    ctx.lineWidth = Math.max(3, px / 28)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    return ctx
  }, [px])

  // Vẽ lại toàn bộ khi đổi kích thước hoặc khi danh sách nét đổi (hoàn tác, xóa).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !px) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(px * dpr)
    canvas.height = Math.round(px * dpr)
    const ctx = context()
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, px, px)
    for (const s of strokes) drawStroke(ctx, s)
    if (current.current) drawStroke(ctx, current.current)
  }, [px, strokes, context])

  const point = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect()
    return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10]
  }

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    current.current = [point(e)]
    const ctx = context()
    if (ctx) drawStroke(ctx, current.current)
  }

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = current.current
    if (!s) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    const r = e.currentTarget.getBoundingClientRect()
    const pts: Point[] = events.length ? events.map((ev) => [ev.clientX - r.left, ev.clientY - r.top]) : [point(e)]
    const ctx = context()
    for (const p of pts) {
      const last = s[s.length - 1]
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) continue
      s.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10])
      if (!ctx) continue
      // Chỉ vẽ thêm đoạn mới (từ trung điểm trước tới trung điểm hiện tại).
      const n = s.length
      const a = n >= 3 ? mid(s[n - 3], s[n - 2]) : s[n - 2]
      const b = mid(s[n - 2], s[n - 1])
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.quadraticCurveTo(s[n - 2][0], s[n - 2][1], b[0], b[1])
      ctx.stroke()
    }
  }

  const onUp = () => {
    const s = current.current
    current.current = null
    if (s?.length) onStroke(s)
  }

  return (
    <div ref={wrapRef} className="relative aspect-square w-full overflow-hidden rounded-[3px] border-2 border-cell-line bg-surface">
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1="50" y1="0" x2="50" y2="100" stroke="var(--cell-guide)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="var(--cell-guide)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <canvas
        ref={canvasRef}
        data-drawpad
        aria-label="Khung vẽ chữ Hán: vẽ từng nét bằng chuột, ngón tay hoặc bút"
        role="img"
        className="absolute inset-0 size-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  )
}

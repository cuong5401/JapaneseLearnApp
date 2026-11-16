import type { StrokeData } from '../strokes'
import type { CellPng, RenderPng } from './docx'
import { KLEE_FAMILY, loadKleeFace } from './fonts'
import { FALLBACK_SCALE, GRAY, GUIDE_DASH, LINE, NUMBER_SIZE, STROKE_WIDTH, VIEWBOX, glyphParts } from './layout'

const DPI = 300

/** Vẽ ảnh ô (PNG nền trong suốt, 300 dpi) cho bản Word bằng canvas của trình duyệt. */
export function pngRenderer(strokes: ReadonlyMap<string, StrokeData | null>): RenderPng {
  return async (spec: CellPng) => {
    const k = DPI / 72 // px trên mỗi point
    const side = Math.max(1, Math.round(spec.pt * k))
    const canvas = document.createElement('canvas')
    canvas.width = side
    canvas.height = side
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas')
    const scalePt = side / spec.pt
    const gray = (g: number) => `rgb(${Math.round(g * 255)},${Math.round(g * 255)},${Math.round(g * 255)})`

    if (spec.guide !== 'none') {
      ctx.save()
      ctx.strokeStyle = gray(spec.guide === 'cross' ? GRAY.guide : 0.75)
      ctx.lineWidth = LINE.guide * scalePt
      if (spec.guide === 'cross') ctx.setLineDash(GUIDE_DASH.map((d) => d * scalePt))
      ctx.beginPath()
      ctx.moveTo(side / 2, 0)
      ctx.lineTo(side / 2, side)
      ctx.moveTo(0, side / 2)
      ctx.lineTo(side, side / 2)
      ctx.stroke()
      ctx.restore()
    }

    if (spec.ch) {
      for (const part of glyphParts(spec.ch, 0, 0, side)) {
        const data = strokes.get(part.ch)
        ctx.save()
        ctx.translate(part.x, part.y)
        if (data) {
          const s = part.size / VIEWBOX
          ctx.scale(s, s)
          ctx.strokeStyle = gray(spec.gray)
          ctx.lineWidth = STROKE_WIDTH
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          for (const st of data.strokes) ctx.stroke(new Path2D(st.d))
          if (spec.numbers) {
            ctx.fillStyle = gray(GRAY.number)
            ctx.font = `${NUMBER_SIZE}px "Be Vietnam Pro", sans-serif`
            for (const st of data.strokes) ctx.fillText(String(st.n), st.x, st.y)
          }
        } else {
          await loadKleeFace()
          const size = part.size * FALLBACK_SCALE
          ctx.fillStyle = gray(spec.gray)
          ctx.font = `${size}px "${KLEE_FAMILY}", "Noto Sans JP", sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(part.ch, part.size / 2, part.size / 2 + size * 0.36)
        }
        ctx.restore()
      }
    }

    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'))
    if (!blob) throw new Error('Không tạo được ảnh PNG')
    return new Uint8Array(await blob.arrayBuffer())
  }
}

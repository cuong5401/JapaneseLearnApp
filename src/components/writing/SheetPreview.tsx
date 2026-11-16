import { memo } from 'react'
import type { StrokeData } from '../../lib/strokes'
import { KLEE_FAMILY } from '../../lib/writing/fonts'
import { FAMILY } from '../../lib/writing/measure'
import {
  FALLBACK_SCALE,
  GRAY,
  STROKE_WIDTH,
  VIEWBOX,
  glyphParts,
  type Prim,
  type ScenePage,
} from '../../lib/writing/layout'
import { LEADER_WIDTH, numberLabels, numberSize } from '../../lib/writing/numbers'

/** Dữ liệu nét cho bản xem trước: undefined = đang tải, null = không có (vẽ bằng font). */
export type PreviewStrokes = ReadonlyMap<string, StrokeData | null | undefined>


// Độ xám của scene (0 = đen) → màu in; đây là màu của tờ giấy in, không theo theme.
const ink = (g: number) => {
  const v = Math.round(g * 255)
  return `rgb(${v},${v},${v})`
}

function PrimView({ p, strokes }: { p: Prim; strokes: PreviewStrokes }) {
  if (p.t === 'line') {
    return (
      <line
        x1={p.x1}
        y1={p.y1}
        x2={p.x2}
        y2={p.y2}
        stroke={ink(p.gray)}
        strokeWidth={p.w}
        strokeDasharray={p.dash?.join(' ')}
        strokeLinecap={p.dash ? 'butt' : 'square'}
      />
    )
  }
  if (p.t === 'text') {
    return (
      <text x={p.x} y={p.y} fontSize={p.size} fill={ink(p.gray)} textAnchor={p.anchor} xmlSpace="preserve">
        {p.runs.map((r, i) => (
          <tspan
            key={i}
            fontFamily={FAMILY[r.font].family}
            fontWeight={FAMILY[r.font].weight}
            fill={r.gray === undefined ? undefined : ink(r.gray)}
            lang={r.font === 'jp' ? 'ja' : undefined}
          >
            {r.text}
          </tspan>
        ))}
      </text>
    )
  }
  return (
    <>
      {glyphParts(p.ch, p.x, p.y, p.size).map((part, i) => {
        const data = strokes.get(part.ch)
        const s = part.size / VIEWBOX
        if (data === undefined) return null
        if (data === null) {
          const size = part.size * FALLBACK_SCALE
          return (
            <text
              key={i}
              x={part.x + part.size / 2}
              y={part.y + part.size / 2 + size * 0.36}
              fontSize={size}
              fontFamily={`"${KLEE_FAMILY}", "Noto Sans JP", sans-serif`}
              textAnchor="middle"
              fill={ink(p.gray)}
              lang="ja"
            >
              {part.ch}
            </text>
          )
        }
        return (
          <g key={i} transform={`translate(${part.x} ${part.y}) scale(${s})`}>
            <g fill="none" stroke={ink(p.gray)} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
              {data.strokes.map((st) => (
                <path key={st.n} d={st.d} />
              ))}
            </g>
            {p.numbers && (
              <g fontSize={numberSize(part.size)} fill={ink(GRAY.number)} stroke={ink(GRAY.number)} strokeWidth={LEADER_WIDTH / s} fontFamily='"Be Vietnam Pro", sans-serif'>
                {numberLabels(data.strokes, numberSize(part.size)).map((l) => (
                  <g key={l.n}>
                    {l.leader && <line x1={l.leader[0]} y1={l.leader[1]} x2={l.leader[2]} y2={l.leader[3]} />}
                    <text x={l.x} y={l.y} stroke="none">
                      {l.n}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </g>
        )
      })}
    </>
  )
}

/** Một trang phiếu đúng tỉ lệ khổ giấy (viewBox theo point). */
export const SheetPage = memo(function SheetPage({ page, strokes, label }: { page: ScenePage; strokes: PreviewStrokes; label: string }) {
  return (
    <svg
      viewBox={`0 0 ${page.w} ${page.h}`}
      role="img"
      aria-label={label}
      className="block h-auto w-full bg-sheet shadow-lg shadow-ink/10 ring-1 ring-line"
      data-sheet-page
    >
      {page.prims.map((p, i) => (
        <PrimView key={i} p={p} strokes={strokes} />
      ))}
    </svg>
  )
})

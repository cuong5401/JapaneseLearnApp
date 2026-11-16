import { firstPoint, samplePath, type Pt, type Stroke } from '../strokes'
import { NUMBER_SIZE, STROKE_WIDTH, VIEWBOX } from './layout'

/**
 * Vị trí số thứ tự nét trên ô chữ mẫu của phiếu in (đơn vị viewBox 109 của KanjiVG). Dùng chung cho xem trước (SVG),
 * PDF và ảnh ô của Word.
 *
 * Vị trí gốc của KanjiVG được giữ nếu không đè lên số khác / lên nét. Chỗ đông (想: 5–9 dồn quanh 目) thì dò các vị trí
 * quanh điểm đặt bút, xa dần ra ngoài, chọn chỗ không đè nét, không gần điểm đặt bút của nét khác hơn nét của mình;
 * số phải đặt xa điểm đặt bút thì có đường dẫn mảnh nối về điểm đó.
 */

/** Cỡ số nhỏ nhất khi in (point): nhỏ hơn thì khó đọc. */
export const MIN_NUMBER_PT = 6.5
/** Đường dẫn từ số về điểm đặt bút: độ dày (point). */
export const LEADER_WIDTH = 0.3

export interface NumberLabel {
  n: number
  /** Gốc text (trái, đường chân chữ) */
  x: number
  y: number
  /** Đường dẫn [x1, y1, x2, y2]: từ điểm đặt bút tới mép số */
  leader?: [number, number, number, number]
}

/** Cỡ số (đơn vị viewBox) cho ô chữ mẫu cạnh `cellPt` point: không nhỏ hơn MIN_NUMBER_PT khi in. */
export const numberSize = (cellPt: number) => Math.max(NUMBER_SIZE, (MIN_NUMBER_PT * VIEWBOX) / cellPt)

/** Ô lưới 1 đơn vị; ô có nét (đã nới thêm nửa bề dày nét + khoảng hở) ghi các nét đi qua. */
const G = VIEWBOX + 1
const CLEAR = STROKE_WIDTH / 2 + 0.4

interface Box {
  cx: number
  cy: number
  hw: number
  hh: number
}

function inkGrid(strokes: readonly Stroke[]) {
  const owners: number[][] = Array.from({ length: G * G }, () => [])
  strokes.forEach((s, i) => {
    for (const [px, py] of samplePath(s.d, 1)) {
      const r = Math.ceil(CLEAR)
      for (let gx = Math.floor(px) - r; gx <= Math.ceil(px) + r; gx++) {
        for (let gy = Math.floor(py) - r; gy <= Math.ceil(py) + r; gy++) {
          if (gx < 0 || gy < 0 || gx >= G || gy >= G) continue
          if (Math.hypot(gx + 0.5 - px, gy + 0.5 - py) > CLEAR + 0.5) continue
          const o = owners[gy * G + gx]
          if (!o.includes(i)) o.push(i)
        }
      }
    }
  })
  // Bảng tổng tiền tố: đếm nhanh số ô có nét trong một hình chữ nhật.
  const sat = new Int32Array((G + 1) * (G + 1))
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const v = owners[gy * G + gx].length ? 1 : 0
      sat[(gy + 1) * (G + 1) + gx + 1] = v + sat[gy * (G + 1) + gx + 1] + sat[(gy + 1) * (G + 1) + gx] - sat[gy * (G + 1) + gx]
    }
  }
  const inkIn = (b: Box) => {
    const x0 = Math.max(0, Math.floor(b.cx - b.hw))
    const y0 = Math.max(0, Math.floor(b.cy - b.hh))
    const x1 = Math.min(G, Math.ceil(b.cx + b.hw))
    const y1 = Math.min(G, Math.ceil(b.cy + b.hh))
    if (x1 <= x0 || y1 <= y0) return 0
    return sat[y1 * (G + 1) + x1] - sat[y0 * (G + 1) + x1] - sat[y1 * (G + 1) + x0] + sat[y0 * (G + 1) + x0]
  }
  /** Số bước (0.5 đơn vị) trên đoạn thẳng đi qua nét khác nét `own`. */
  const crossings = (a: Pt, b: Pt, own: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const k = Math.ceil(len / 0.5)
    let hits = 0
    for (let j = 1; j < k; j++) {
      const x = a[0] + ((b[0] - a[0]) * j) / k
      const y = a[1] + ((b[1] - a[1]) * j) / k
      const gx = Math.floor(x)
      const gy = Math.floor(y)
      if (gx < 0 || gy < 0 || gx >= G || gy >= G) continue
      if (owners[gy * G + gx].some((o) => o !== own)) hits++
    }
    return hits
  }
  return { inkIn, crossings }
}

/** Khoảng cách từ điểm tới hình chữ nhật (0 nếu nằm trong) và điểm gần nhất trên hình. */
function toBox(p: Pt, b: Box): { dist: number; at: Pt } {
  const at: Pt = [Math.min(b.cx + b.hw, Math.max(b.cx - b.hw, p[0])), Math.min(b.cy + b.hh, Math.max(b.cy - b.hh, p[1]))]
  return { dist: Math.hypot(p[0] - at[0], p[1] - at[1]), at }
}

const cache = new WeakMap<readonly Stroke[], Map<number, NumberLabel[]>>()

/** Vị trí số thứ tự nét cho các nét của một chữ, cỡ số `size` (đơn vị viewBox). */
export function numberLabels(strokes: readonly Stroke[], size: number = NUMBER_SIZE): NumberLabel[] {
  let bySize = cache.get(strokes)
  if (!bySize) cache.set(strokes, (bySize = new Map()))
  const hit = bySize.get(size)
  if (hit) return hit
  const out = layout(strokes, size)
  bySize.set(size, out)
  return out
}

function layout(strokes: readonly Stroke[], f: number): NumberLabel[] {
  const { inkIn, crossings } = inkGrid(strokes)
  const starts = strokes.map((s) => firstPoint(s.d))
  const placed: Box[] = []
  const gap = 0.3 * f
  // Chữ số Be Vietnam Pro: rộng ~0.58 em, cao ~0.72 em trên đường chân chữ.
  const halfW = (n: number) => 0.29 * f * String(n).length + 0.2
  const hh = 0.36 * f + 0.2
  const near = 0.5 * f // số cách điểm đặt bút ít hơn chừng này thì không cần đường dẫn

  return strokes.map((s, i) => {
    const p = starts[i]
    const hw = halfW(s.n)
    const inside = (c: Pt) => c[0] - hw >= 0.5 && c[0] + hw <= VIEWBOX - 0.5 && c[1] - hh >= 0.5 && c[1] + hh <= VIEWBOX - 0.5
    const original: Pt = [s.x + hw - 0.2, s.y - 0.36 * f]
    // Ưu tiên dịch ít quanh vị trí gốc của KanjiVG; rồi mới tới các vòng quanh điểm đặt bút, xa dần.
    const cands: Pt[] = [original]
    const ring = (o: Pt, from: number, to: number) => {
      for (let d = from; d <= to; d += 1) {
        for (let a = 0; a < 24; a++) {
          const t = (a / 24) * Math.PI * 2
          cands.push([o[0] + Math.cos(t) * d, o[1] + Math.sin(t) * d])
        }
      }
    }
    ring(original, 1, 10)
    ring(p, hh + 1, 3 * f)

    let best: { cost: number; box: Box; leader?: NumberLabel['leader'] } | null = null
    for (const c of cands) {
      if (!inside(c)) continue
      const box: Box = { cx: c[0], cy: c[1], hw, hh }
      const clash = placed.some((q) => Math.abs(q.cx - box.cx) < q.hw + box.hw + gap && Math.abs(q.cy - box.cy) < q.hh + box.hh + gap)
      const own = toBox(p, box)
      // Gần điểm đặt bút của nét khác hơn nét của mình → dễ đọc nhầm.
      const ambiguous = starts.filter((q, j) => j !== i && toBox(q, box).dist + 1 < own.dist).length
      const moved = Math.hypot(c[0] - original[0], c[1] - original[1])
      let cost = (clash ? 1000 : 0) + inkIn(box) * 8 + ambiguous * 10 + own.dist * 1.5 + moved
      if (best && cost >= best.cost) continue
      let leader: NumberLabel['leader']
      if (own.dist > near) {
        leader = [p[0], p[1], own.at[0], own.at[1]]
        cost += 8 + crossings(p, own.at, i) * 60
        if (best && cost >= best.cost) continue
      }
      best = { cost, box, leader }
    }
    const b = best?.box ?? { cx: original[0], cy: original[1], hw, hh }
    placed.push(b)
    let leader = best?.leader
    if (leader) {
      // Đường dẫn dừng cách mép số một chút.
      const [x1, y1, x2, y2] = leader
      const len = Math.hypot(x2 - x1, y2 - y1)
      const k = Math.max(0, len - 0.6) / (len || 1)
      leader = [x1, y1, x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]
    }
    const r = (v: number) => Math.round(v * 100) / 100
    return {
      n: s.n,
      x: r(b.cx - hw + 0.2),
      y: r(b.cy + 0.36 * f),
      ...(leader ? { leader: leader.map(r) as NumberLabel['leader'] } : {}),
    }
  })
}

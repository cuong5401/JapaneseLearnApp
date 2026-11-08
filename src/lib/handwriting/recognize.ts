/**
 * Nhận dạng chữ Hán viết tay bằng KanjiCanvas (src/vendor/kanjicanvas, MIT).
 *
 * Chỉ dùng phần so khớp của thư viện (không dùng canvas / listener của nó): nét vẽ do DrawPad ghi lại,
 * co về khung 256×256 rồi đưa vào `recordedPattern_<id>` và chạy
 * momentNormalize → extractFeatures → coarseClassification → fineClassification.
 * Chạy được trong Web Worker và trong Node (Vitest) nhờ shim window / document tối thiểu.
 */

export type Point = [number, number]
export type Stroke = Point[]

interface KanjiCanvasApi {
  refPatterns: unknown[]
  momentNormalize(id: string): unknown
  extractFeatures(pattern: unknown, interval: number): unknown
  coarseClassification(features: unknown): unknown
  fineClassification(features: unknown, candidates: unknown): string
  [key: string]: unknown
}

const ID = 'kotonoha'
let api: Promise<KanjiCanvasApi> | null = null

/** Nạp thư viện + mẫu nét (khoảng 2 MB, chỉ một lần). */
export function loadRecognizer(): Promise<KanjiCanvasApi> {
  if (!api) {
    const g = globalThis as Record<string, unknown>
    // kanji-canvas.js là IIFE dùng window/document; trong worker / Node chỉ cần bản tối giản.
    g.window ??= globalThis
    g.document ??= { addEventListener() {} }
    api = (async () => {
      await import('../../vendor/kanjicanvas/kanji-canvas.js')
      await import('../../vendor/kanjicanvas/ref-patterns.js')
      const kc = g.KanjiCanvas as KanjiCanvasApi | undefined
      if (!kc?.refPatterns?.length) throw new Error('Không nạp được dữ liệu nhận dạng chữ viết tay')
      return kc
    })()
    api.catch(() => {
      api = null
    })
  }
  return api
}

/** Co tọa độ từ khung vẽ (size × size) về khung 256 của thư viện; bỏ nét rỗng. */
export function toPattern(strokes: readonly Stroke[], size: number): Stroke[] {
  const k = 256 / (size || 256)
  return strokes
    .filter((s) => s.length > 0)
    .map((s) => {
      const pts = s.map(([x, y]): Point => [Math.min(256, Math.max(0, x * k)), Math.min(256, Math.max(0, y * k))])
      // Một chấm (chạm rồi nhả) vẫn là một nét: nhân đôi điểm để thư viện có đoạn để đo.
      return pts.length === 1 ? [pts[0], [pts[0][0] + 1, pts[0][1] + 1]] : pts
    })
}

/**
 * Đưa chữ trong danh sách học (`prefer`, thường là kanji.json) lên trước, giữ thứ tự của thư viện trong từng nhóm.
 * Không bỏ ứng viên nào. Lý do: vài mẫu chữ hiếm của KanjiCanvas "hút" các chữ dạng hộp (曰 thắng 日, 目 ngay cả
 * khi đưa nguyên mẫu nét của 日 vào).
 */
export function preferKnown(candidates: readonly string[], prefer?: ReadonlySet<string>): string[] {
  if (!prefer?.size) return [...candidates]
  return [...candidates.filter((c) => prefer.has(c)), ...candidates.filter((c) => !prefer.has(c))]
}

/** Tối đa 10 chữ ứng viên, chữ khớp nhất đứng đầu (ưu tiên chữ trong `prefer` nếu có). */
export function recognizeWith(kc: KanjiCanvasApi, strokes: readonly Stroke[], size: number, prefer?: ReadonlySet<string>): string[] {
  const pattern = toPattern(strokes, size)
  if (pattern.length === 0) return []
  kc[`recordedPattern_${ID}`] = pattern
  // fineClassification có đoạn console.log để gỡ lỗi (chữ 委): tạm tắt khi chạy.
  const log = console.log
  console.log = () => {}
  try {
    const normalized = kc.momentNormalize(ID)
    const features = kc.extractFeatures(normalized, 20)
    const coarse = kc.coarseClassification(features)
    const out = kc.fineClassification(features, coarse)
    return preferKnown([...new Set(out.split(/\s+/).filter(Boolean))].slice(0, 10), prefer)
  } finally {
    console.log = log
  }
}

export async function recognize(strokes: readonly Stroke[], size: number, prefer?: ReadonlySet<string>): Promise<string[]> {
  return recognizeWith(await loadRecognizer(), strokes, size, prefer)
}

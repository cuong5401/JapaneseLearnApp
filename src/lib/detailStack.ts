/**
 * Ngăn xếp chi tiết trong panel / bottom sheet: chữ Hán → từ → chữ Hán khác…
 * Lưu trong URL (?xem=w:n5-1a2b3c4d~k:日~r:72) để F5 và nút Back hoạt động đúng.
 */
export type Frame = { t: 'w'; id: string } | { t: 'k'; ch: string } | { t: 'r'; no: number }

export const MAX_FRAMES = 12
const SEP = '~'

export function frameKey(f: Frame): string {
  return f.t === 'w' ? `w:${f.id}` : f.t === 'k' ? `k:${f.ch}` : `r:${f.no}`
}

export function parseFrame(s: string): Frame | null {
  const i = s.indexOf(':')
  if (i < 1) return null
  const t = s.slice(0, i)
  const v = s.slice(i + 1)
  if (!v) return null
  if (t === 'w' && /^[a-z0-9-]+$/.test(v)) return { t: 'w', id: v }
  if (t === 'k' && [...v].length === 1) return { t: 'k', ch: v }
  if (t === 'r' && /^\d{1,3}$/.test(v)) return { t: 'r', no: Number(v) }
  return null
}

export function parseStack(param: string | null | undefined): Frame[] {
  if (!param) return []
  return param
    .split(SEP)
    .map(parseFrame)
    .filter((f): f is Frame => f !== null)
    .slice(-MAX_FRAMES)
}

export const serializeStack = (frames: readonly Frame[]) => frames.map(frameKey).join(SEP)

export const sameFrame = (a: Frame | undefined, b: Frame | undefined) => Boolean(a && b && frameKey(a) === frameKey(b))

/**
 * Thêm khung lên đầu ngăn xếp. `below` là khung nằm dưới cùng không thuộc danh sách (ví dụ chữ Hán gốc
 * ở ?k=): không đẩy trùng khung đang hiện. Quá MAX_FRAMES thì bỏ khung cũ nhất.
 */
export function pushFrame(frames: readonly Frame[], f: Frame, below?: Frame): Frame[] {
  const top = frames[frames.length - 1] ?? below
  if (sameFrame(top, f)) return [...frames]
  return [...frames, f].slice(-MAX_FRAMES)
}

export const popFrame = (frames: readonly Frame[]) => frames.slice(0, -1)

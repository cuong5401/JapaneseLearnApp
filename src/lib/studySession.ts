/**
 * Lưu phiên học đang dở (flashcard, quiz, ôn tập, cách đếm, kana) vào sessionStorage theo từng bài,
 * để lỡ tay rời trang / F5 / Back vẫn tiếp tục được. Chỉ sống trong tab hiện tại (không vào file xuất tiến độ):
 * kết quả chấm đã nằm trong lịch ôn, đây chỉ là vị trí và kết quả của lượt đang làm.
 */

const PREFIX = 'jla:session:'
/** Phiên cũ hơn chừng này thì bỏ (mở lại hôm sau không hỏi nữa). */
export const SESSION_TTL = 12 * 60 * 60 * 1000

export interface SessionMeta {
  /** Số câu / thẻ đã chấm */
  answered: number
  /** Tổng số câu / thẻ của lượt */
  total: number
  /** Lúc lưu (ms) */
  at: number
}

export interface SavedSession<S> extends SessionMeta {
  v: 1
  state: S
}

/** FNV-1a 32 bit, đủ để phân biệt danh sách mục của các bài. */
export function hashIds(ids: readonly string[]): string {
  let h = 0x811c9dc5
  const s = ids.join('|')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Khóa của một phiên: loại phiên + trang + danh sách mục (không phụ thuộc thứ tự trộn). */
export function sessionKey(kind: string, pathname: string, ids: readonly string[]): string {
  return `${PREFIX}${kind}:${pathname}:${hashIds([...ids].sort())}`
}

/** Phiên còn dở: đã chấm ít nhất 1 câu, chưa xong, chưa quá hạn. */
export function isResumable(s: SessionMeta | null, now = Date.now()): boolean {
  return Boolean(s && s.answered > 0 && s.answered < s.total && now - s.at < SESSION_TTL)
}

export function readSession<S>(key: string, now = Date.now()): SavedSession<S> | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const s = JSON.parse(raw) as SavedSession<S>
    if (s?.v !== 1 || typeof s.answered !== 'number' || typeof s.total !== 'number' || typeof s.at !== 'number') return null
    return isResumable(s, now) ? s : null
  } catch {
    return null
  }
}

export function writeSession<S>(key: string, state: S, meta: Omit<SessionMeta, 'at'>, now = Date.now()): void {
  try {
    if (meta.answered <= 0 || meta.answered >= meta.total) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify({ v: 1, state, ...meta, at: now } satisfies SavedSession<S>))
  } catch {
    // Bộ nhớ đầy / bị chặn: phiên vẫn chạy, chỉ không tiếp tục được sau khi rời trang.
  }
}

export function clearSession(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // bỏ qua
  }
}

/** Tham số URL không làm rời phiên học (mở panel chi tiết, trang của lưới bài). */
const IGNORED_PARAMS = new Set(['xem', 'k', 'trang'])

function stripSearch(search: string): string {
  const q = new URLSearchParams(search)
  for (const k of IGNORED_PARAMS) q.delete(k)
  q.sort()
  return q.toString()
}

/** Điều hướng này có rời màn phiên học không (đổi trang, hoặc đổi tham số như ?tab= / ?mode= / ?luyen=). */
export function leavesSession(from: { pathname: string; search: string }, to: { pathname: string; search: string }): boolean {
  return from.pathname !== to.pathname || stripSearch(from.search) !== stripSearch(to.search)
}

/**
 * Khóa cuộn trang khi mở lớp phủ trên điện thoại. iOS Safari bỏ qua `overflow: hidden` trên body
 * (trang vẫn cuộn theo khi vuốt trong lớp phủ), nên cố định body tại vị trí hiện tại:
 * `position: fixed; top: -scrollY; width: 100%`, rồi trả về đúng vị trí cũ khi mở khóa.
 * Đếm tham chiếu: nhiều lớp phủ cùng khóa thì chỉ mở khi lớp cuối cùng đóng.
 */
let count = 0
let saved: { y: number; style: Partial<CSSStyleDeclaration> } | null = null

export function lockScroll(): () => void {
  if (count++ === 0) {
    const body = document.body
    const y = window.scrollY
    saved = { y, style: { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow } }
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (--count > 0 || !saved) return
    const body = document.body
    Object.assign(body.style, saved.style)
    window.scrollTo(0, saved.y)
    saved = null
  }
}

/** Vị trí cuộn của trang lúc bị khóa (null nếu không khóa). */
export const lockedScrollY = () => (saved ? saved.y : null)

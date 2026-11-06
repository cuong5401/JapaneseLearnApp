const INTERACTIVE = 'button, a, input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/**
 * Phím tắt toàn trang phải nhường cho phần tử đang nhận focus:
 * trả về true nếu sự kiện đến từ button, link, ô nhập… hoặc có phím bổ trợ.
 */
export function isInteractiveTarget(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true
  const el = e.target instanceof Element ? e.target : document.activeElement
  return Boolean(el?.closest(INTERACTIVE))
}

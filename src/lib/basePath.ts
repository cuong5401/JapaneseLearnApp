/**
 * Đường dẫn bị lặp basename (vd. /JapaneseLearnApp/JapaneseLearnApp/kanji, do lỗi cũ ghép
 * window.location.pathname vào navigate()) → trả đường dẫn đúng; null nếu không cần sửa.
 * `base` là import.meta.env.BASE_URL ('/JapaneseLearnApp/' khi build, '/' khi dev).
 */
export function fixDuplicateBase(pathname: string, base: string): string | null {
  const seg = base.replace(/^\/+|\/+$/g, '')
  if (!seg) return null
  const once = `/${seg}`
  let p = pathname
  while (p === `${once}${once}` || p.startsWith(`${once}${once}/`)) p = p.slice(once.length)
  return p === pathname ? null : p
}

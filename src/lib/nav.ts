export interface NavItem {
  to: string
  glyph: string
  label: string
  /** Các trang con (đường dẫn cũ giữ nguyên) làm mục này sáng: đang ở /kanji thì "Học" sáng. */
  match: string[]
  /** Nhóm trong sidebar desktop (có tiêu đề nhỏ) */
  group: 'study' | 'me'
}

/**
 * Điều hướng chính 5 mục (sidebar desktop, nav trên tablet, thanh đáy điện thoại). Hỏi AI là tab nổi ở lề phải
 * (AiDock), không nằm trong điều hướng. Đường dẫn cũ (/kanji, /grammar, /progress, /settings…) vẫn dùng được và làm
 * mục cha tương ứng sáng.
 */
export const NAV: NavItem[] = [
  { to: '/', glyph: '家', label: 'Trang chủ', match: [], group: 'study' },
  { to: '/learn', glyph: '学', label: 'Học', match: ['/learn', '/vocab', '/word', '/kanji', '/grammar', '/kana', '/terms', '/writing', '/level'], group: 'study' },
  { to: '/review', glyph: '復', label: 'Ôn tập', match: ['/review'], group: 'study' },
  { to: '/notebooks', glyph: '帳', label: 'Sổ tay', match: ['/notebooks'], group: 'study' },
  { to: '/me', glyph: '私', label: 'Cá nhân', match: ['/me', '/progress', '/settings'], group: 'me' },
]

export const NAV_GROUPS: { key: NavItem['group']; title: string }[] = [
  { key: 'study', title: 'Học tập' },
  { key: 'me', title: 'Của bạn' },
]

/** Mục điều hướng đang chọn theo đường dẫn (cả trang con). */
export function navActive(item: NavItem, pathname: string): boolean {
  if (item.to === '/') return pathname === '/'
  return item.match.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

import { t } from '../i18n'
import { sectionOf, type RootPath } from './routeTree'

export interface NavItem {
  to: RootPath
  glyph: string
  label: string
  /** Nhóm trong sidebar desktop (có tiêu đề nhỏ) */
  group: 'study' | 'me'
}

/**
 * Điều hướng chính 5 mục (sidebar desktop, nav trên tablet, thanh đáy điện thoại). Hỏi AI là tab nổi ở lề phải
 * (AiDock), không nằm trong điều hướng. Mục nào sáng do cây cha – con (`routeTree.ts`) quyết định: /kanji, /vocab/…,
 * /grammar/… → "Học"; /progress, /settings, /ai → "Cá nhân".
 */
const item = (to: RootPath, glyph: string, key: Parameters<typeof t>[0], group: NavItem['group']): NavItem => ({
  to,
  glyph,
  get label() {
    return t(key)
  },
  group,
})

export const NAV: NavItem[] = [
  item('/', '家', 'common.trangChu', 'study'),
  item('/learn', '学', 'common.hoc', 'study'),
  item('/review', '復', 'common.onTap', 'study'),
  item('/notebooks', '帳', 'common.soTay', 'study'),
  item('/me', '私', 'common.caNhan', 'me'),
]

export const NAV_GROUPS: { key: NavItem['group']; title: string }[] = [
  {
    key: 'study',
    get title() {
      return t('nav.hocTap')
    },
  },
  {
    key: 'me',
    get title() {
      return t('nav.cuaBan')
    },
  },
]

/** Mục điều hướng đang chọn: trang gốc chứa đường dẫn hiện tại theo cây cha – con. */
export function navActive(nav: NavItem, pathname: string): boolean {
  return sectionOf(pathname) === nav.to
}

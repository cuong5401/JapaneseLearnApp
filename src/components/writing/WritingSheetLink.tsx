import { ButtonLink } from '../Pressable'

/** Icon tờ giấy có dòng kẻ ô. */
export function SheetIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16M10 9v12M15 9v12M4 15h16" />
    </svg>
  )
}

/** Nút "Tạo phiếu luyện viết" (trang bài Chữ Hán, Sổ tay, bảng kana) → /writing với nguồn chọn sẵn. */
export function WritingSheetLink({ to, className = '' }: { to: string; className?: string }) {
  return (
    <ButtonLink
      to={to}
      data-writing-link
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:border-ai ${className}`}
    >
      <SheetIcon />
      Tạo phiếu luyện viết
    </ButtonLink>
  )
}

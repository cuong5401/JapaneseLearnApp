import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { parentOf, type ParentLink } from '../lib/routeTree'

interface Props {
  title: string
  /**
   * Nút "‹ …": mặc định lấy cha trực tiếp từ cây cha – con (`lib/routeTree.ts`). Chỉ truyền khi trang biết cha cụ thể
   * hơn trong cùng nhánh (vd. chi tiết từ → đúng bài chứa từ); `false` = không hiện.
   */
  back?: ParentLink | false
  children?: ReactNode
}

export function PageHeader({ title, back, children }: Props) {
  const { pathname } = useLocation()
  const link = back === false ? null : (back ?? parentOf(pathname))
  return (
    <div className="mb-6">
      {link && (
        <Link
          to={link.to}
          data-back-link
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          {link.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {children}
      </div>
    </div>
  )
}

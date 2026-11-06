import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  back?: { to: string; label: string }
  children?: ReactNode
}

export function PageHeader({ title, back, children }: Props) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {children}
      </div>
    </div>
  )
}

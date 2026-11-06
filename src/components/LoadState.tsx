import type { ReactNode } from 'react'
import { Button } from './Pressable'

/** Khối xám nhấp nháy giữ chỗ trong lúc tải. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-sunken ${className}`} />
}

/** Bộ khung trang chung: tiêu đề + lưới ô trống. */
export function PageSkeleton({ rows = 6, grid = false, header = false }: { rows?: number; grid?: boolean; header?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-label="Đang tải dữ liệu">
      {header && (
        <>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 mb-8 h-9 w-56" />
        </>
      )}
      <div className={grid ? ' grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3' : 'space-y-3'}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className={grid ? 'h-28' : 'h-16'} />
        ))}
      </div>
      <span className="sr-only">Đang tải dữ liệu…</span>
    </div>
  )
}

export function LoadError({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-beni bg-beni-soft p-5">
      <h2 className="font-semibold text-beni">Không tải được dữ liệu</h2>
      <p className="mt-1 text-sm">
        Kiểm tra kết nối mạng rồi thử lại.
        {error && <span className="mt-1 block break-words text-xs text-muted">{error}</span>}
      </p>
      <Button onClick={onRetry} className="mt-4 min-h-11 rounded-lg bg-beni px-5 font-semibold text-on-ai">
        Thử lại
      </Button>
    </div>
  )
}

/** Hiện skeleton khi đang tải, hộp lỗi có nút thử lại khi lỗi, nội dung khi sẵn sàng. */
export function Loaded<T>({
  state,
  skeleton,
  children,
}: {
  state: { status: string; data?: T; error?: string; retry: () => void }
  skeleton?: ReactNode
  children: (data: T) => ReactNode
}) {
  if (state.status === 'error') return <LoadError error={state.error} onRetry={state.retry} />
  if (state.status !== 'ready' || state.data === undefined) return <>{skeleton ?? <PageSkeleton />}</>
  return <>{children(state.data)}</>
}

import type { ReactNode } from 'react'

/** Khung hai mặt dùng chung (lớp .flip của flashcard từ vựng). Chừa góc phải trên cho nút đánh dấu. */
export function Flip({ flipped, front, back }: { flipped: boolean; front: ReactNode; back: ReactNode }) {
  return (
    <div className="flip h-full">
      <div className={`flip-inner grid h-full ${flipped ? 'is-flipped' : ''}`}>
        <div className="@container flip-face col-start-1 row-start-1 flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6">
          {front}
          <p className="mt-6 text-sm text-muted">Chạm để lật thẻ</p>
        </div>
        <div className="@container flip-face flip-back col-start-1 row-start-1 flex flex-col overflow-y-auto overscroll-contain rounded-2xl border border-ai bg-surface p-6">
          {back}
        </div>
      </div>
    </div>
  )
}

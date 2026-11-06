import { ButtonLink } from '../components/Pressable'
import { GridCell } from '../components/GridCell'

export function NotFound() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <GridCell className="size-28 text-muted">迷</GridCell>
      <h1 className="mt-6 text-2xl font-bold">Không tìm thấy trang này</h1>
      <p className="mt-2 text-muted">Đường dẫn có thể đã sai hoặc bộ học không tồn tại.</p>
      <ButtonLink to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-ai px-5 font-semibold text-on-ai">
        Về trang chủ
      </ButtonLink>
    </div>
  )
}

import { Navigate, useParams } from 'react-router-dom'

/** Đường dẫn cũ /level/N5[/...] → bộ từ mới; /level/N5/kanji → trang Kanji lọc theo cấp. */
export function LegacyLevel({ kanji = false }: { kanji?: boolean }) {
  const { level = 'n5' } = useParams()
  return <Navigate to={kanji ? `/kanji?level=${level.toUpperCase()}` : `/vocab/${level.toLowerCase()}`} replace />
}

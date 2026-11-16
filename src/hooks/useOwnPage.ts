import { useCallback, useContext, useEffect, useRef } from 'react'
import { UNSAFE_DataRouterContext } from 'react-router-dom'

/**
 * Trang đã rời đi không được ghi URL: trả về hàm kiểm tra "lúc này tôi còn là trang đang hiển thị không".
 * Đọc router.state (trạng thái sống) chứ không đọc location của lần render đã tạo callback, nên callback bị
 * trễ (kéo sheet xuống, hẹn giờ, hiệu ứng thoát) chạy sau khi đã chuyển trang sẽ bị bỏ qua thay vì
 * setParams / navigate(-n) lên URL của trang mới.
 *  - mặc định: pathname phải còn đúng như lúc mount (trang riêng như /kanji);
 *  - `follow`: thành phần sống xuyên các trang (Layout, GlobalDetail) chỉ cần còn mount.
 *
 * Cả hai vế so sánh đều lấy từ router.state.location (đã gồm basename /JapaneseLearnApp/), không trộn với
 * useLocation() (đã bỏ basename): trộn sẽ luôn lệch ở bản production.
 */
export function useOwnPage(follow = false): () => boolean {
  const router = useContext(UNSAFE_DataRouterContext)?.router
  const own = useRef<string | null>(null)
  if (own.current === null) own.current = router?.state.location.pathname ?? ''
  const alive = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  return useCallback(() => {
    if (!alive.current) return false
    if (follow || !router) return true
    return router.state.location.pathname === own.current
  }, [router, follow])
}

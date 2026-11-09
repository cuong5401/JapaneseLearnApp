import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { parseStack, popFrame, pushFrame, serializeStack, type Frame } from '../lib/detailStack'

/** Số bước đã push vào lịch sử trình duyệt cho ngăn xếp (lưu trong location.state). */
interface StackState {
  stack?: number
}

export interface DetailStack {
  /** Khung gốc (chữ Hán ở ?k=) + các khung đẩy thêm (?xem=) */
  frames: Frame[]
  /** Khung gốc lấy từ URL (?k=), nếu có */
  root: Frame | null
  /** Thao tác BÊN TRONG panel (chữ/từ liên quan): đẩy thêm một khung. */
  push: (f: Frame) => void
  /**
   * Bấm một mục ở danh sách chính (lưới, kết quả tìm kiếm, sổ tay): THAY cả ngăn xếp bằng đúng mục đó.
   * Panel đang mở (hoặc `replace`) thì thay mục lịch sử hiện tại, chưa mở thì đẩy một mục để Back đóng lại.
   */
  open: (f: Frame, opts?: { replace?: boolean }) => void
  /** Lùi một khung: dùng lịch sử trình duyệt nếu khung đó do mình push (để Back và "←" giống nhau). */
  back: () => void
  /** Đóng hết ngăn xếp (và bỏ khung gốc nếu `includeRoot`). */
  close: (includeRoot?: boolean) => void
}

/**
 * Ngăn xếp chi tiết theo URL.
 *  - `rootParam`: tham số chứa chữ Hán gốc ("k"; "c" là tên cũ vẫn đọc được).
 *  - Mỗi lần push thêm một mục vào lịch sử trình duyệt, nên nút Back của trình duyệt/điện thoại
 *    lùi một khung hoặc đóng sheet thay vì rời trang.
 */
export function useDetailStack(rootParam?: 'k'): DetailStack {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const depth = (location.state as StackState | null)?.stack ?? 0

  const xem = params.get('xem')
  const rootCh = rootParam ? (params.get(rootParam) ?? params.get('c')) : null
  const root = useMemo<Frame | null>(() => (rootCh && [...rootCh].length === 1 ? { t: 'k', ch: rootCh } : null), [rootCh])
  const extra = useMemo(() => parseStack(xem), [xem])
  const frames = useMemo(() => (root ? [root, ...extra] : extra), [root, extra])

  const push = useCallback(
    (f: Frame) => {
      const next = pushFrame(extra, f, root ?? undefined)
      // Trùng khung đang hiện thì bỏ qua (đủ 8 khung thì độ dài không đổi nhưng vẫn là khung mới).
      if (serializeStack(next) === serializeStack(extra)) return
      setParams(
        (p) => {
          p.set('xem', serializeStack(next))
          return p
        },
        { state: { stack: depth + 1 } satisfies StackState },
      )
    },
    [extra, root, depth, setParams],
  )

  const back = useCallback(() => {
    if (depth > 0) return navigate(-1)
    setParams(
      (p) => {
        if (extra.length > 1) p.set('xem', serializeStack(popFrame(extra)))
        else if (extra.length === 1) p.delete('xem')
        else if (rootParam) {
          p.delete(rootParam)
          p.delete('c')
        }
        return p
      },
      { replace: true, state: location.state },
    )
  }, [depth, extra, navigate, setParams, rootParam, location.state])

  const close = useCallback(
    (includeRoot = false) => {
      if (depth > 0) {
        // Lùi đúng số bước đã push: lịch sử trở lại như trước khi mở chi tiết.
        navigate(-depth)
        return
      }
      setParams(
        (p) => {
          p.delete('xem')
          if (includeRoot && rootParam) {
            p.delete(rootParam)
            p.delete('c')
          }
          return p
        },
        { replace: true },
      )
    },
    [depth, navigate, setParams, rootParam],
  )

  const open = useCallback(
    (f: Frame, opts?: { replace?: boolean }) => {
      const replace = frames.length > 0 || Boolean(opts?.replace)
      setParams(
        (p) => {
          p.delete('c')
          if (rootParam && f.t === 'k') {
            p.delete('xem')
            p.set(rootParam, f.ch)
          } else {
            if (rootParam) p.delete(rootParam)
            p.set('xem', serializeStack([f]))
          }
          return p
        },
        replace ? { replace: true, state: location.state } : { state: { stack: depth + 1 } satisfies StackState },
      )
    },
    [frames.length, rootParam, setParams, location.state, depth],
  )

  return { frames, root, push, open, back, close }
}

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
  push: (f: Frame) => void
  /** Lùi một khung: dùng lịch sử trình duyệt nếu khung đó do mình push (để Back và "←" giống nhau). */
  back: () => void
  /** Đóng hết ngăn xếp (và bỏ khung gốc nếu `includeRoot`). */
  close: (includeRoot?: boolean) => void
  /** Chọn khung gốc mới (chữ Hán trên lưới): push trên điện thoại để Back đóng sheet, replace trên desktop. */
  setRoot: (ch: string | null, mode: 'push' | 'replace') => void
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
      if (next.length === extra.length) return
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

  const setRoot = useCallback(
    (ch: string | null, mode: 'push' | 'replace') => {
      if (!rootParam) return
      setParams(
        (p) => {
          p.delete('xem')
          p.delete('c')
          if (ch) p.set(rootParam, ch)
          else p.delete(rootParam)
          return p
        },
        mode === 'push' ? { state: { stack: depth + 1 } satisfies StackState } : { replace: true, state: location.state },
      )
    },
    [rootParam, setParams, depth, location.state],
  )

  return { frames, root, push, back, close, setRoot }
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useLocation, type BlockerFunction } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { clearSession, leavesSession, readSession, sessionKey, writeSession, type SavedSession } from '../lib/studySession'

/**
 * Nhớ phiên học đang dở theo bài (sessionStorage, xem `lib/studySession.ts`).
 *  - `offer`: phiên dở đọc được lúc mở bài → hiện `ResumePrompt` ("Tiếp tục từ câu 8/20?").
 *  - `save(state, answered, total)`: gọi mỗi lần chấm một câu; xong lượt (answered = total) thì tự xóa.
 */
export function useStudySession<S>(kind: string, ids: readonly string[]) {
  const { pathname } = useLocation()
  const idsKey = ids.join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = useMemo(() => sessionKey(kind, pathname, ids), [kind, pathname, idsKey])
  const [offer, setOffer] = useState<{ key: string; saved: SavedSession<S> | null }>(() => ({ key, saved: readSession<S>(key) }))
  // Đổi bài (danh sách khác) mà component không mount lại: đọc lại cho bài mới.
  const current = offer.key === key ? offer.saved : readSession<S>(key)
  if (offer.key !== key) setOffer({ key, saved: current })

  const save = useCallback((state: S, answered: number, total: number) => writeSession(key, state, { answered, total }), [key])
  const clear = useCallback(() => clearSession(key), [key])
  const dismiss = useCallback(() => setOffer({ key, saved: null }), [key])
  const restart = useCallback(() => {
    clearSession(key)
    setOffer({ key, saved: null })
  }, [key])

  return { offer: current, save, clear, dismiss, restart }
}

/**
 * Đã làm ≥ 3 câu mà chưa xong: bấm điều hướng / Back / đổi tab hỏi lại bằng hộp thoại của app.
 * Tiến độ đã lưu nên chỉ cần nói rõ là mở lại bài sẽ tiếp tục được.
 */
export function useLeaveGuard(active: boolean, info: { answered: number; total: number; unit?: string }) {
  // useBlocker gỡ blocker trong cleanup của useEffect (chạy trễ sau khi trang đã đổi): bấm Back ngay sau khi rời
  // trang thì blocker cũ vẫn chặn. Cờ đặt bằng layout effect (dọn đồng bộ khi unmount) + cờ "đang rời" chặn việc đó.
  const mounted = useRef(false)
  const leaving = useRef(false)
  useLayoutEffect(() => {
    mounted.current = true
    leaving.current = false
    return () => {
      mounted.current = false
    }
  }, [])
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => mounted.current && !leaving.current && active && leavesSession(currentLocation, nextLocation),
    [active],
  )
  const blocker = useBlocker(shouldBlock)
  const blocked = blocker.state === 'blocked'

  // Phiên vừa xong trong lúc hộp thoại đang mở: cho đi luôn.
  useEffect(() => {
    if (blocked && !active) blocker.proceed?.()
  }, [blocked, active, blocker])

  if (!blocked) return null
  const unit = info.unit ?? 'câu'
  return (
    <ConfirmDialog
      title="Rời phiên học?"
      confirmLabel="Rời trang"
      cancelLabel="Học tiếp"
      onConfirm={() => {
        leaving.current = true
        blocker.proceed?.()
      }}
      onCancel={() => blocker.reset?.()}
    >
      Tiến độ đã được lưu ({unit} {info.answered}/{info.total}). Mở lại bài này để tiếp tục từ chỗ đang dừng.
    </ConfirmDialog>
  )
}

import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { aiDock, historyMark } from '../lib/ai/dock'
import { DOCK_PHONE, useMediaQuery } from './useMediaQuery'

/**
 * Bottom nav / header trên điện thoại khi khung "Hỏi AI" đang mở: một lần bấm vừa thu gọn khung vừa chuyển trang.
 * Mục lịch sử do khung tự đẩy ('own') được THAY bằng trang mới (replace), nên Back sau đó lùi trang bình thường,
 * không có lần bấm Back "chết". Desktop: không can thiệp (khung giữ nguyên khi chuyển trang).
 * `to` là đường dẫn trong app ('/kanji'), không gồm basename.
 */
export function useDockNavClick() {
  const phone = useMediaQuery(DOCK_PHONE)
  const navigate = useNavigate()
  return (to: string) => (e: MouseEvent) => {
    if (!phone || !aiDock.getSnapshot().open) return
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const own = historyMark() === 'own'
    aiDock.close()
    navigate(to, { replace: own })
  }
}

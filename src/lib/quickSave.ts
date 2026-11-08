import { notebooks } from './notebooks'
import { openSaveSheet } from './saveSheet'
import { showToast } from './toast'

/** Lưu nhanh vào sổ dùng gần nhất và báo bằng toast có nút "Đổi" (mở sheet chọn sổ). */
export function quickSave(ref: string) {
  const book = notebooks.quickSave(ref)
  showToast(`Đã lưu vào ${book.name}`, { label: 'Đổi', run: () => openSaveSheet(ref) })
}

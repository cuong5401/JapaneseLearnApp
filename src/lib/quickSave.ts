import { notebooks } from './notebooks'
import { openSaveSheet } from './saveSheet'
import { showToast } from './toast'
import { t } from '../i18n'

/** Lưu nhanh vào sổ dùng gần nhất và báo bằng toast có nút "Đổi" (mở sheet chọn sổ). */
export function quickSave(ref: string) {
  const book = notebooks.quickSave(ref)
  showToast(t('quickSave.daLuuVao', { name: book.name }), { label: t('quickSave.doi'), run: () => openSaveSheet(ref) })
}

import { useRef, useState, type ChangeEvent } from 'react'
import { useCards } from '../hooks/useProgress'
import { backupFileName, createBackup, mergeCards, parseBackup, type Backup } from '../lib/backup'
import { kanaProgress, mergeKanaStats, useKanaStats } from '../lib/kanaProgress'
import { mergeNotebooks, notebooks } from '../lib/notebooks'
import { progress } from '../lib/progress'
import { setLessonSize, useLessonSize } from '../lib/settings'

type Pending = { name: string; backup: Backup; skipped: number; added: number; updated: number; kana: number; notes: number }
type Notice = { tone: 'ok' | 'error'; text: string }

/** Xuất tiến độ ra file .json và nhập lại ở máy khác (gộp, không ghi đè thẻ mới hơn). */
export function BackupPanel() {
  const cards = useCards()
  const lessonSize = useLessonSize()
  const kanaStats = useKanaStats()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const total = Object.keys(cards).length
  const kanaTotal = Object.keys(kanaStats).length

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(createBackup(cards, lessonSize, kanaStats, new Date(), notebooks.getSnapshot()), null, 1)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice({ tone: 'ok', text: `Đã xuất ${total} thẻ${kanaTotal ? ` và ${kanaTotal} chữ kana` : ''}. Mở file này ở máy kia bằng “Nhập tiến độ”.` })
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setNotice(null)
    const r = parseBackup(await file.text())
    if (!r.ok) {
      setPending(null)
      setNotice({ tone: 'error', text: r.error })
      return
    }
    const m = mergeCards(cards, r.backup.cards)
    const k = mergeKanaStats(kanaStats, r.backup.kana ?? {})
    const nb = r.backup.notebooks ? mergeNotebooks(notebooks.getSnapshot(), r.backup.notebooks) : null
    setPending({ name: file.name, backup: r.backup, skipped: r.skipped, added: m.added, updated: m.updated, kana: k.changed, notes: nb ? nb.addedBooks + nb.addedItems : 0 })
  }

  const confirmImport = () => {
    if (!pending) return
    // Gộp lại với tiến độ hiện tại ngay lúc xác nhận (có thể vừa học thêm).
    const m = mergeCards(progress.getSnapshot(), pending.backup.cards)
    progress.importCards(m.cards)
    const k = mergeKanaStats(kanaProgress.getSnapshot(), pending.backup.kana ?? {})
    if (k.changed) kanaProgress.replace(k.stats)
    const nb = pending.backup.notebooks ? mergeNotebooks(notebooks.getSnapshot(), pending.backup.notebooks) : null
    if (nb && nb.addedBooks + nb.addedItems > 0) notebooks.replace(nb.state)
    if (pending.backup.lessonSize) setLessonSize(pending.backup.lessonSize)
    setPending(null)
    setNotice({ tone: 'ok', text: `Đã nhập: ${m.added} thẻ mới, ${m.updated} thẻ được cập nhật${k.changed ? `, ${k.changed} chữ kana` : ''}${nb && nb.addedItems + nb.addedBooks ? `, ${nb.addedBooks} sổ tay mới, ${nb.addedItems} mục sổ tay` : ''}.` })
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Tiến độ lưu riêng trên từng trình duyệt. Xuất ra file rồi nhập ở máy khác để học tiếp. Khi nhập, mỗi thẻ giữ bản được ôn gần nhất, không
        mất thẻ đang có.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportFile}
          disabled={total + kanaTotal === 0}
          className="min-h-11 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40"
        >
          Xuất tiến độ
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-11 rounded-lg border-2 border-ai px-4 font-semibold text-ai hover:bg-ai-soft"
        >
          Nhập tiến độ
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="sr-only" tabIndex={-1} aria-label="Chọn file tiến độ" />
      </div>

      {pending && (
        <div role="alertdialog" aria-label="Xác nhận nhập tiến độ" className="mt-4 rounded-xl border border-ai bg-ai-soft/50 p-4">
          <p className="font-semibold break-all">{pending.name}</p>
          <p className="mt-1 text-sm">
            {Object.keys(pending.backup.cards).length} thẻ trong file: {pending.added} thẻ mới, {pending.updated} thẻ mới hơn bản trên máy này
            {pending.kana > 0 && `, ${pending.kana} chữ kana mới hơn`}
            {pending.notes > 0 && `, ${pending.notes} sổ/mục sổ tay mới`}
            {pending.skipped > 0 && `, ${pending.skipped} mục hỏng bị bỏ qua`}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmImport}
              disabled={pending.added + pending.updated + pending.kana + pending.notes === 0}
              className="min-h-11 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40"
            >
              {pending.added + pending.updated + pending.kana + pending.notes === 0 ? 'Không có gì mới' : 'Nhập và gộp'}
            </button>
            <button type="button" onClick={() => setPending(null)} className="min-h-11 rounded-lg border border-line bg-surface px-4">
              Hủy
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p role="status" className={`mt-3 text-sm font-medium ${notice.tone === 'ok' ? 'text-matsu' : 'text-beni'}`}>
          {notice.text}
        </p>
      )}
    </div>
  )
}

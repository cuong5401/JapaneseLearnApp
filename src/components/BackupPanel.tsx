import { useRef, useState, type ChangeEvent } from 'react'
import { useCards } from '../hooks/useProgress'
import { backupFileName, createBackup, mergeCards, parseBackup, type Backup } from '../lib/backup'
import { kanaProgress, mergeKanaStats, useKanaStats } from '../lib/kanaProgress'
import { aiWords, mergeAiWords } from '../lib/aiWords'
import { grammarChecked, mergeChecked } from '../lib/grammarChecked'
import { mergeNotebooks, notebooks } from '../lib/notebooks'
import { progress } from '../lib/progress'
import { mergeLogs, reviewLog } from '../lib/reviewLog'
import { srsSettings } from '../lib/srsSettings'
import { setLessonSize, useLessonSize } from '../lib/settings'
import { getLocale, setLocale, t } from '../i18n'
import { showToast } from '../lib/toast'

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
    const blob = new Blob([JSON.stringify(createBackup(cards, lessonSize, kanaStats, new Date(), notebooks.getSnapshot(), grammarChecked.getSnapshot(), aiWords.getSnapshot(), { reviewLog: reviewLog.packed(), srsSettings: srsSettings.getSnapshot(), locale: getLocale() }), null, 1)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice({ tone: 'ok', text: t('backupPanel.daXuatTheMo', { total, v: kanaTotal ? t('backupPanel.andKana', { n: kanaTotal }) : '' }) })
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
    const gc = mergeChecked(grammarChecked.getSnapshot(), r.backup.grammarChecked ?? {})
    setPending({
      name: file.name,
      backup: r.backup,
      skipped: r.skipped,
      added: m.added,
      updated: m.updated,
      kana: k.changed,
      notes: (nb ? nb.addedBooks + nb.addedItems : 0) + gc.added + mergeAiWords(aiWords.getSnapshot(), r.backup.aiWords ?? {}).added,
    })
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
    const gc = mergeChecked(grammarChecked.getSnapshot(), pending.backup.grammarChecked ?? {})
    if (gc.added) grammarChecked.replace(gc.map)
    const aw = mergeAiWords(aiWords.getSnapshot(), pending.backup.aiWords ?? {})
    if (aw.added) aiWords.replace(aw.map)
    if (pending.backup.lessonSize) setLessonSize(pending.backup.lessonSize)
    if (pending.backup.reviewLog) reviewLog.replace(mergeLogs(reviewLog.packed(), pending.backup.reviewLog))
    if (pending.backup.srsSettings) srsSettings.replace(pending.backup.srsSettings)
    setPending(null)
    const text = t('backupPanel.daNhapTheMoi', { added: m.added, updated: m.updated, v: k.changed ? t('backupPanel.extraKana', { n: k.changed }) : '', v2: nb && nb.addedItems + nb.addedBooks ? t('backupPanel.extraBooks', { books: nb.addedBooks, items: nb.addedItems }) : '', v3: gc.added ? t('backupPanel.extraGrammar', { n: gc.added }) : '' })
    // Ngôn ngữ trong file khác ngôn ngữ đang dùng: đổi theo file (cả cây render lại) rồi báo bằng toast.
    const lang = pending.backup.locale
    if (lang && lang !== getLocale()) void setLocale(lang).then(() => showToast(text))
    else setNotice({ tone: 'ok', text })
  }

  return (
    <div>
      <p className="text-sm text-muted">{t('backupPanel.tienDoLuuRieng')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportFile}
          disabled={total + kanaTotal === 0}
          className="min-h-11 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40"
        >{t('backupPanel.xuatTienDo')}</button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-11 rounded-lg border-2 border-ai px-4 font-semibold text-ai hover:bg-ai-soft"
        >{t('backupPanel.nhapTienDo')}</button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="sr-only" tabIndex={-1} aria-label={t('backupPanel.chonFileTienDo')} />
      </div>

      {pending && (
        <div role="alertdialog" aria-label={t('backupPanel.xacNhanNhapTien')} className="mt-4 rounded-xl border border-ai bg-ai-soft/50 p-4">
          <p className="font-semibold break-all">{pending.name}</p>
          <p className="mt-1 text-sm">{t('backupPanel.theTrongFileThe', { length: Object.keys(pending.backup.cards).length, added: pending.added, updated: pending.updated, v: pending.kana > 0 && t('backupPanel.pendingKana', { n: pending.kana }), v2: pending.notes > 0 && t('backupPanel.pendingNotes', { n: pending.notes }), v3: pending.skipped > 0 && t('backupPanel.pendingSkipped', { n: pending.skipped }) })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmImport}
              disabled={pending.added + pending.updated + pending.kana + pending.notes === 0}
              className="min-h-11 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40"
            >
              {pending.added + pending.updated + pending.kana + pending.notes === 0 ? t('backupPanel.khongCoGiMoi') : t('backupPanel.nhapVaGop')}
            </button>
            <button type="button" onClick={() => setPending(null)} className="min-h-11 rounded-lg border border-line bg-surface px-4">{t('common.huy')}</button>
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

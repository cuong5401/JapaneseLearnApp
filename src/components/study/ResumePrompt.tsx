import { Button } from '../Pressable'
import { t } from '../../i18n'

/**
 * Mở lại bài đang làm dở: "Tiếp tục từ câu 8/20?" với Tiếp tục / Làm lại.
 * Chiếm đúng vùng phiên học (trang bọc ngoài giữ min-height như cũ), không phải hộp thoại nổi.
 */
export function ResumePrompt({
  answered,
  total,
  unit = t('resumePrompt.cau'),
  onResume,
  onRestart,
}: {
  answered: number
  total: number
  /** "câu" (quiz) hoặc "thẻ" (flashcard) */
  unit?: string
  onResume: () => void
  onRestart: () => void
}) {
  const at = Math.min(answered + 1, total)
  return (
    <section
      aria-labelledby="resume-title"
      data-session-resume
      className="mx-auto max-w-[560px] rounded-2xl border border-line bg-surface p-6 text-center sm:p-8"
    >
      <p className="text-sm text-muted">{t('resumePrompt.banDangLamDo')}</p>
      <h2 id="resume-title" className="mt-1 text-xl font-bold">{t('resumePrompt.tiepTucTu', { unit, at, total })}</h2>
      <p className="mt-2 text-sm text-muted">{t('resumePrompt.daChamKetQua', { answered, unit })}</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button autoFocus onClick={onResume} className="min-h-12 rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90">{t('resumePrompt.tiepTuc')}</Button>
        <Button onClick={onRestart} className="min-h-12 rounded-lg border border-line font-medium hover:bg-sunken">{t('resumePrompt.lamLai')}</Button>
      </div>
    </section>
  )
}

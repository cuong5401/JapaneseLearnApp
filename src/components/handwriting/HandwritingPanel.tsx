import { useMemo, useState } from 'react'
import { useKanjiIndex } from '../../hooks/useData'
import { useKanjiCanvas } from '../../hooks/useKanjiCanvas'
import { strokesToPng } from '../../lib/handwriting/png'
import { DrawPad } from './DrawPad'

interface Props {
  /** Chạm một ứng viên: thêm chữ vào ô tìm kiếm (khung được xóa để vẽ chữ tiếp). */
  onPick: (ch: string) => void
  /** "Xem chữ này": mở chi tiết chữ Hán. */
  onView: (ch: string) => void
  onClose: () => void
  /** Có thì hiện "Nhờ AI đoán" (đã có key và model nhận ảnh): nhận ảnh PNG base64 của khung vẽ. */
  onAskAi?: (png: string) => void
}

const btn = 'min-h-11 rounded-lg border border-line px-3 text-sm font-medium hover:bg-sunken disabled:opacity-40 disabled:hover:bg-transparent'

/** Bảng vẽ chữ Hán: khung vẽ, 10 ứng viên cập nhật sau mỗi nét, Hoàn tác nét | Xóa | Đóng. */
export default function HandwritingPanel({ onPick, onView, onClose, onAskAi }: Props) {
  const index = useKanjiIndex()
  const byChar = useMemo(() => new Map(index.data?.map((k) => [k.kanji, k]) ?? []), [index.data])
  const prefer = useMemo(() => index.data?.map((k) => k.kanji), [index.data])
  const pad = useKanjiCanvas(prefer)
  const [picked, setPicked] = useState<string | null>(null)
  const viewTarget = pad.candidates[0] ?? picked

  const pick = (ch: string) => {
    onPick(ch)
    setPicked(ch)
    pad.clear()
  }

  return (
    <section aria-label="Vẽ chữ Hán để tìm" data-handwriting className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold whitespace-nowrap">Vẽ chữ Hán</h2>
          <p className="text-xs text-muted">Chọn ứng viên để thêm vào ô tìm, rồi vẽ chữ tiếp theo.</p>
        </div>
        <button type="button" onClick={onClose} className={`${btn} -mt-1 shrink-0`}>
          Đóng
        </button>
      </div>

      <div className="mx-auto w-full max-w-[min(100%,42dvh,300px)]">
        <DrawPad strokes={pad.strokes} onStroke={pad.addStroke} onSize={pad.setSize} />
      </div>

      <div className="min-h-[4.25rem]">
        {pad.status === 'error' ? (
          <p className="rounded-lg bg-beni-soft p-3 text-sm text-beni">
            Không tải được dữ liệu nhận dạng.{' '}
            <button type="button" onClick={pad.retry} className="font-semibold underline">
              Thử lại
            </button>
          </p>
        ) : pad.candidates.length === 0 ? (
          <p className="py-5 text-center text-sm text-muted" aria-live="polite">
            {pad.status === 'loading' ? 'Đang tải dữ liệu nhận dạng…' : pad.strokes.length ? 'Không nhận ra chữ, thử vẽ lại.' : 'Vẽ một chữ vào khung, ứng viên hiện ở đây.'}
          </p>
        ) : (
          <ul aria-label="Chữ ứng viên" className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-1">
            {pad.candidates.map((ch, i) => {
              const k = byChar.get(ch)
              return (
                <li key={ch} className="shrink-0">
                  <button
                    type="button"
                    data-candidate={ch}
                    onClick={() => pick(ch)}
                    aria-label={k ? `${ch} ${k.hanViet}` : `${ch} (chưa có trong danh sách)`}
                    className={`flex h-16 w-12 flex-col items-center justify-center rounded-lg border hover:border-ai ${i === 0 ? 'border-ai bg-ai-soft' : 'border-line bg-surface'}`}
                  >
                    <span lang="ja" className={`font-jp text-2xl leading-none ${k ? 'font-bold text-ink' : 'text-muted'}`}>
                      {ch}
                    </span>
                    <span className="mt-1 h-3 max-w-full truncate px-0.5 text-[10px] leading-3 font-semibold text-ai">{k?.hanViet}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={pad.undo} disabled={!pad.strokes.length} className={btn}>
          Hoàn tác nét
        </button>
        <button type="button" onClick={pad.clear} disabled={!pad.strokes.length} className={btn}>
          Xóa
        </button>
        <button type="button" onClick={() => viewTarget && onView(viewTarget)} disabled={!viewTarget} className={`${btn} border-ai text-ai`}>
          Xem chữ {viewTarget ? <span lang="ja" className="font-jp">{viewTarget}</span> : 'này'}
        </button>
        {onAskAi && pad.strokes.length > 0 && (
          <button type="button" onClick={() => onAskAi(strokesToPng(pad.strokes, pad.getSize()))} className={btn} data-ask-ai-draw>
            Nhờ AI đoán
          </button>
        )}
      </div>
      {onAskAi && pad.strokes.length > 0 && pad.candidates.length > 0 && <p className="-mt-1 text-xs text-muted">Không thấy chữ đúng? Bấm "Nhờ AI đoán" để gửi ảnh khung vẽ cho AI.</p>}
    </section>
  )
}

import { speechText } from '../../lib/speech'
import type { VocabItem } from '../../types'
import { SpeakButton } from '../SpeakButton'
import { WordHead, WordMeta } from '../VocabBits'

/** Hai mặt của thẻ từ vựng (mặt trước: chữ; mặt sau: cách đọc, nghĩa, ví dụ). */
export function CardFaces({ item, flipped }: { item: VocabItem; flipped: boolean }) {
  return (
    <div className="flip h-full">
      <div className={`flip-inner grid h-full ${flipped ? 'is-flipped' : ''}`}>
        <div className="@container flip-face col-start-1 row-start-1 flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6">
          <WordHead item={item} showHanViet={false} className="text-[clamp(2rem,13cqw,3.75rem)]" />
          <p className="mt-8 text-sm text-muted">Chạm để lật thẻ</p>
        </div>
        <div className="flip-face flip-back col-start-1 row-start-1 flex flex-col overflow-y-auto overscroll-contain rounded-2xl border border-ai bg-surface p-6">
          <div className="flex items-start justify-between gap-4 pr-9">
            <WordHead item={item} className="text-3xl" align="left" />
            <SpeakButton text={speechText(item)} />
          </div>
          <p className="mt-4 text-2xl font-semibold">{item.meaning}</p>
          <div className="mt-3">
            <WordMeta item={item} compact />
          </div>
          {item.example && (
            <div className="mt-auto border-t border-line pt-4">
              <div className="flex items-start gap-3">
                <p lang="ja" className="min-w-0 flex-1 font-jp text-lg leading-relaxed">
                  {item.example.ja}
                </p>
                <SpeakButton text={item.example.ja} label="Nghe câu ví dụ" size="sm" />
              </div>
              <p className="mt-1 text-muted">{item.example.vi}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

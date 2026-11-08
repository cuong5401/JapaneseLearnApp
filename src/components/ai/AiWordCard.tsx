import { useMemo } from 'react'
import { useSearchDocs } from '../../hooks/useSearchDocs'
import { aiWordId, aiWords } from '../../lib/aiWords'
import type { AiWord } from '../../lib/ai/parse'
import { normalizeKana } from '../../lib/search'
import { SpeakButton } from '../SpeakButton'
import { BookmarkButton } from '../notebook/BookmarkButton'

/**
 * Thẻ từ AI gợi ý: nghe và lưu vào sổ tay. Từ đã có trong dữ liệu Kotonoha dùng id gốc;
 * từ chưa có được lưu vào kho "Từ AI gợi ý" (aw-…) ngay trước khi mở bảng lưu sổ tay.
 */
export function AiWordCard({ w }: { w: AiWord }) {
  const { docs } = useSearchDocs()
  const localId = useMemo(() => {
    const reading = normalizeKana(w.reading)
    return docs.find((d) => d.kind === 'word' && d.title === w.word && (!reading || normalizeKana(d.reading ?? '') === reading))?.id
  }, [docs, w.word, w.reading])
  const ref = localId ?? aiWordId(w.word, w.reading)
  const ensureSaved = () => {
    if (!localId) aiWords.save(w)
  }

  return (
    <li data-ai-word={w.word} className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span lang="ja" className="font-jp text-lg font-semibold">
            {w.word}
          </span>
          {w.reading && w.reading !== w.word && (
            <span lang="ja" className="font-jp text-sm text-muted">
              {w.reading}
            </span>
          )}
          {w.hanViet && <span className="text-xs font-semibold tracking-wide text-ai">{w.hanViet}</span>}
        </p>
        <p className="mt-0.5 text-sm">{w.meaning}</p>
        {localId && <p className="mt-1 text-xs text-matsu">Có trong dữ liệu Kotonoha</p>}
      </div>
      <SpeakButton text={w.reading || w.word} size="sm" label={`Nghe ${w.word}`} />
      {/* Lưu từ vào kho trước khi BookmarkButton xử lý (bắt ở pha capture). */}
      <span onPointerDownCapture={ensureSaved} onKeyDownCapture={ensureSaved} onContextMenuCapture={ensureSaved}>
        <BookmarkButton itemRef={ref} label={`từ ${w.word}`} size="sm" />
      </span>
    </li>
  )
}

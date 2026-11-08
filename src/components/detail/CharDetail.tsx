import { useMemo } from 'react'
import { TERM_BY_ID, VOCAB_DECK_INFO } from '../../data'
import { useFiles } from '../../hooks/useData'
import { charRef } from '../../lib/chars'
import type { Frame } from '../../lib/detailStack'
import { VOCAB_DECKS, type VocabItem } from '../../types'
import { GridCell } from '../GridCell'
import { LoadError, Skeleton } from '../LoadState'
import { BookmarkButton } from '../notebook/BookmarkButton'

const PATHS = VOCAB_DECKS.map((k) => VOCAB_DECK_INFO[k].path)
const LIMIT = 50

/**
 * Chi tiết tối giản cho chữ Hán không có trong kanji.json (ví dụ chọn từ bảng vẽ tay):
 * các từ chứa chữ, tìm trong mọi bộ từ và thuật ngữ, và nút lưu vào sổ tay (ref `ch-<hex>`).
 */
export function CharDetail({ ch, onPush }: { ch: string; onPush: (f: Frame) => void }) {
  const files = useFiles(PATHS)
  const loaded = files.data.filter(Boolean).length
  const words = useMemo(() => {
    const out: VocabItem[] = []
    const seen = new Set<string>()
    const add = (w: VocabItem) => {
      if (w.word.includes(ch) && !seen.has(w.word)) {
        seen.add(w.word)
        out.push(w)
      }
    }
    for (const d of files.data) if (Array.isArray(d)) (d as VocabItem[]).forEach(add)
    for (const t of TERM_BY_ID.values()) add(t.item)
    return out
    // files.data là mảng mới mỗi lần render; số file đã tải đủ để biết khi nào lọc lại.
  }, [ch, loaded]) // eslint-disable-line react-hooks/exhaustive-deps
  const pending = loaded < PATHS.length

  return (
    <article aria-label={`Chi tiết chữ ${ch}`} data-detail-char={ch}>
      <div className="flex gap-5">
        <GridCell className="size-28 sm:size-32">{ch}</GridCell>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold">Chữ ngoài danh sách</p>
            <BookmarkButton itemRef={charRef(ch)} label={`chữ ${ch}`} className="-mt-1.5 -mr-2" />
          </div>
          <p className="mt-1 text-sm text-muted">Chữ này chưa có trong danh sách chữ Hán của Kotonoha nên chưa có âm Hán Việt và chưa vào lịch ôn.</p>
          {!pending && <p className="mt-2 text-sm text-muted">{words.length ? `${words.length} từ chứa chữ này` : 'Không có từ nào chứa chữ này'}</p>}
        </div>
      </div>
      <h3 className="mt-6 mb-1 text-sm font-semibold text-muted">
        Từ chứa chữ {ch}
        {words.length > LIMIT && ` (${LIMIT}/${words.length} từ đầu tiên)`}
      </h3>
      {files.status === 'error' && <LoadError error={files.error} onRetry={files.retry} />}
      {pending && files.status !== 'error' ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : words.length === 0 ? (
        <p className="py-3 text-sm text-muted">Trong các bộ từ hiện có không có từ nào chứa chữ {ch}.</p>
      ) : (
        <ul className="divide-y divide-line">
          {words.slice(0, LIMIT).map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onPush({ t: 'w', id: w.id })}
                className="-mx-2 flex w-[calc(100%+1rem)] items-baseline gap-x-3 rounded-lg px-2 py-2.5 text-left hover:bg-sunken"
              >
                <span lang="ja" className="shrink-0 font-jp text-lg font-medium">
                  {w.word}
                </span>
                <span lang="ja" className="min-w-0 truncate font-jp text-sm text-muted">
                  {w.reading !== w.word && w.reading}
                </span>
                <span className="ml-auto max-w-[55%] text-right text-sm">{w.meaning}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

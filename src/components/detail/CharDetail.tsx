import { useMemo } from 'react'
import { TERM_BY_ID, VOCAB_DECK_INFO } from '../../data'
import { useFiles } from '../../hooks/useData'
import { charRef } from '../../lib/chars'
import type { Frame } from '../../lib/detailStack'
import { VOCAB_DECKS, type VocabItem } from '../../types'
import { GridCell } from '../GridCell'
import { LoadError, Skeleton, SkeletonRows } from '../LoadState'
import { AskAiLink } from '../ai/AskAiLink'
import { kanjiQuestion } from '../../lib/ai/questions'
import { BookmarkButton } from '../notebook/BookmarkButton'
import { StrokeSection } from '../strokes/StrokeOrder'
import { KanjiReadings } from './KanjiReadings'
import { t as tr } from '../../i18n'

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
    <article aria-label={tr('charDetail.chiTietChu', { ch })} data-detail-char={ch}>
      <div className="flex gap-5">
        <GridCell className="size-28 sm:size-32">{ch}</GridCell>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold">{tr('charDetail.chuNgoaiDanhSach')}</p>
            <BookmarkButton itemRef={charRef(ch)} label={tr('charDetail.chu', { ch })} className="-mt-1.5 -mr-2" />
          </div>
          <p className="mt-1 text-sm text-muted">{tr('charDetail.chuNayChuaCo')}</p>
          {pending ? (
            <Skeleton className="mt-2 h-5 w-32 rounded-md" />
          ) : (
            <p className="mt-2 text-sm text-muted">{words.length ? tr('charDetail.tuChuaChuNay', { length: words.length }) : tr('charDetail.khongCoTuNao')}</p>
          )}
        </div>
      </div>
      <KanjiReadings ch={ch} />
      <StrokeSection key={ch} char={ch} />
      <AskAiLink question={kanjiQuestion(ch)} className="mt-4 w-full" />
      <h3 className="mt-6 mb-1 text-sm font-semibold text-muted">{tr('charDetail.tuChuaChu', { ch, v: words.length > LIMIT && tr('common.firstWords', { n: LIMIT, total: words.length }) })}</h3>
      {files.status === 'error' && <LoadError error={files.error} onRetry={files.retry} />}
      {pending && files.status !== 'error' ? (
        <SkeletonRows count={5} className="min-h-24" />
      ) : words.length === 0 ? (
        <p className="py-3 text-sm text-muted">{tr('charDetail.trongCacBoTu', { ch })}</p>
      ) : (
        <ul className="min-h-24 divide-y divide-line">
          {words.slice(0, LIMIT).map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onPush({ t: 'w', id: w.id })}
                className="-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-baseline gap-x-3 rounded-lg px-2 py-2.5 text-left hover:bg-sunken"
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

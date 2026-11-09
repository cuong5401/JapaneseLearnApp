import { radicalOfKanji } from '../../data/radicalKanji'
import { useEntries, useRadicals } from '../../hooks/useData'
import { useCards } from '../../hooks/useProgress'
import type { Frame } from '../../lib/detailStack'
import { levelNote } from '../../lib/kanjiText'
import { progress } from '../../lib/progress'
import type { KanjiEntry } from '../../types'
import { GridCell } from '../GridCell'
import { LoadError, Skeleton } from '../LoadState'
import { Button, ButtonLink } from '../Pressable'
import { AskAiLink } from '../ai/AskAiLink'
import { kanjiQuestion } from '../../lib/ai/questions'
import { BookmarkButton } from '../notebook/BookmarkButton'

type Push = (f: Frame) => void

/** Các từ chứa chữ: bấm thì mở chi tiết từ ngay trong ngăn xếp (không chuyển trang). */
function KanjiWords({ item, onPush }: { item: KanjiEntry; onPush: Push }) {
  const { status, entries, error, retry } = useEntries(item.words)
  if (status === 'error') return <LoadError error={error} onRetry={retry} />
  if (status !== 'ready')
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    )
  const words = item.words.flatMap((id) => {
    const e = entries.get(id)
    return e?.kind === 'word' ? [e.item] : []
  })
  return (
    <ul className="divide-y divide-line">
      {words.map((w) => (
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
  )
}

function RadicalChip({ ch, onPush }: { ch: string; onPush: Push }) {
  const no = radicalOfKanji(ch)
  const radicals = useRadicals()
  const r = no !== null ? radicals.data?.find((x) => x.no === no) : undefined
  if (no === null) return null
  return (
    <button
      type="button"
      onClick={() => onPush({ t: 'r', no })}
      className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-sm hover:border-ai"
    >
      <span className="text-muted">Bộ</span>
      {r ? (
        <>
          <span lang="ja" className="font-jp text-base">
            {r.radical}
          </span>
          <span className="font-medium capitalize">{r.name}</span>
        </>
      ) : (
        <span className="font-medium">số {no}</span>
      )}
    </button>
  )
}

/** Chi tiết một chữ Hán (panel / bottom sheet). */
export function KanjiDetail({ item, onPush }: { item: KanjiEntry; onPush: Push }) {
  const learned = Boolean(useCards()[item.id])
  return (
    <article aria-label={`Chi tiết chữ ${item.kanji}`} data-detail-kanji={item.kanji}>
      <div className="flex gap-5">
        <GridCell className="size-28 sm:size-32">{item.kanji}</GridCell>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-2xl font-bold tracking-wide">{item.hanViet}</p>
            <BookmarkButton itemRef={item.id} label={`chữ ${item.kanji}`} className="-mt-1.5 -mr-2" />
          </div>
          {item.hanVietAlt?.length ? <p className="mt-0.5 text-sm text-muted">Âm khác: {item.hanVietAlt.join(', ')}</p> : null}
          <p className="mt-2 text-sm text-muted">{levelNote(item)}</p>
          <p className="text-sm text-muted">{item.wordCount} từ chứa chữ này</p>
          <RadicalChip ch={item.kanji} onPush={onPush} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <ButtonLink
          to={`/kanji/${item.id}/learn`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ai px-3 text-center font-semibold text-on-ai hover:opacity-90"
        >
          Học các từ này
        </ButtonLink>
        <Button
          onClick={() => (learned ? progress.forget(item.id) : progress.markLearned(item.id))}
          className={`min-h-11 rounded-lg px-3 font-semibold ${learned ? 'border border-matsu bg-matsu-soft text-matsu' : 'border border-line hover:bg-sunken'}`}
        >
          {learned ? 'Đã học chữ này' : 'Đánh dấu đã học'}
        </Button>
        <AskAiLink question={kanjiQuestion(item.kanji, item.hanViet)} className="col-span-2" />
      </div>
      <h3 className="mt-6 mb-1 text-sm font-semibold text-muted">
        Từ chứa chữ {item.kanji}
        {item.wordCount > item.words.length && ` (${item.words.length}/${item.wordCount} từ đầu tiên)`}
      </h3>
      <KanjiWords item={item} onPush={onPush} />
    </article>
  )
}

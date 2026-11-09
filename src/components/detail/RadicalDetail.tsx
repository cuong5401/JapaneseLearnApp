import { kanjiOfRadical } from '../../data/radicalKanji'
import { useKanjiIndex } from '../../hooks/useData'
import { useCards } from '../../hooks/useProgress'
import type { Frame } from '../../lib/detailStack'
import { progress } from '../../lib/progress'
import type { RadicalItem } from '../../types'
import { GridCell } from '../GridCell'
import { Skeleton } from '../LoadState'
import { Button } from '../Pressable'
import { BookmarkButton } from '../notebook/BookmarkButton'

/** Chi tiết bộ thủ: tên, nghĩa và các chữ Hán (trong dữ liệu của bạn) thuộc bộ này. */
export function RadicalDetail({ item, onPush }: { item: RadicalItem; onPush: (f: Frame) => void }) {
  const learned = Boolean(useCards()[item.id])
  const index = useKanjiIndex()
  const chars = kanjiOfRadical(item.no)
  const byChar = new Map((index.data ?? []).map((k) => [k.kanji, k]))
  return (
    <article aria-label={`Chi tiết bộ ${item.radical}`} data-detail-radical={item.no}>
      <div className="flex gap-5">
        <GridCell className="size-28 sm:size-32">{item.radical}</GridCell>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted">
                Bộ số {item.no} · {item.strokes} nét
              </p>
              <p className="text-2xl font-bold capitalize">{item.name}</p>
            </div>
            <BookmarkButton itemRef={item.id} label={`bộ ${item.name}`} className="-mr-2" />
          </div>
          <p className="mt-1 text-muted first-letter:uppercase">{item.meaning}</p>
          {item.variants?.length ? (
            <p className="mt-1 text-sm text-muted">
              Dạng khác:{' '}
              <span lang="ja" className="font-jp text-base text-ink">
                {item.variants.join('、')}
              </span>
            </p>
          ) : null}
        </div>
      </div>
      <Button
        onClick={() => (learned ? progress.forget(item.id) : progress.markLearned(item.id))}
        className={`mt-5 min-h-11 w-full rounded-lg px-3 font-semibold ${learned ? 'border border-matsu bg-matsu-soft text-matsu' : 'border border-line hover:bg-sunken'}`}
      >
        {learned ? 'Đã học bộ này' : 'Đánh dấu đã học'}
      </Button>
      <h3 className="mt-6 mb-2 text-sm font-semibold text-muted">
        {chars.length} chữ Hán thuộc bộ này
        {chars.length === 0 && <span className="font-normal"> (chưa có trong dữ liệu)</span>}
      </h3>
      {chars.length > 0 && (
        <ul className="grid min-h-48 grid-cols-[repeat(auto-fill,minmax(72px,1fr))] content-start gap-2" data-radical-chars>
          {chars.map((ch) => (
            <li key={ch}>
              <button
                type="button"
                onClick={() => onPush({ t: 'k', ch })}
                aria-label={`Chữ ${ch}${byChar.get(ch) ? `, ${byChar.get(ch)!.hanViet}` : ''}`}
                className="flex w-full flex-col items-center gap-1 rounded-lg border border-line bg-surface p-1.5 hover:border-ai"
              >
                <GridCell className="w-full max-w-14">{ch}</GridCell>
                {/* Nhãn Hán Việt chờ chỉ mục kanji: giữ đúng chiều cao dòng để ô không cao lên khi dữ liệu về. */}
                {index.data ? (
                  <span className="block h-4 max-w-full truncate text-[11px] leading-4 font-semibold">{byChar.get(ch)?.hanViet ?? ''}</span>
                ) : (
                  <Skeleton className="h-4 w-10 rounded" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">Bộ chính của chữ theo Unicode Unihan.</p>
    </article>
  )
}

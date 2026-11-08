import { AnimatePresence, motion } from 'motion/react'
import { useEntries, useKanjiIndex, useRadicals } from '../../hooks/useData'
import { frameKey, type Frame } from '../../lib/detailStack'
import { LoadError, PageSkeleton } from '../LoadState'
import { KanjiDetail } from './KanjiDetail'
import { RadicalDetail } from './RadicalDetail'
import { WordDetail } from './WordDetail'

type Push = (f: Frame) => void

function Missing({ what }: { what: string }) {
  return <p className="rounded-xl border border-line bg-surface p-5 text-center text-muted">Không tìm thấy {what} trong dữ liệu.</p>
}

function KanjiFrame({ ch, onPush }: { ch: string; onPush: Push }) {
  const index = useKanjiIndex()
  if (index.status === 'error') return <LoadError error={index.error} onRetry={index.retry} />
  if (!index.data) return <PageSkeleton rows={4} />
  const item = index.data.find((k) => k.kanji === ch)
  return item ? <KanjiDetail item={item} onPush={onPush} /> : <Missing what={`chữ ${ch}`} />
}

function WordFrame({ id, onPush }: { id: string; onPush: Push }) {
  const { status, entries, error, retry } = useEntries([id])
  if (status === 'error') return <LoadError error={error} onRetry={retry} />
  if (status !== 'ready') return <PageSkeleton rows={4} />
  const e = entries.get(id)
  return e?.kind === 'word' ? <WordDetail item={e.item} onPush={onPush} inPanel /> : <Missing what="từ này" />
}

function RadicalFrame({ no, onPush }: { no: number; onPush: Push }) {
  const radicals = useRadicals()
  if (radicals.status === 'error') return <LoadError error={radicals.error} onRetry={radicals.retry} />
  if (!radicals.data) return <PageSkeleton rows={3} />
  const item = radicals.data.find((r) => r.no === no)
  return item ? <RadicalDetail item={item} onPush={onPush} /> : <Missing what={`bộ số ${no}`} />
}

export function FrameContent({ frame, onPush }: { frame: Frame; onPush: Push }) {
  if (frame.t === 'k') return <KanjiFrame ch={frame.ch} onPush={onPush} />
  if (frame.t === 'r') return <RadicalFrame no={frame.no} onPush={onPush} />
  return <WordFrame id={frame.id} onPush={onPush} />
}

/** Nhãn ngắn của khung (dùng cho nút "← 日"). */
function FrameLabel({ frame }: { frame: Frame }) {
  const words = useEntries(frame.t === 'w' ? [frame.id] : [])
  const radicals = useRadicals()
  if (frame.t === 'k') return <span lang="ja" className="font-jp">{frame.ch}</span>
  if (frame.t === 'r') {
    const r = radicals.data?.find((x) => x.no === frame.no)
    return r ? <span lang="ja" className="font-jp">{r.radical}</span> : <>Bộ {frame.no}</>
  }
  const e = words.entries.get(frame.id)
  return e?.kind === 'word' ? <span lang="ja" className="font-jp">{e.item.word}</span> : <>Quay lại</>
}

/**
 * Khung trên cùng của ngăn xếp, kèm nút "← <khung trước>" khi đã đi sâu hơn một bước.
 * Dùng trong panel cạnh lưới (desktop), bottom sheet (điện thoại) và drawer toàn cục.
 */
export function DetailStackView({ frames, onPush, onBack }: { frames: Frame[]; onPush: Push; onBack: () => void }) {
  const top = frames[frames.length - 1]
  const prev = frames[frames.length - 2]
  if (!top) return null
  return (
    <div>
      {prev && (
        <button
          type="button"
          onClick={onBack}
          data-stack-back
          className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-ai hover:bg-ai-soft"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="sr-only">Quay lại </span>
          <FrameLabel frame={prev} />
        </button>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={frameKey(top) + frames.length}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.15 }}
        >
          <FrameContent frame={top} onPush={onPush} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

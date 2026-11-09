import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react'
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { AnimatedNumber } from '../AnimatedNumber'
import { Celebration } from '../Celebration'
import { Button, ButtonLink } from '../Pressable'
import { SessionPanel, StudyLayout } from '../StudyLayout'
import { vocabFaces, type FacesRenderer } from './faces'
import { BookmarkButton } from '../notebook/BookmarkButton'
import { shuffle } from '../../lib/answer'
import { isInteractiveTarget } from '../../lib/keyboard'
import { progress } from '../../lib/progress'
import { readJSON, writeJSON } from '../../lib/storage'
import type { SrsCard, VocabItem } from '../../types'
import { useDockQuiet } from '../../lib/ai/dock'

export interface SessionLink {
  to: string
  label: string
}

type Verdict = 'known' | 'unknown'
type Dir = -1 | 1
interface CardHandle {
  flyOut: (dir: Dir) => void
}

const SWIPE_DISTANCE = 100
const SWIPE_VELOCITY = 500
const STACK_SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const

const vocabLabel = (item: VocabItem) => item.word

/**
 * Nơi ghi kết quả chấm thẻ. Mặc định là SRS (`progress`); luyện kana dùng mức thuộc kana.
 * `grade` trả về bản trước khi chấm để `restore` hoàn tác được (phím Z).
 */
export interface FlashcardGrader {
  grade: (id: string, known: boolean) => unknown
  restore: (id: string, prev: unknown) => void
}

const srsGrader: FlashcardGrader = {
  grade: (id, known) => {
    const prev = progress.getSnapshot()[id]
    progress.grade(id, known ? 4 : 1)
    return prev
  },
  restore: (id, prev) => progress.restore(id, prev as SrsCard | undefined),
}

/** Bấm nút chấm bằng chuột không lấy focus: nếu không, Space sẽ bấm lại nút (chấm thêm thẻ) thay vì lật thẻ. */
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

interface StackCardProps<T> {
  item: T
  faces: FacesRenderer<T>
  label: (item: T) => string
  depth: number
  flipped: boolean
  onFlip: () => void
  onCommit: (dir: Dir) => void
  bookmark: boolean
  ref?: Ref<CardHandle>
}

/**
 * Một thẻ trong ngăn xếp. Thẻ trên cùng (depth 0) kéo được; các thẻ sau nhỏ dần và lệch xuống.
 * Cùng một component cho mọi vị trí nên khi thẻ trên bay đi, thẻ kế tiếp trồi lên mượt.
 */
function StackCard<T extends { id: string }>({ item, faces, label, depth, flipped, onFlip, onCommit, bookmark, ref }: StackCardProps<T>) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-12, 12])
  const unknownOpacity = useTransform(x, [-140, -16], [1, 0])
  const knownOpacity = useTransform(x, [16, 140], [0, 1])
  const dragged = useRef(false)
  const leaving = useRef(false)
  const top = depth === 0

  const flyOut = useCallback(
    (dir: Dir) => {
      if (leaving.current) return
      leaving.current = true
      if (reduce) return onCommit(dir)
      animate(x, dir * (window.innerWidth + 320), { duration: 0.32, ease: [0.4, 0, 1, 1] }).then(() => onCommit(dir))
    },
    [onCommit, reduce, x],
  )

  useImperativeHandle(ref, () => ({ flyOut }), [flyOut])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    if (Math.abs(offset.x) > SWIPE_DISTANCE || Math.abs(velocity.x) > SWIPE_VELOCITY) {
      const sign = Math.abs(offset.x) > SWIPE_DISTANCE ? offset.x : velocity.x
      flyOut(sign > 0 ? 1 : -1)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
    }
  }

  return (
    <motion.div
      className={`absolute inset-x-0 top-0 bottom-4 origin-bottom ${top ? 'cursor-grab touch-pan-y active:cursor-grabbing' : 'pointer-events-none'}`}
      style={{ x, rotate, zIndex: 10 - depth }}
      initial={{ scale: 0.88, y: 24, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.04, y: depth * 8, opacity: depth > 2 ? 0 : 1 }}
      transition={STACK_SPRING}
      drag={top ? 'x' : false}
      dragMomentum={false}
      onPointerDown={() => (dragged.current = false)}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (dragged.current) return
        if (top) onFlip()
      }}
      role={top ? 'button' : undefined}
      tabIndex={top ? 0 : -1}
      aria-hidden={!top}
      aria-label={top ? (flipped ? `${label(item)}, mặt sau. Chạm để lật lại` : `${label(item)}. Chạm để lật thẻ`) : undefined}
    >
      {top ? (
        <>
          {faces(item, flipped)}
          {/* Nút đánh dấu ở góc thẻ: không lật thẻ, không kéo thẻ. */}
          {bookmark && (
            <div className="absolute top-2 right-2 z-10">
              <BookmarkButton itemRef={item.id} label={label(item)} size="sm" />
            </div>
          )}
        </>
      ) : (
        <div className="h-full rounded-2xl border border-line bg-surface" />
      )}
      {top && (
        <>
          {/* Lớp màu phủ cả thẻ, con dấu nằm ở góc để không đè lên chữ. */}
          <motion.div
            aria-hidden
            style={{ opacity: unknownOpacity }}
            className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-beni bg-beni-soft/75"
          >
            <span className="absolute top-6 right-5 rotate-[10deg] rounded-md border-[3px] border-beni bg-surface/70 px-3 py-1 text-xl font-bold text-beni">
              Chưa nhớ
            </span>
          </motion.div>
          <motion.div
            aria-hidden
            style={{ opacity: knownOpacity }}
            className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-matsu bg-matsu-soft/75"
          >
            <span className="absolute top-6 left-5 -rotate-[10deg] rounded-md border-[3px] border-matsu bg-surface/70 px-3 py-1 text-xl font-bold text-matsu">
              Đã nhớ
            </span>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}

function Summary({
  back,
  next,
  known,
  unknown,
  onRetryUnknown,
  onRestart,
  onUndo,
}: {
  back: SessionLink
  next?: SessionLink
  known: number
  unknown: number
  onRetryUnknown: () => void
  onRestart: () => void
  onUndo: () => void
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
      {unknown === 0 && known > 0 && <Celebration />}
      <h2 className="text-xl font-bold">Xong một lượt</h2>
      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="flex flex-col-reverse rounded-xl bg-matsu-soft p-4">
          <dt className="text-sm text-matsu">Đã nhớ</dt>
          <dd className="text-4xl font-bold text-matsu">
            <AnimatedNumber value={known} />
          </dd>
        </div>
        <div className="flex flex-col-reverse rounded-xl bg-beni-soft p-4">
          <dt className="text-sm text-beni">Chưa nhớ</dt>
          <dd className="text-4xl font-bold text-beni">
            <AnimatedNumber value={unknown} />
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted">Mọi thẻ đã vào lịch ôn. Thẻ chưa nhớ sẽ quay lại sớm hơn.</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button
          onClick={onRetryUnknown}
          disabled={unknown === 0}
          className="min-h-12 rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90 disabled:opacity-40"
        >
          Học lại thẻ chưa nhớ
        </Button>
        <Button onClick={onRestart} className="min-h-12 rounded-lg border border-line font-medium hover:bg-sunken">
          Học lại cả bộ
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
        <button type="button" onClick={onUndo} className="min-h-10 text-muted hover:text-ink">
          Hoàn tác thẻ cuối
        </button>
        <ButtonLink to={back.to} className="inline-flex min-h-10 items-center font-medium text-ai hover:underline">
          {back.label}
        </ButtonLink>
      </div>
      {next && (
        <ButtonLink
          to={next.to}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-ai font-semibold text-ai hover:bg-ai-soft"
        >
          {next.label}
        </ButtonLink>
      )}
    </div>
  )
}

const SHORTCUTS = [
  { keys: ['Space'], label: 'Lật thẻ' },
  { keys: ['←'], label: 'Chưa nhớ' },
  { keys: ['→'], label: 'Đã nhớ' },
  { keys: ['Z'], label: 'Hoàn tác' },
]

/**
 * Phiên flashcard vuốt để chấm cho một danh sách từ bất kỳ (bài học, thuật ngữ, từ của một chữ Hán…).
 * Trang bọc ngoài lo tiêu đề; `key` nên đổi khi danh sách đổi để bắt đầu phiên mới.
 */
export function FlashcardSession<T extends { id: string } = VocabItem>({
  items: source,
  back,
  next,
  faces = vocabFaces as unknown as FacesRenderer<T>,
  label = vocabLabel as unknown as (item: T) => string,
  grader = srsGrader,
  bookmark = true,
}: {
  items: T[]
  back: SessionLink
  next?: SessionLink
  /** Mặt thẻ (mặc định: từ vựng) */
  faces?: FacesRenderer<T>
  /** Tên ngắn của mục cho trình đọc màn hình */
  label?: (item: T) => string
  /** Nơi ghi kết quả (mặc định: lịch ôn SRS) */
  grader?: FlashcardGrader
  /** Nút lưu sổ tay ở góc thẻ (kana không có trong sổ tay) */
  bookmark?: boolean
}) {
  // Đang vuốt thẻ: tab "Hỏi AI" thu nhỏ, mờ đi, không đè vùng vuốt.
  useDockQuiet()
  const [queue, setQueue] = useState<T[]>(source)
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Record<string, Verdict>>({})
  const [history, setHistory] = useState<{ id: string; prev: unknown }[]>([])
  const [hintSeen, setHintSeen] = useState(() => readJSON('swipe-hint-seen', false))
  const topRef = useRef<CardHandle>(null)

  const done = pos >= queue.length
  const known = Object.values(results).filter((r) => r === 'known').length
  const unknown = Object.values(results).filter((r) => r === 'unknown').length

  const commit = useCallback(
    (dir: Dir) => {
      const item = queue[pos]
      if (!item) return
      const prev = grader.grade(item.id, dir > 0)
      setHistory((h) => [...h, { id: item.id, prev }])
      setResults((r) => ({ ...r, [item.id]: dir > 0 ? 'known' : 'unknown' }))
      setFlipped(false)
      setPos((p) => p + 1)
      if (!hintSeen) {
        setHintSeen(true)
        writeJSON('swipe-hint-seen', true)
      }
    },
    [queue, pos, hintSeen, grader],
  )

  const undo = useCallback(() => {
    const last = history[history.length - 1]
    if (!last) return
    grader.restore(last.id, last.prev)
    setHistory((h) => h.slice(0, -1))
    setResults((r) => {
      const next = { ...r }
      delete next[last.id]
      return next
    })
    setFlipped(false)
    setPos((p) => Math.max(0, p - 1))
  }, [history, grader])

  const startSession = (items: T[]) => {
    setQueue(items)
    setPos(0)
    setResults({})
    setHistory([])
    setFlipped(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      const key = e.key.toLowerCase()
      if (key === 'z') return undo()
      if (done) return
      if (e.key === 'ArrowLeft') topRef.current?.flyOut(-1)
      else if (e.key === 'ArrowRight') topRef.current?.flyOut(1)
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, undo])

  const visible = queue.slice(pos, pos + 3)

  const aside = (
    <SessionPanel
      stats={[
        { label: 'Thẻ hiện tại', value: Math.min(pos + 1, queue.length), total: queue.length },
        { label: 'Đã nhớ', value: known, tone: 'good' },
        { label: 'Chưa nhớ', value: unknown, tone: 'bad' },
      ]}
      shortcuts={SHORTCUTS}
    />
  )

  return (
    <StudyLayout aside={aside}>
        {done ? (
          <Summary
            back={back}
            next={next}
            known={known}
            unknown={unknown}
            onRetryUnknown={() => startSession(queue.filter((w) => results[w.id] === 'unknown'))}
            onRestart={() => startSession(source)}
            onUndo={undo}
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted">
              <span className="tabular-nums lg:hidden">
                Thẻ {pos + 1}/{queue.length}
                <span className="ml-3 text-matsu">Nhớ {known}</span>
                <span className="ml-3 text-beni">Chưa nhớ {unknown}</span>
              </span>
              <button
                type="button"
                onClick={() => startSession(shuffle(source))}
                className="ml-auto min-h-9 rounded-lg px-2 text-sm text-muted hover:bg-sunken hover:text-ink"
              >
                Trộn thẻ
              </button>
            </div>

            <div className="relative h-[clamp(21rem,60vh,28rem)] select-none">
              {visible
                .map((item, depth) => (
                  <StackCard
                    key={item.id}
                    ref={depth === 0 ? topRef : undefined}
                    item={item}
                    faces={faces}
                    label={label}
                    depth={depth}
                    flipped={depth === 0 && flipped}
                    onFlip={() => setFlipped((f) => !f)}
                    onCommit={commit}
                    bookmark={bookmark}
                  />
                ))
                .reverse()}
            </div>

            <p className="mt-1 h-5 text-center text-xs text-muted">
              {!hintSeen && 'Vuốt trái nếu chưa nhớ, vuốt phải nếu đã nhớ'}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                onMouseDown={keepFocus}
                onClick={() => topRef.current?.flyOut(-1)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-beni bg-surface font-semibold text-beni hover:bg-beni-soft"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Chưa nhớ
              </Button>
              <Button
                onMouseDown={keepFocus}
                onClick={() => topRef.current?.flyOut(1)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90"
              >
                Đã nhớ
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Button>
            </div>
            <div className="mt-2 flex h-10 justify-center">
              {history.length > 0 && (
                <button type="button" onClick={undo} className="min-h-10 px-3 text-sm text-muted hover:text-ink">
                  Hoàn tác thẻ vừa chấm
                </button>
              )}
            </div>
          </>
        )}
    </StudyLayout>
  )
}

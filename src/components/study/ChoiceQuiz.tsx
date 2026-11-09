import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { AnimatedNumber } from '../AnimatedNumber'
import { Celebration } from '../Celebration'
import { Button } from '../Pressable'
import { SessionPanel, StudyLayout } from '../StudyLayout'
import { shuffle } from '../../lib/answer'
import { isInteractiveTarget } from '../../lib/keyboard'
import { progress } from '../../lib/progress'
import { quizGrade } from '../../lib/srs'

const SHAKE = { x: [0, -8, 8, -8, 8, -8, 8, 0] }

export interface ChoiceQuizConfig<T> {
  /** Tiêu đề khung thông tin phiên ("Quiz chữ Hán") */
  title: string
  /** Câu hỏi ngắn phía trên ("Âm Hán Việt của chữ này là gì?") */
  prompt: (item: T) => string
  /** Phần hiển thị câu hỏi (chữ trong GridCell, từ…) */
  question: (item: T) => ReactNode
  /** Đáp án đúng */
  answer: (item: T) => string
  /** Các đáp án khác cũng đúng (âm phụ…): không dùng làm đáp án nhiễu */
  alsoRight?: (item: T) => string[]
  /** Chỉ lấy đáp án nhiễu từ mục cùng nhóm (cùng loại trong sổ tay) */
  group?: (item: T) => string
  /** Ghi chú hiện sau khi trả lời */
  note?: (item: T) => ReactNode
  /** Nhãn phím tắt cho 1–4 */
  shortcut?: string
  /** Đáp án hiển thị bằng chữ Nhật */
  answerLang?: 'ja'
}

interface Question<T> {
  item: T
  options: string[]
}

function buildChoiceQuestions<T extends { id: string }>(items: readonly T[], pool: readonly T[], cfg: ChoiceQuizConfig<T>, length = items.length): Question<T>[] {
  return shuffle(items)
    .slice(0, length)
    .map((item) => {
      const right = cfg.answer(item)
      const own = new Set([right, ...(cfg.alsoRight?.(item) ?? [])])
      const group = cfg.group?.(item)
      const options = new Set<string>()
      // Ưu tiên mục trong cùng danh sách học, sau đó tới toàn bộ nguồn.
      for (const source of [items, pool]) {
        for (const other of shuffle(source)) {
          if (options.size === 3) break
          if (group !== undefined && cfg.group?.(other) !== group) continue
          const a = cfg.answer(other)
          if (a && !own.has(a)) options.add(a)
        }
      }
      return { item, options: shuffle([right, ...options]) }
    })
}

/**
 * Quiz "nhìn X, chọn Y" 4 lựa chọn: phím 1–4, Enter sang câu, lắc khi sai; mỗi câu chấm SRS cho mục đó.
 * Dùng cho âm Hán Việt, tên bộ thủ và quiz sổ tay.
 */
export function ChoiceQuiz<T extends { id: string }>({ items, pool = items, length, config: cfg }: { items: T[]; pool?: T[]; length?: number; config: ChoiceQuizConfig<T> }) {
  const [questions, setQuestions] = useState(() => buildChoiceQuestions(items, pool, cfg, length))
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [right, setRight] = useState(0)
  // Gợi ý: bỏ bớt 2 đáp án sai; đúng sau khi xem gợi ý thì chấm Khó (Hard)
  const [removed, setRemoved] = useState<string[]>([])
  const [hintedCount, setHintedCount] = useState(0)
  const hinted = removed.length > 0

  const q = questions[index]
  const finished = index >= questions.length
  const answered = picked !== null

  const choose = (option: string) => {
    if (!q || answered) return
    const ok = option === cfg.answer(q.item)
    setPicked(option)
    if (ok) setRight((r) => r + 1)
    if (hinted) setHintedCount((c) => c + 1)
    progress.grade(q.item.id, quizGrade(ok, hinted))
  }
  const hint = () => {
    if (!q || answered || hinted) return
    const right = cfg.answer(q.item)
    setRemoved(q.options.filter((o) => o !== right).slice(0, Math.max(0, q.options.length - 2)))
  }
  const next = () => {
    setPicked(null)
    setRemoved([])
    setIndex((i) => i + 1)
  }

  // Phím 1–4 và Enter: dùng ref-less closure mới mỗi lần render qua effect phụ thuộc.
  useEffect(() => {
    if (finished || !q) return
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= q.options.length && !removed.includes(q.options[n - 1])) choose(q.options[n - 1])
      else if (!answered && e.key.toLowerCase() === 'h') hint()
      else if (answered && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (questions.length === 0 || questions.some((x) => x.options.length < 2))
    return <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">Chưa đủ mục khác nhau để làm quiz. Cần ít nhất 2 đáp án khác nhau.</p>

  if (finished) {
    const perfect = right === questions.length
    return (
      <div className="mx-auto max-w-[560px] rounded-2xl border border-line bg-surface p-6 text-center" data-quiz-result>
        {perfect && <Celebration />}
        <h2 className="text-lg font-semibold text-muted">Kết quả</h2>
        <p className="mt-1 text-6xl font-bold">
          <AnimatedNumber value={right} className={perfect ? 'text-matsu' : ''} />
          <span className="text-2xl text-muted">/{questions.length}</span>
        </p>
        <p className="mt-2 text-muted">
          Mục trả lời sai đã vào lịch ôn sớm hơn.
          {hintedCount > 0 && ` ${hintedCount} câu có dùng gợi ý (chấm "Khó").`}
        </p>
        <Button
          onClick={() => {
            setQuestions(buildChoiceQuestions(items, pool, cfg, length))
            setIndex(0)
            setRight(0)
            setHintedCount(0)
          }}
          className="mt-6 min-h-12 rounded-lg bg-ai px-6 font-semibold text-on-ai hover:opacity-90"
        >
          Làm lượt mới
        </Button>
      </div>
    )
  }

  const correct = cfg.answer(q.item)
  return (
    <StudyLayout
      aside={
        <SessionPanel
          title={cfg.title}
          stats={[
            { label: 'Câu hiện tại', value: index + 1, total: questions.length },
            { label: 'Đúng', value: right, tone: 'good' },
            { label: 'Sai', value: index + (answered ? 1 : 0) - right, tone: 'bad' },
          ]}
          shortcuts={[
            { keys: ['1–4'], label: cfg.shortcut ?? 'Chọn đáp án' },
            { keys: ['H'], label: 'Gợi ý (bỏ 2 đáp án sai)' },
            { keys: ['Enter'], label: 'Câu tiếp theo' },
          ]}
        />
      }
    >
      <p className="mb-4 text-sm text-muted lg:hidden">
        Câu {index + 1}/{questions.length}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2 }}
          className="@container"
        >
          <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6" data-quiz-question={q.item.id}>
            <p className="text-sm text-muted">{cfg.prompt(q.item)}</p>
            <div className="mt-4 flex w-full justify-center">{cfg.question(q.item)}</div>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {q.options.map((o, i) => {
              const out = removed.includes(o)
              const state = !answered ? (out ? 'dim' : 'idle') : o === correct ? 'right' : o === picked ? 'wrong' : 'dim'
              return (
                <li key={o}>
                  <motion.button
                    type="button"
                    disabled={answered || out}
                    data-option={o}
                    data-removed={out || undefined}
                    onClick={() => choose(o)}
                    whileTap={answered ? undefined : { scale: 0.97 }}
                    animate={state === 'right' ? { scale: 1.03, x: 0 } : state === 'wrong' ? SHAKE : { scale: 1, x: 0 }}
                    transition={state === 'wrong' ? { duration: 0.3 } : { type: 'spring', stiffness: 500, damping: 28 }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-2 text-left font-semibold transition-colors ${
                      {
                        idle: 'border-line bg-surface hover:border-ai',
                        right: 'border-matsu bg-matsu-soft text-matsu',
                        wrong: 'border-beni bg-beni-soft text-beni',
                        dim: 'border-line bg-surface opacity-50',
                      }[state]
                    }`}
                  >
                    <span className="hidden size-6 shrink-0 place-items-center rounded-md border border-current/30 text-xs opacity-70 lg:grid">{i + 1}</span>
                    <span lang={cfg.answerLang} className={`min-w-0 break-words first-letter:uppercase ${cfg.answerLang === 'ja' ? 'font-jp text-xl font-normal' : ''}`}>
                      {o}
                    </span>
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </motion.div>
      </AnimatePresence>
      <div aria-live="polite" className="mt-4 flex min-h-12 flex-wrap items-center gap-3">
        {!answered && (
          <button
            type="button"
            onClick={hint}
            disabled={hinted}
            data-quiz-hint
            className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-muted hover:border-ai hover:text-ink disabled:opacity-50"
          >
            {hinted ? 'Đã dùng gợi ý (đúng sẽ tính "Khó")' : 'Gợi ý'}
          </button>
        )}
        {answered && (
          <>
            <p className={`font-semibold ${picked === correct ? 'text-matsu' : 'text-beni'}`}>
              {picked === correct ? 'Chính xác' : `Đáp án: ${correct}`}
              {cfg.note && <span className="ml-2 font-normal text-muted">{cfg.note(q.item)}</span>}
            </p>
            <Button onClick={next} autoFocus className="ml-auto min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">
              {index + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
            </Button>
          </>
        )}
      </div>
    </StudyLayout>
  )
}

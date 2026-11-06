import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { AnimatedNumber } from '../AnimatedNumber'
import { Celebration } from '../Celebration'
import { GridCell } from '../GridCell'
import { Button } from '../Pressable'
import { SessionPanel, StudyLayout } from '../StudyLayout'
import { shuffle } from '../../lib/answer'
import { isInteractiveTarget } from '../../lib/keyboard'
import { progress } from '../../lib/progress'
import type { KanjiEntry } from '../../types'

const LENGTH = 10
const SHAKE = { x: [0, -8, 8, -8, 8, -8, 8, 0] }

interface Question {
  item: KanjiEntry
  options: string[]
}

/** Nhìn chữ, chọn âm Hán Việt; đáp án nhiễu là các âm Hán Việt khác nhau. */
function build(pool: KanjiEntry[]): Question[] {
  return shuffle(pool)
    .slice(0, LENGTH)
    .map((item) => {
      const own = new Set([item.hanViet, ...(item.hanVietAlt ?? [])])
      const options = new Set<string>()
      for (const k of shuffle(pool)) {
        if (options.size === 3) break
        if (!own.has(k.hanViet)) options.add(k.hanViet)
      }
      return { item, options: shuffle([item.hanViet, ...options]) }
    })
}

export function KanjiQuiz({ pool }: { pool: KanjiEntry[] }) {
  const [questions, setQuestions] = useState(() => build(pool))
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [right, setRight] = useState(0)

  const q = questions[index]
  const finished = index >= questions.length
  const answered = picked !== null

  const choose = (option: string) => {
    if (!q || answered) return
    const ok = option === q.item.hanViet
    setPicked(option)
    if (ok) setRight((r) => r + 1)
    progress.grade(q.item.id, ok ? 4 : 1)
  }
  const next = () => {
    setPicked(null)
    setIndex((i) => i + 1)
  }

  useEffect(() => {
    if (finished) return
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveTarget(e)) return
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= (q?.options.length ?? 0)) {
        const option = q.options[n - 1]
        const ok = option === q.item.hanViet
        setPicked(option)
        if (ok) setRight((r) => r + 1)
        progress.grade(q.item.id, ok ? 4 : 1)
      } else if (answered && e.key === 'Enter') {
        e.preventDefault()
        setPicked(null)
        setIndex((i) => i + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, answered, q])

  if (pool.length < 4) return <p className="text-muted">Cần ít nhất 4 chữ để làm quiz. Hãy chọn nhóm khác.</p>

  if (finished) {
    const perfect = right === questions.length
    return (
      <div className="max-w-[560px]">
        {perfect && <Celebration />}
        <h2 className="text-lg font-semibold text-muted">Kết quả</h2>
        <p className="mt-1 text-6xl font-bold">
          <AnimatedNumber value={right} className={perfect ? 'text-matsu' : ''} />
          <span className="text-2xl text-muted">/{questions.length}</span>
        </p>
        <p className="mt-2 text-muted">Các chữ trả lời sai đã vào lịch ôn ngày mai.</p>
        <Button
          onClick={() => {
            setQuestions(build(pool))
            setIndex(0)
            setRight(0)
          }}
          className="mt-6 min-h-12 rounded-lg bg-ai px-6 font-semibold text-on-ai hover:opacity-90"
        >
          Làm lượt mới
        </Button>
      </div>
    )
  }

  return (
    <StudyLayout
      aside={
        <SessionPanel
          title="Quiz chữ Hán"
          stats={[
            { label: 'Câu hiện tại', value: index + 1, total: questions.length },
            { label: 'Đúng', value: right, tone: 'good' },
            { label: 'Sai', value: index + (answered ? 1 : 0) - right, tone: 'bad' },
          ]}
          shortcuts={[
            { keys: ['1–4'], label: 'Chọn âm Hán Việt' },
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
          <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-muted">Âm Hán Việt của chữ này là gì?</p>
            <GridCell className="mt-4 w-[clamp(7rem,40cqw,10rem)]">{q.item.kanji}</GridCell>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {q.options.map((o, i) => {
              const state = !answered ? 'idle' : o === q.item.hanViet ? 'right' : o === picked ? 'wrong' : 'dim'
              return (
                <li key={o}>
                  <motion.button
                    type="button"
                    disabled={answered}
                    onClick={() => choose(o)}
                    whileTap={answered ? undefined : { scale: 0.97 }}
                    animate={state === 'right' ? { scale: 1.03, x: 0 } : state === 'wrong' ? SHAKE : { scale: 1, x: 0 }}
                    transition={state === 'wrong' ? { duration: 0.3 } : { type: 'spring', stiffness: 500, damping: 28 }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 font-semibold tracking-wide transition-colors ${
                      {
                        idle: 'border-line bg-surface hover:border-ai',
                        right: 'border-matsu bg-matsu-soft text-matsu',
                        wrong: 'border-beni bg-beni-soft text-beni',
                        dim: 'border-line bg-surface opacity-50',
                      }[state]
                    }`}
                  >
                    <span className="hidden size-6 shrink-0 place-items-center rounded-md border border-current/30 text-xs opacity-70 lg:grid">
                      {i + 1}
                    </span>
                    {o}
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </motion.div>
      </AnimatePresence>
      <div aria-live="polite" className="mt-4 flex min-h-12 flex-wrap items-center gap-3">
        {answered && (
          <>
            <p className={`font-semibold ${picked === q.item.hanViet ? 'text-matsu' : 'text-beni'}`}>
              {picked === q.item.hanViet ? 'Chính xác' : `Đáp án: ${q.item.hanViet}`}
              {q.item.hanVietAlt?.length ? <span className="ml-2 font-normal text-muted">(âm khác: {q.item.hanVietAlt.join(', ')})</span> : null}
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
